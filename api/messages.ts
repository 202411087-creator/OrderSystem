
import { getCollection } from "../lib/mongodb.ts";

export default async function handler(req: any, res: any) {
  const collection = await getCollection("chat_messages");

  if (req.method === 'GET') {
    const messages = await collection.find({}).sort({ timestamp: 1 }).toArray();
    return res.status(200).json(messages);
  }

  if (req.method === 'POST') {
    const { params } = req.body;
    const msg = {
      id: params[0],
      text: params[1],
      sender: params[2],
      timestamp: params[3]
    };
    await collection.insertOne(msg);
    return res.status(200).json({ success: true });
  }
}
