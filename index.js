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
const username = data["name"];
const moveInterval = 20 * 1000; // Move every 20 seconds to prevent AFK
const actions = ['forward', 'back', 'left', 'right'];
const naturalMoveDuration = () => 1000 + Math.random() * 2000; // Move for 1-3 seconds

let lastActionTime = -1;
let reconnectAttempts = 0;
const reconnectInterval = 10 * 1000; // 10 seconds
const disconnectInterval = 30 * 1000; // 30 seconds

let bot; // Declare bot variable to keep track of the bot instance
let scheduledDisconnect = false; // Flag to indicate a scheduled disconnect

function getRandomAction() {
  return actions[Math.floor(Math.random() * actions.length)];
}

function createBot() {
  bot = mineflayer.createBot({
    host: host,
    username: username,
  });

  bot.on('login', () => {
    console.log("Logged in");
    reconnectAttempts = 0;
    startMoving(bot);
    scheduleDisconnect(); // Schedule the disconnect after 30 seconds
  });

  bot.on('spawn', () => {
    console.log("Spawned");
  });

  bot.on('death', () => {
    bot.emit("respawn");
  });

  bot.on('kicked', (reason) => {
    console.log("Kicked from the server:", reason);
    if (!scheduledDisconnect) {
      reconnect();
    }
  });

  bot.on('end', () => {
    console.log("Disconnected");
    if (!scheduledDisconnect) {
      console.log("Unexpected disconnection, attempting to reconnect...");
      reconnect();
    }
  });

  bot.on('error', (err) => {
    console.error("Error occurred:", err);
    if (!scheduledDisconnect) {
      reconnect();
    }
  });

  function startMoving(bot) {
    setInterval(() => {
      const currentTime = Date.now();
      if (lastActionTime < 0 || currentTime - lastActionTime > moveInterval) {
        const action = getRandomAction();
        bot.setControlState(action, true);
        console.log(`Moving: ${action}`);
        setTimeout(() => {
          bot.setControlState(action, false);
          console.log(`Stopped moving: ${action}`);
        }, naturalMoveDuration()); // Move for a natural duration
        lastActionTime = currentTime;
      }
    }, 1000); // Check every second
  }
}

function reconnect() {
  console.log(`Reconnection attempt ${reconnectAttempts + 1}...`);
  setTimeout(() => {
    reconnectAttempts++;
    createBot();
  }, reconnectInterval);
}

function scheduleDisconnect() {
  setTimeout(() => {
    console.log("Disconnecting for scheduled restart...");
    scheduledDisconnect = true; // Indicate that this is a scheduled disconnect
    bot.quit();
    const reconnectTime = 60 * 1000 + Math.random() * 30 * 1000; // 1 to 1.5 minutes
    setTimeout(() => {
      console.log("Reconnecting after scheduled restart...");
      scheduledDisconnect = false; // Reset the flag before reconnecting
      createBot();
    }, reconnectTime);
  }, disconnectInterval);
}

function startBot() {
  console.log("Starting bot...");
  createBot();
}

startBot();
