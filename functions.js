import axios from "axios";

const API = `https://api.telegram.org/bot${process.env.BOT_TOKEN}`;

/* =========================
   BASIC TELEGRAM HELPERS
========================= */

export async function sendMessage(chatId, text, options = {}) {
  return axios.post(`${API}/sendMessage`, {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    ...options
  });
}

export async function editMessage(chatId, messageId, text, options = {}) {
  return axios.post(`${API}/editMessageText`, {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "HTML",
    ...options
  });
}

export async function answerCallback(callbackId) {
  return axios.post(`${API}/answerCallbackQuery`, {
    callback_query_id: callbackId
  });
}

/* =========================
   ADMIN CHECK
========================= */

export function isAdmin(userId) {
  if (!process.env.ADMIN_IDS) return false;
  return process.env.ADMIN_IDS.split(",").includes(String(userId));
}

/* =========================
   INLINE KEYBOARDS
========================= */

export function mainMenuKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "👤 User Info", callback_data: "USER_INFO" }],
      [{ text: "❓ Help", callback_data: "HELP" }],
      [{ text: "📚 FAQs", callback_data: "FAQS" }]
    ]
  };
}

export function walletChainKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: "EVM / ETH", callback_data: "CHAIN_EVM" },
        { text: "BNB", callback_data: "CHAIN_BNB" }
      ],
      [{ text: "SOL", callback_data: "CHAIN_SOL" }],
      [{ text: "Skip / Done", callback_data: "CHAIN_SKIP" }]
    ]
  };
}

/* =========================
   WALLET VALIDATION
========================= */

export function isValidEVM(address) {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export function isValidSOL(address) {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

export function validateWallet(chain, address) {
  if (chain === "EVM" || chain === "BNB") {
    return isValidEVM(address);
  }
  if (chain === "SOL") {
    return isValidSOL(address);
  }
  return false;
}

/* =========================
   TEXT FORMATTERS
========================= */

export function formatUserInfo(user) {
  return `
<b>👤 User Information</b>

• Telegram ID: <code>${user.telegramId}</code>
• Username: ${user.username || "N/A"}
• Name: ${user.name || "N/A"}
• X Handle: ${user.xHandle || "N/A"}

• Chain: ${user.chain || "N/A"}
• Wallet: <code>${user.wallet || "N/A"}</code>

• Registered: ${new Date(user.joinedAt).toLocaleString()}
`;
}

export function formatAdminUser(user) {
  return `
<b>🧾 User Record</b>

ID: <code>${user.telegramId}</code>
Username: ${user.username || "N/A"}
Name: ${user.name || "N/A"}
X: ${user.xHandle || "N/A"}

Chain: ${user.chain || "N/A"}
Wallet: <code>${user.wallet || "N/A"}</code>

Joined: ${new Date(user.joinedAt).toLocaleString()}
`;
}
