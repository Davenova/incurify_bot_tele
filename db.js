import { MongoClient } from "mongodb";

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

let db;

async function getDB() {
  if (!db) {
    await client.connect();
    db = client.db("telegramBot");
  }
  return db;
}

/* ================= USERS ================= */

export async function upsertUser(telegramId, data) {
  const database = await getDB();
  return database.collection("users").updateOne(
    { telegramId },
    { $set: data },
    { upsert: true }
  );
}

export async function getUserByTelegramId(telegramId) {
  const database = await getDB();
  return database.collection("users").findOne({ telegramId });
}

export async function getUserByUsername(username) {
  const database = await getDB();
  return database.collection("users").findOne({
    telegramUsername: username.replace("@", "")
  });
}

export async function deleteUserByTelegramId(telegramId) {
  const database = await getDB();
  return database.collection("users").deleteOne({ telegramId });
}

export async function getAllUsers(page = 1, limit = 10) {
  const database = await getDB();
  const skip = (page - 1) * limit;

  const users = await database
    .collection("users")
    .find({})
    .skip(skip)
    .limit(limit)
    .toArray();

  const total = await database.collection("users").countDocuments();
  return { users, total };
}

/* ================= STATES ================= */

export async function setState(telegramId, state) {
  const database = await getDB();
  return database.collection("states").updateOne(
    { telegramId },
    { $set: { telegramId, ...state } },
    { upsert: true }
  );
}

export async function getState(telegramId) {
  const database = await getDB();
  return database.collection("states").findOne({ telegramId });
}

export async function clearState(telegramId) {
  const database = await getDB();
  return database.collection("states").deleteOne({ telegramId });
}
