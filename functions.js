import axios from "axios";

const API = `https://api.telegram.org/bot${process.env.BOT_TOKEN}`;

export async function sendMessage(chatId, text) {
  return axios.post(`${API}/sendMessage`, {
    chat_id: chatId,
    text
  });
}

export function isAdmin(userId) {
  return process.env.ADMIN_IDS.split(",").includes(String(userId));
}

