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

/* X/Twitter Profile Validation */
export function validateXProfile(url) {
  if (!url) return false;
  
  // Remove whitespace
  url = url.trim();
  
  // Check if it's a valid X/Twitter profile link
  const xPattern = /^https?:\/\/(www\.)?(twitter\.com|x\.com)\/[a-zA-Z0-9_]+\/?$/;
  return xPattern.test(url);
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
