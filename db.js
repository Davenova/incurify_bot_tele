import { MongoClient } from "mongodb";

const client = new MongoClient(process.env.MONGO_URI);
let db;

export async function connectDB() {
  if (!db) {
    await client.connect();
    db = client.db("telegramBot");
  }
  return db;
}

export async function saveUser(userData) {
  const database = await connectDB();
  const users = database.collection("users");

  await users.updateOne(
    { telegramId: userData.telegramId },
    { $setOnInsert: userData },
    { upsert: true }
  );
}

export async function toggleFeature(name) {
  const database = await connectDB();
  const features = database.collection("features");

  const feature = await features.findOne({ name });

  if (!feature) {
    await features.insertOne({ name, enabled: false });
    return false;
  }

  const newState = !feature.enabled;
  await features.updateOne({ name }, { $set: { enabled: newState } });

  return newState;
}

