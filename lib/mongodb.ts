
import { MongoClient } from "https://esm.sh/mongodb@6.12.0";
import { attachDatabasePool } from "https://esm.sh/@vercel/functions";

const uri = process.env.MONGODB_URI || "";

if (!uri) {
  console.error("MONGODB_URI 尚未在環境變數中設定。");
}

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

// 全域快取連線以優化效能
if (!(global as any)._mongoClientPromise) {
  client = new MongoClient(uri);
  attachDatabasePool(client);
  (global as any)._mongoClientPromise = client.connect();
}
clientPromise = (global as any)._mongoClientPromise;

export default clientPromise;

export async function getCollection(collectionName: string) {
  const client = await clientPromise;
  // 使用 URI 中指定的資料庫，若未指定則預設為 smartline
  const db = client.db(); 
  return db.collection(collectionName);
}
