import axios from "axios";

const API = `https://api.telegram.org/bot${process.env.BOT_TOKEN}`;

export async function sendMessage(chatId, text, options = {}) {
  try {
    return await axios.post(`${API}/sendMessage`, {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      ...options
    });
  } catch (error) {
    console.error("Error sending message:", error.response?.data || error.message);
    throw error;
  }
}

export async function editMessage(chatId, messageId, text, options = {}) {
  try {
    return await axios.post(`${API}/editMessageText`, {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: "HTML",
      ...options
    });
  } catch (error) {
    console.error("Error editing message:", error.response?.data || error.message);
    throw error;
  }
}

export async function answerCallbackQuery(callbackQueryId, text = "") {
  try {
    return await axios.post(`${API}/answerCallbackQuery`, {
      callback_query_id: callbackQueryId,
      text
    });
  } catch (error) {
    console.error("Error answering callback:", error.response?.data || error.message);
  }
}

export function isAdmin(userId) {
  const adminIds = process.env.ADMIN_IDS?.split(",") || [];
  return adminIds.includes(String(userId));
}

/* X/Twitter Profile Validation - Accept both formats */
export function validateXProfile(url) {
  if (!url) return false;
  
  // Remove whitespace
  url = url.trim();
  
  // Accept both x.com/username and https://x.com/username formats
  const xPatternWithProtocol = /^https?:\/\/(www\.)?(twitter\.com|x\.com)\/[a-zA-Z0-9_]+\/?$/;
  const xPatternWithoutProtocol = /^(www\.)?(twitter\.com|x\.com)\/[a-zA-Z0-9_]+\/?$/;
  
  return xPatternWithProtocol.test(url) || xPatternWithoutProtocol.test(url);
}

/* Normalize X Profile URL - Add https:// if missing */
export function normalizeXProfile(url) {
  if (!url) return url;
  
  url = url.trim();
  
  // If it doesn't start with http:// or https://, add https://
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = "https://" + url;
  }
  
  return url;
}

/* Wallet validation */
export function validateWallet(chain, address) {
  if (!address) return false;

  // Remove whitespace
  address = address.trim();

  // EVM-compatible chains (Ethereum, ERC20, BNB)
  if (["EVM", "ERC20", "BNB"].includes(chain)) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  // Solana
  if (chain === "SOL") {
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
  }

  return false;
}

/* Google Sheets Integration */
export async function addToGoogleSheet(userData) {
  try {
    // Google Sheets API endpoint
    const SHEET_URL = process.env.GOOGLE_SHEET_WEBHOOK_URL;
    
    if (!SHEET_URL) {
      console.log("Google Sheets webhook URL not configured");
      return;
    }

    const data = {
      telegramUsername: userData.username || "N/A",
      telegramId: userData.telegramId,
      xProfile: userData.xHandle || "N/A",
      discord: userData.discord || "N/A",
      chain: userData.chain || "N/A",
      walletAddress: userData.wallet || "N/A",
      registrationDate: new Date(userData.registeredAt).toLocaleString(),
      status: userData.approvalStatus || "pending"
    };

    await axios.post(SHEET_URL, data);
    console.log("Data added to Google Sheets successfully");
  } catch (error) {
    console.error("Error adding to Google Sheets:", error.message);
  }
}
