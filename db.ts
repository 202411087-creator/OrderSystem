
import initSqlJs from 'https://esm.sh/sql.js@1.12.0';

let dbInstance: any = null;
let SQL: any = null;

const DB_NAME = 'SmartLine_SQLite_DB';
const STORE_NAME = 'sqlite_file';

// 初始化 SQLite 與從 IndexedDB 讀取存檔
async function getDb() {
  if (dbInstance) return dbInstance;

  if (!SQL) {
    SQL = await initSqlJs({
      locateFile: file => `https://esm.sh/sql.js@1.12.0/dist/${file}`
    });
  }

  // 從 IndexedDB 讀取二進位數據
  const savedData = await loadFromIndexedDB();
  
  if (savedData) {
    dbInstance = new SQL.Database(new Uint8Array(savedData));
  } else {
    dbInstance = new SQL.Database();
    // 初始化資料表
    dbInstance.run(`
      CREATE TABLE IF NOT EXISTS users (
        username TEXT PRIMARY KEY,
        role TEXT,
        address TEXT,
        password TEXT
      );
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        userName TEXT,
        address TEXT,
        region TEXT,
        items TEXT,
        totalAmount REAL,
        rawText TEXT,
        timestamp INTEGER,
        status TEXT,
        isFlagged INTEGER
      );
      CREATE TABLE IF NOT EXISTS prices (
        id TEXT PRIMARY KEY,
        itemName TEXT,
        region TEXT,
        price REAL,
        updatedAt INTEGER,
        isAvailable INTEGER
      );
      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        text TEXT,
        sender TEXT,
        timestamp INTEGER
      );
    `);
    await saveToIndexedDB(dbInstance.export());
  }

  return dbInstance;
}

// 將 SQLite 檔案存入 IndexedDB
async function saveToIndexedDB(data: Uint8Array) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SQLiteStorage', 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(data, DB_NAME);
      tx.oncomplete = () => resolve(true);
    };
    request.onerror = () => reject(request.error);
  });
}

// 從 IndexedDB 讀取存檔
async function loadFromIndexedDB(): Promise<ArrayBuffer | null> {
  return new Promise((resolve) => {
    const request = indexedDB.open('SQLiteStorage', 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(STORE_NAME, 'readonly');
      const getReq = tx.objectStore(STORE_NAME).get(DB_NAME);
      getReq.onsuccess = () => resolve(getReq.result || null);
    };
    request.onerror = () => resolve(null);
  });
}

// 導出操作接口
export const sqlite = {
  async query(sql: string, params: any[] = []) {
    const db = await getDb();
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  },
  async run(sql: string, params: any[] = []) {
    const db = await getDb();
    db.run(sql, params);
    await saveToIndexedDB(db.export());
  }
};
