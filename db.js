import { MongoClient } from "mongodb";

const client = new MongoClient(process.env.MONGO_URI);
let db;

async function connect() {
  if (!db) {
    await client.connect();
    db = client.db("telegramBot");
  }
  return db;
}

export async function saveUserBase(user) {
  const database = await connect();
  await database.collection("users").updateOne(
    { telegramId: user.telegramId },
    { $setOnInsert: user },
    { upsert: true }
  );
}

export async function updateUser(query, data) {
  const database = await connect();
  return database.collection("users").updateOne(query, { $set: data });
}

export async function getUser(query) {
  const database = await connect();
  return database.collection("users").findOne(query);
}

export async function getAllUsers() {
  const database = await connect();
  return database.collection("users").find().toArray();
}

export async function deleteUser(query) {
  const database = await connect();
  return database.collection("users").deleteOne(query);
}
