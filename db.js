import { MongoClient } from "mongodb";

const client = new MongoClient(process.env.MONGO_URI);
let db;

async function getDB() {
  if (!db) {
    await client.connect();
    db = client.db("telegramBot");
  }
  return db;
}

export async function saveBasicUser(user) {
  const database = await getDB();
  const users = database.collection("users");

  await users.updateOne(
    { telegramId: user.telegramId },
    { $setOnInsert: user },
    { upsert: true }
  );
}

export async function findUserByIdOrUsername(query) {
  const database = await getDB();
  const users = database.collection("users");

  return users.findOne({
    $or: [
      { telegramId: Number(query) || -1 },
      { username: query.replace("@", "") }
    ]
  });
}

export async function getAllUsers() {
  const database = await getDB();
  return database.collection("users").find({}).toArray();
}

export async function deleteUser(query) {
  const database = await getDB();
  return database.collection("users").deleteOne({
    $or: [
      { telegramId: Number(query) || -1 },
      { username: query.replace("@", "") }
    ]
  });
}
