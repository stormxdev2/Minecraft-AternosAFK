const mineflayer = require('mineflayer');
const fs = require('fs');
const keep_alive = require('./keep_alive.js'); // Ensure this file exists and is properly configured

// Function to read and parse config.json safely
function readConfig() {
  try {
    let rawdata = fs.readFileSync('config.json');
    return JSON.parse(rawdata);
  } catch (error) {
    console.error('Error reading config.json:', error);
    return null;
  }
}

const data = readConfig();
if (!data) {
  console.error('No valid config found, exiting.');
  process.exit(1); // Exit if config is not found or invalid
}

const host = data["ip"];
const port = data["port"];
const names = data["names"];
const moveInterval = 20 * 1000; // Move every 20 seconds to prevent AFK
const actions = ['forward', 'back', 'left', 'right'];
const naturalMoveDuration = () => 1000 + Math.random() * 2000; // Move for 1-3 seconds
const disconnectInterval = 1 * 60 * 60 * 1000; // 1 hour in milliseconds
const chatInterval = 10 * 60 * 1000; // 10 minutes in milliseconds
const randomMessages = [
  "Hello!", "How's everyone?", "What a nice day!", "Anyone up for a game?",
  "Just chilling here!", "What's new?", "Happy mining!", "How's the weather in Minecraft?",
  "Anyone need help?", "Let's build something cool!", "Exploring is fun!", "Mining time!",
  "Watch out for creepers!", "Does anyone have diamonds?", "What's your favorite block?"
];

let bot; // Declare bot variable to keep track of the bot instance
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
const reconnectInterval = 10 * 1000; // 10 seconds

function getRandomAction() {
  return actions[Math.floor(Math.random() * actions.length)];
}

function getRandomMessage() {
  return randomMessages[Math.floor(Math.random() * randomMessages.length)];
}

function getRandomName() {
  return names[Math.floor(Math.random() * names.length)];
}

function createBot() {
  const username = getRandomName();

  bot = mineflayer.createBot({
    host: host,
    port: port,
    username: username,
  });

  bot.on('login', () => {
    console.log("Logged in as", username);
    reconnectAttempts = 0;
    startMoving();
    scheduleDisconnect(); // Schedule the disconnect after 1 hour
    scheduleChatMessages(); // Schedule random chat messages every 10 minutes
  });

  bot.on('spawn', () => {
    console.log("Spawned");
  });

  bot.on('death', () => {
    bot.emit("respawn");
  });

  bot.on('kicked', (reason) => {
    console.log("Kicked from the server:", reason);
    attemptReconnect(reason);
  });

  bot.on('end', () => {
    console.log("Disconnected");
    attemptReconnect();
  });

  bot.on('error', (err) => {
    console.error("Error occurred:", err);
    attemptReconnect(err);
  });

  function startMoving() {
    setInterval(() => {
      if (!bot || !bot.setControlState) {
        console.error('Bot is not initialized or setControlState is not a function');
        return;
      }
      const action = getRandomAction();
      bot.setControlState(action, true);
      console.log(`Moving: ${action}`);
      setTimeout(() => {
        if (bot && bot.setControlState) {
          bot.setControlState(action, false);
          console.log(`Stopped moving: ${action}`);
        }
      }, naturalMoveDuration()); // Move for a natural duration
    }, moveInterval); // Move every 20 seconds
  }

  function scheduleChatMessages() {
    setInterval(() => {
      const message = getRandomMessage();
      bot.chat(message);
      console.log(`Sent message: ${message}`);
    }, chatInterval);
  }
}

function attemptReconnect(reason) {
  if (reason && reason.includes('throttled')) {
    console.log('Throttled by server, waiting before next reconnect...');
    reconnectAttempts++;
    setTimeout(() => {
      if (reconnectAttempts < maxReconnectAttempts) {
        console.log(`Reconnection attempt ${reconnectAttempts}/${maxReconnectAttempts}...`);
        createBot();
      } else {
        console.error("Max reconnect attempts reached. Exiting...");
        process.exit(1);
      }
    }, reconnectInterval * 3); // Wait longer if throttled
  } else {
    if (reconnectAttempts < maxReconnectAttempts) {
      reconnectAttempts++;
      setTimeout(() => {
        console.log(`Reconnection attempt ${reconnectAttempts}/${maxReconnectAttempts}...`);
        createBot();
      }, reconnectInterval);
    } else {
      console.error("Max reconnect attempts reached. Exiting...");
      process.exit(1);
    }
  }
}

function scheduleDisconnect() {
  setTimeout(() => {
    console.log("Disconnecting for scheduled restart...");
    bot.quit();
    setTimeout(() => {
      console.log("Reconnecting after scheduled restart...");
      reconnectAttempts = 0; // Reset reconnect attempts after scheduled disconnect
      createBot();
    }, 60 * 1000); // Wait for 1 minute before reconnecting
  }, disconnectInterval);
}

function startBot() {
  console.log("Starting bot...");
  createBot();
}

startBot();
