
import { getCollection } from "../lib/mongodb.ts";

export default async function handler(req: any, res: any) {
  try {
    const collection = await getCollection("orders");

    if (req.method === 'GET') {
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
          items: typeof params[4] === 'string' ? JSON.parse(params[4]) : params[4],
          totalAmount: params[5],
          rawText: params[6],
          timestamp: params[7],
          status: params[8],
          isFlagged: params[9] === 1 || params[9] === true
        };
        await collection.insertOne(order);
      } 
      else if (sql.includes("UPDATE")) {
        const id = params[1];
        if (sql.includes("isFlagged")) {
          await collection.updateOne({ id }, { $set: { isFlagged: params[0] === 1 || params[0] === true } });
        } else {
          await collection.updateOne({ id }, { $set: { status: params[0] } });
        }
      } 
      else if (sql.includes("DELETE")) {
        await collection.deleteOne({ id: params[0] });
      }

      return res.status(200).json({ success: true, message: "雲端寫入成功" });
    }
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
