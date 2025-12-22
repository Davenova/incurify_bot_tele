import { sendMessage, isAdmin, isValidWallet } from "./functions.js";
import {
  saveUserBase,
  updateUser,
  getUser,
  getAllUsers,
  deleteUser
} from "./db.js";

/* MAIN HANDLER */
export async function handleCommand(message) {
  const chatId = message.chat.id;
  const text = message.text;
  const from = message.from;

  /* /start */
  if (text === "/start") {
    await saveUserBase({
      telegramId: from.id,
      username: from.username || null,
      firstName: from.first_name || "",
      lastName: from.last_name || "",
      registeredAt: new Date()
    });

    return sendMessage(
      chatId,
      `👋 <b>Welcome to Growthy.io Engage-to-Earn Bot!</b>

🚀 <b>Available Commands</b>
/recordinfo — save your X handle & wallet  
/getinfo — view your saved details  
/updateinfo — update your info  
/help — how this bot works  

Tip: Pin this message for quick access.`,
      [
        [{ text: "👤 User Info", callback_data: "USER_INFO" }],
        [{ text: "ℹ️ Help", callback_data: "HELP" }],
        [{ text: "❓ FAQ", callback_data: "FAQ" }]
      ]
    );
  }

  /* USER COMMANDS */
  if (text === "/help") {
    return sendMessage(chatId,
      `/recordinfo — save X handle & wallet
/getinfo — view your data
/updateinfo — update your info`
    );
  }

  if (text === "/getinfo") {
    const user = await getUser({ telegramId: from.id });
    if (!user) return sendMessage(chatId, "No data found.");

    return sendMessage(chatId,
      `👤 <b>Your Info</b>
X: ${user.xHandle || "N/A"}
Chain: ${user.chain || "N/A"}
Wallet: ${user.wallet || "N/A"}`
    );
  }

  /* ADMIN COMMANDS */
  if (text.startsWith("/infoall")) {
    if (!isAdmin(from.id)) return;

    const users = await getAllUsers();
    let msg = "<b>All Users</b>\n\n";

    users.forEach((u, i) => {
      msg += `${i + 1}. ${u.username || "N/A"} | ${u.telegramId}
X: ${u.xHandle || "N/A"}
Wallet: ${u.wallet || "N/A"} (${u.chain || "-"})

`;
    });

    return sendMessage(chatId, msg);
  }

  if (text.startsWith("/getuser")) {
    if (!isAdmin(from.id)) return;

    const q = text.split(" ")[1];
    const user = await getUser(
      q.startsWith("@")
        ? { username: q.replace("@", "") }
        : { telegramId: Number(q) }
    );

    if (!user) return sendMessage(chatId, "User not found.");

    return sendMessage(chatId,
      `<b>User Data</b>
ID: ${user.telegramId}
Username: ${user.username}
Name: ${user.firstName} ${user.lastName}
X: ${user.xHandle || "N/A"}
Wallet: ${user.wallet || "N/A"}
Chain: ${user.chain || "N/A"}
Registered: ${user.registeredAt}`
    );
  }

  if (text.startsWith("/deleteuser")) {
    if (!isAdmin(from.id)) return;

    const q = text.split(" ")[1];
    await deleteUser(
      q.startsWith("@")
        ? { username: q.replace("@", "") }
        : { telegramId: Number(q) }
    );

    return sendMessage(chatId, "✅ User deleted.");
  }
}
