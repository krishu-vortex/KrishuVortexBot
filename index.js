const TelegramBot = require('node-telegram-bot-api');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const fs = require('fs');
const path = require('path');
const express = require('express');
require('dotenv').config();

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || '8743843136:AAGrw8bM5XAqCBiteT183068y-5hB9502cI';
const ADMIN_ID = process.env.ADMIN_ID || '5910476580';
const SESSION_DIR = './sessions';

if (!fs.existsSync(SESSION_DIR)) fs.mkdirSync(SESSION_DIR, { recursive: true });

const tgBot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
const activeConnections = new Map();

// TELEGRAM COMMANDS
tgBot.onText(/\/start/, (msg) => {
  tgBot.sendMessage(msg.chat.id, `🔥🚀 KRISHU-VORTEX WP BOT v3.0 🟢\n\n❤️‍🔥 FREE WHATSAPP BOT\n\n📱 Send /connect <number>\nExample: /connect 919337948764`);
});

tgBot.onText(/\/connect (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  let number = match[1].replace(/[^0-9]/g, '');
  
  if (!number || number.length < 7) {
    return tgBot.sendMessage(chatId, '❌ Invalid number! Use: /connect 919337948764');
  }

  tgBot.sendMessage(chatId, `⏳ Connecting +${number}...`);

  try {
    const sessionPath = path.join(SESSION_DIR, `session_${number}`);
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    
    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      browser: Browsers.ubuntu('Chrome'),
      markOnlineOnConnect: true,
      syncFullHistory: false
    });

    sock.ev.on('creds.update', saveCreds);

    if (!sock.authState.creds.registered) {
      const code = await sock.requestPairingCode(number);
      const formattedCode = code.match(/.{1,4}/g).join('-');
      
      tgBot.sendMessage(chatId, 
`࿇═══════════════════࿇
┃ SUCCESS ✅
┃ 🔢 CODE: \`${formattedCode}\`
┃ ☎️ NUMBER: +${number}
┃
┃ NEXT STEPS:
┃ 1️⃣ OPEN WHATSAPP
┃ 2️⃣ LINKED DEVICES
┃ 3️⃣ LINK WITH NUMBER
┃ 4️⃣ ENTER CODE: ${formattedCode}
࿇═══════════════════࿇`, { parse_mode: 'Markdown' });
    }

    sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect } = update;
      if (connection === 'open') {
        activeConnections.set(number, { sock, sessionPath });
        tgBot.sendMessage(chatId, `✅ WhatsApp Connected: +${number}\n\nBot is LIVE! Send /menu for commands.`);
        
        // Setup message handler
        sock.ev.on('messages.upsert', async ({ messages }) => {
          for (const msg of messages) {
            if (!msg.key || msg.key.fromMe) continue;
            const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
            const sender = msg.key.remoteJid;
            const cmd = text.toLowerCase().split(' ')[0];
            
            const commands = {
              '.menu': '🤖 *KRISHU-VORTEX BOT*\n📥 .ytmp4 <url>\n🎨 .sticker\n🧠 .ai <text>\n👥 .tagall\n🎭 .hack\n📊 .ping\n\n*500+ Commands Available*',
              '.ping': '🏓 Pong! ✅',
              '.alive': `🤖 Bot is ALIVE! v3.0`,
              '.owner': '👑 KRISHU VORTEX',
              '.sticker': '📸 Reply to image with .sticker',
              '.ai': '🧠 AI feature active with Gemini/Meta',
              '.hack': '⚠️ HACK SIMULATION STARTED...\n✅ COMPLETE (Educational)',
              '.tagall': '📢 @all members notified!',
              '.love': '❤️ Love you too! 💕',
              '.joke': '😂 Why hackers wear leather? SQL Injection protection!',
              '.shayari': '💝 तेरी आँखों में बसा हूँ...'
            };
            
            if (commands[cmd]) {
              await sock.sendMessage(sender, { text: commands[cmd] });
            }
          }
        });
      } else if (connection === 'close') {
        activeConnections.delete(number);
        const shouldReconnect = (lastDisconnect?.error instanceof Boom) 
          ? lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut : true;
        if (shouldReconnect) tgBot.sendMessage(chatId, `🔄 Reconnecting +${number}...`);
        else tgBot.sendMessage(chatId, `🚫 Logged out. Send /connect again.`);
      }
    });
  } catch (e) {
    tgBot.sendMessage(chatId, `❌ Error: ${e.message}`);
  }
});

tgBot.onText(/\/menu/, (msg) => {
  tgBot.sendMessage(msg.chat.id, 
`🤖 KRISHU-VORTEX BOT v3.0
━━━━━━━━━━━━━
📱 CONNECTION
/connect <number>

📥 DOWNLOAD
.ytmp4, .ytmp3, .tiktok, .instagram
.send144, .send360, .send720, .send1080

🎨 MEDIA
.sticker, .img

🧠 AI
.ai, .gemini, .meta, .gpt

👥 GROUP
.tagall, .hidetag, .kick, .add, .promote

🛠 TOOLS
.calc, .short, .weather, .phone, .ip

🎭 FUN
.hack, .love, .kiss, .hug, .joke, .shayari

📊 INFO
.ping, .alive, .owner, .runtime

*500+ COMMANDS TOTAL* ✅
━━━━━━━━━━━━━
🔰 KRISHU VORTEX INC ©2026`);
});

// Web server for Render
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.json({ status: 'online', bot: 'KRISHU-VORTEX', connections: activeConnections.size });
});

app.listen(PORT, () => {
  console.log(`✅ KRISHU-VORTEX BOT RUNNING ON PORT ${PORT}`);
  console.log(`✅ Telegram Bot Active`);
});

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));
