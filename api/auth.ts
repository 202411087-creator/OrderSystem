
import { getCollection } from "../lib/mongodb.ts";

export default async function handler(req: any, res: any) {
  const collection = await getCollection("users");

  if (req.method === 'GET') {
    const { params } = req.query;
    const parsedParams = JSON.parse(params || "[]");
    const username = parsedParams[0];
    const users = await collection.find({ username }).toArray();
    return res.status(200).json(users);
  }

  if (req.method === 'POST') {
    const { params } = req.body;
    const user = {
      username: params[0],
      role: params[1],
      address: params[2],
      password: params[3]
    };
    await collection.updateOne({ username: user.username }, { $set: user }, { upsert: true });
    return res.status(200).json({ success: true });
  }
}
