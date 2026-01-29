
import { getCollection } from "../lib/mongodb.ts";

export default async function handler(req: any, res: any) {
  const collection = await getCollection("prices");

  if (req.method === 'GET') {
    const prices = await collection.find({}).toArray();
    return res.status(200).json(prices);
  }

  if (req.method === 'POST') {
    const { sql, params } = req.body;
    if (sql.includes("INSERT")) {
      const priceRecord = {
        id: params[0],
        itemName: params[1],
        region: params[2],
        price: params[3],
        updatedAt: params[4],
        isAvailable: params[5]
      };
      await collection.insertOne(priceRecord);
    } else if (sql.includes("UPDATE")) {
      const id = params[2] || params[1];
      if (sql.includes("isAvailable")) {
        await collection.updateOne({ id }, { $set: { isAvailable: params[0] } });
      } else {
        await collection.updateOne({ id }, { $set: { price: params[0], updatedAt: params[1] } });
      }
    } else if (sql.includes("DELETE")) {
      await collection.deleteOne({ id: params[0] });
    }
    return res.status(200).json({ success: true });
  }
}
