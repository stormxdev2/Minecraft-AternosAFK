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
const port = data["port"] || 25565; // Default Minecraft port is 25565
const username = data["name"];
const moveInterval = 20 * 1000; // Move every 20 seconds to prevent AFK
const actions = ['forward', 'back', 'left', 'right'];
const naturalMoveDuration = () => 1000 + Math.random() * 2000; // Move for 1-3 seconds
const disconnectInterval = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
const chatInterval = 20 * 60 * 1000; // 20 minutes in milliseconds
const randomMessages = ["Hello!", "How's everyone?", "What a nice day!", "Anyone up for a game?", "Just chilling here!", "What's new?", "Happy mining!"];

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

function createBot() {
  bot = mineflayer.createBot({
    host: host,
    port: port, // Ensure the port is used if specified
    username: username,
  });

  bot.on('login', () => {
    console.log("Logged in");
    reconnectAttempts = 0;
    startMoving();
    scheduleDisconnect(); // Schedule the disconnect after 2 hours
    scheduleChatMessages(); // Schedule random chat messages every 20 minutes
  });

  bot.on('spawn', () => {
    console.log("Spawned");
  });

  bot.on('death', () => {
    bot.emit("respawn");
  });

  bot.on('kicked', (reason) => {
    console.log("Kicked from the server:", reason);
    attemptReconnect();
  });

  bot.on('end', () => {
    console.log("Disconnected");
    attemptReconnect();
  });

  bot.on('error', (err) => {
    console.error("Error occurred:", err);
    attemptReconnect();
  });

  function startMoving() {
    setInterval(() => {
      const action = getRandomAction();
      bot.setControlState(action, true);
      console.log(`Moving: ${action}`);
      setTimeout(() => {
        bot.setControlState(action, false);
        console.log(`Stopped moving: ${action}`);
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

function attemptReconnect() {
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

function scheduleDisconnect() {
  setTimeout(() => {
    console.log("Disconnecting for scheduled restart...");
    bot.quit();
    setTimeout(() => {
      console.log("Reconnecting after scheduled restart...");
      reconnectAttempts = 0; // Reset reconnect attempts after scheduled disconnect
      createBot();
    }, 60 * 1000 + Math.random() * 30 * 1000); // Wait for 1 to 1.5 minutes before reconnecting
  }, disconnectInterval);
}

function startBot() {
  console.log("Starting bot...");
  createBot();
}

startBot();
