
import initSqlJs from 'https://esm.sh/sql.js@1.12.0';

let dbInstance: any = null;
let SQL: any = null;

const DB_NAME = 'SmartLine_SQLite_DB';
const STORE_NAME = 'sqlite_file';

// 初始化 SQLite 與從 IndexedDB 讀取存檔
async function getDb() {
  if (dbInstance) return dbInstance;

  if (!SQL) {
    try {
      // 核心修復：手動獲取 WASM 二進位文件以避免在某些環境下觸發 Node.js 'fs' 錯誤
      // 這能解決 [unenv] fs.readFileSync is not implemented yet! 的報錯
      const wasmUrl = 'https://esm.sh/sql.js@1.12.0/dist/sql-wasm.wasm';
      const response = await fetch(wasmUrl);
      if (!response.ok) throw new Error('無法載入 SQLITE WASM 檔案');
      const wasmBinary = await response.arrayBuffer();

      SQL = await initSqlJs({
        wasmBinary: new Uint8Array(wasmBinary)
      });
    } catch (err) {
      console.error('SQLite 初始化失敗:', err);
      throw err;
    }
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

// 將 SQLite 檔案存入 IndexedDB (持久化)
async function saveToIndexedDB(data: Uint8Array) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SQLiteStorage', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(data, DB_NAME);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    };
    request.onerror = () => reject(request.error);
  });
}

// 從 IndexedDB 讀取存檔 (持久化)
async function loadFromIndexedDB(): Promise<ArrayBuffer | null> {
  return new Promise((resolve) => {
    const request = indexedDB.open('SQLiteStorage', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        resolve(null);
        return;
      }
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(DB_NAME);
      getReq.onsuccess = () => resolve(getReq.result || null);
      getReq.onerror = () => resolve(null);
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
    // 每次執行寫入操作後，立即匯出並儲存到 IndexedDB
    await saveToIndexedDB(db.export());
  }
};
