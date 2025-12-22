import { MongoClient, ObjectId } from "mongodb";

const client = new MongoClient(process.env.MONGO_URI);
let db;

async function getDB() {
  if (!db) {
    await client.connect();
    db = client.db("telegramBot");
  }
  return db;
}

/* USERS */
export async function upsertUser(base) {
  const d = await getDB();
  await d.collection("users").updateOne(
    { telegramId: base.telegramId },
    { $setOnInsert: base },
    { upsert: true }
  );
}

export async function updateUserById(telegramId, data) {
  const d = await getDB();
  await d.collection("users").updateOne(
    { telegramId },
    { $set: data }
  );
}

export async function getUserByAny(id) {
  const d = await getDB();
  return d.collection("users").findOne({
    $or: [
      { telegramId: Number(id) },
      { username: id.replace("@", "") },
      { xHandle: id.replace("@", "") }
    ]
  });
}

export async function deleteUserByAny(id) {
  const d = await getDB();
  return d.collection("users").deleteOne({
    $or: [
      { telegramId: Number(id) },
      { username: id.replace("@", "") }
    ]
  });
}

export async function getAllUsers(page = 1, limit = 5) {
  const d = await getDB();
  const skip = (page - 1) * limit;
  const users = await d.collection("users")
    .find({})
    .skip(skip)
    .limit(limit)
    .toArray();

  const total = await d.collection("users").countDocuments();
  return { users, total };
}

/* STATE (for step flows) */
export async function setState(telegramId, state) {
  const d = await getDB();
  await d.collection("states").updateOne(
    { telegramId },
    { $set: state },
    { upsert: true }
  );
}

export async function getState(telegramId) {
  const d = await getDB();
  return d.collection("states").findOne({ telegramId });
}

export async function clearState(telegramId) {
  const d = await getDB();
  await d.collection("states").deleteOne({ telegramId });
}
