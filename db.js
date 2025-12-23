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

export async function saveUserBasic(user) {
  const database = await connectDB();
  await database.collection("users").updateOne(
    { telegramId: user.telegramId },
    { $setOnInsert: user },
    { upsert: true }
  );
}

export async function updateUser(telegramId, data) {
  const database = await connectDB();
  await database.collection("users").updateOne(
    { telegramId },
    { $set: { ...data, updatedAt: new Date() } }
  );
}

export async function getUser(query) {
  const database = await connectDB();
  
  // Try to parse as number for telegramId lookup
  const numQuery = Number(query);
  
  return database.collection("users").findOne({
    $or: [
      { telegramId: isNaN(numQuery) ? null : numQuery },
      { username: query },
      { xHandle: query }
    ]
  });
}

export async function getAllUsers() {
  const database = await connectDB();
  return database.collection("users")
    .find({})
    .sort({ registeredAt: -1 })
    .toArray();
}

export async function deleteUser(query) {
  const database = await connectDB();
  
  // Try to parse as number
  const numQuery = Number(query);
  
  return database.collection("users").deleteOne({
    $or: [
      { telegramId: isNaN(numQuery) ? null : numQuery },
      { username: query }
    ]
  });
}

/* USER STATE */
export async function setState(telegramId, state) {
  const database = await connectDB();
  await database.collection("states").updateOne(
    { telegramId },
    { $set: { ...state, telegramId } },
    { upsert: true }
  );
}

export async function getState(telegramId) {
  const database = await connectDB();
  return database.collection("states").findOne({ telegramId });
}

export async function clearState(telegramId) {
  const database = await connectDB();
  await database.collection("states").deleteOne({ telegramId });
}
