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

/* USER MANAGEMENT */
export async function saveUserBasic(user) {
  const database = await connectDB();
  await database.collection("users").updateOne(
    { telegramId: user.telegramId },
    { $setOnInsert: { ...user, approvalStatus: "none" } },
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

export async function getPendingUsers() {
  const database = await connectDB();
  return database.collection("users")
    .find({ approvalStatus: "pending" })
    .sort({ submittedAt: -1 })
    .toArray();
}

export async function deleteUser(query) {
  const database = await connectDB();
  
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

/* SETTINGS */
export async function getSettings() {
  const database = await connectDB();
  return database.collection("settings").findOne({ _id: "main" });
}

export async function updateSettings(data) {
  const database = await connectDB();
  await database.collection("settings").updateOne(
    { _id: "main" },
    { $set: { ...data, updatedAt: new Date() } },
    { upsert: true }
  );
}

/* TICKET SYSTEM */
export async function createTicket(ticket) {
  const database = await connectDB();
  await database.collection("tickets").insertOne(ticket);
}

export async function getTicket(ticketId) {
  const database = await connectDB();
  return database.collection("tickets").findOne({ ticketId: Number(ticketId) });
}

export async function getAllTickets() {
  const database = await connectDB();
  return database.collection("tickets")
    .find({})
    .sort({ createdAt: -1 })
    .toArray();
}

export async function getOpenTickets() {
  const database = await connectDB();
  return database.collection("tickets")
    .find({ status: { $ne: "closed" } })
    .sort({ createdAt: -1 })
    .toArray();
}

export async function getTicketsByUser(userId) {
  const database = await connectDB();
  return database.collection("tickets")
    .find({ userId })
    .sort({ createdAt: -1 })
    .toArray();
}

export async function updateTicket(ticketId, data) {
  const database = await connectDB();
  await database.collection("tickets").updateOne(
    { ticketId: Number(ticketId) },
    { $set: { ...data, updatedAt: new Date() } }
  );
}

export async function deleteTicket(ticketId) {
  const database = await connectDB();
  await database.collection("tickets").deleteOne({ ticketId: Number(ticketId) });
}
