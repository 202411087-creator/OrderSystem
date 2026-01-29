
import { getCollection } from "../lib/mongodb.ts";

export default async function handler(req: any, res: any) {
  const collection = await getCollection("orders");

  if (req.method === 'GET') {
    const { sql, params } = req.query;
    // 簡單模擬 SQL 轉 Mongo 查詢
    const orders = await collection.find({}).sort({ timestamp: -1 }).toArray();
    return res.status(200).json(orders);
  }

  if (req.method === 'POST') {
    const { sql, params } = req.body;
    if (sql.includes("INSERT")) {
      const order = {
        id: params[0],
        userName: params[1],
        address: params[2],
        region: params[3],
        items: params[4], // JSON string from frontend
        totalAmount: params[5],
        rawText: params[6],
        timestamp: params[7],
        status: params[8],
        isFlagged: params[9]
      };
      await collection.insertOne(order);
    } else if (sql.includes("UPDATE")) {
      // 處理狀態更新與標記
      const status = params[0];
      const id = params[1];
      if (sql.includes("isFlagged")) {
        await collection.updateOne({ id }, { $set: { isFlagged: params[0] } });
      } else {
        await collection.updateOne({ id }, { $set: { status } });
      }
    } else if (sql.includes("DELETE")) {
      const id = params[0];
      await collection.deleteOne({ id });
    }
    return res.status(200).json({ success: true });
  }
}
