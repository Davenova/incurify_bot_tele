export async function updateUser(telegramId, data) {
  const db = await connectDB();
  return db.collection("users").updateOne(
    { telegramId },
    { $set: data }
  );
}

export async function getUserByAny(identifier) {
  const db = await connectDB();

  if (String(identifier).startsWith("@")) {
    return db.collection("users").findOne({ username: identifier.slice(1) });
  }

  return db.collection("users").findOne({
    $or: [
      { telegramId: Number(identifier) },
      { username: identifier }
    ]
  });
}

export async function deleteUser(identifier) {
  const db = await connectDB();
  const user = await getUserByAny(identifier);
  if (!user) return null;

  await db.collection("users").deleteOne({ telegramId: user.telegramId });
  return user;
}

export async function getAllUsers() {
  const db = await connectDB();
  return db.collection("users").find().toArray();
}
