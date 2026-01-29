
import { MongoClient } from "https://esm.sh/mongodb";
import { attachDatabasePool } from "https://esm.sh/@vercel/functions";

const uri = process.env.MONGODB_URI || "";
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (!process.env.MONGODB_URI) {
  throw new Error("Please add your Mongo URI to .env.local");
}

client = new MongoClient(uri, options);
// 依照 Vercel 提供的截圖建議，優化連線池管理
attachDatabasePool(client);
clientPromise = client.connect();

export default clientPromise;

export async function getCollection(collectionName: string) {
  const client = await clientPromise;
  const db = client.db("smartline");
  return db.collection(collectionName);
}
