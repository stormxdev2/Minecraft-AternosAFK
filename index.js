const mineflayer = require('mineflayer');
const fs = require('fs');
const keep_alive = require('./keep_alive.js'); // Ensure this file exists and properly configured

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

let lastActionTime = -1;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
const reconnectInterval = 10 * 1000; // 10 seconds

function getRandomAction() {
  return actions[Math.floor(Math.random() * actions.length)];
}

function createBot() {
  const bot = mineflayer.createBot({
    host: host,
    username: username,
  });

  bot.on('login', () => {
    console.log("Logged in");
    reconnectAttempts = 0;
    startMoving(bot);
  });

  bot.on('spawn', () => {
    console.log("Spawned");
  });

  bot.on('death', () => {
    bot.emit("respawn");
  });

  bot.on('kicked', (reason) => {
    console.log("Kicked from the server:", reason);
    reconnect(bot);
  });

  bot.on('end', () => {
    console.log("Disconnected, attempting to reconnect...");
    reconnect(bot);
  });

  bot.on('error', (err) => {
    console.error("Error occurred:", err);
    reconnect(bot);
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
        }, 500); // Move for 0.5 seconds
        lastActionTime = currentTime;
      }
    }, 1000); // Check every second
  }
}

function reconnect(bot) {
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

function startBot() {
  console.log("Starting bot...");
  createBot();
}

startBot();
