const mineflayer = require('mineflayer');
const fs = require('fs');
const path = require('path');
const keep_alive = require('./keep_alive.js'); // Ensure this file exists and is properly configured

// Function to read and parse config.json safely
function readConfig() {
  const configPath = path.resolve(__dirname, 'config.json');
  try {
    const rawdata = fs.readFileSync(configPath);
    const config = JSON.parse(rawdata);
    if (!config.ip || !config.port || !Array.isArray(config.names) || config.names.length === 0) {
      throw new Error('Invalid config format.');
    }
    return config;
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
const port = parseInt(data["port"], 10);
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
let scheduledRestart = false; // Flag to indicate if disconnect is scheduled

function getRandomAction() {
  return actions[Math.floor(Math.random() * actions.length)];
}

function getRandomMessage() {
  return randomMessages[Math.floor(Math.random() * randomMessages.length)];
}

function getRandomName() {
  return names[Math.floor(Math.random() * names.length)];
}

function startBot() {
  const username = getRandomName();
  bot = mineflayer.createBot({
    host: host,
    port: port,
    username: username,
  });

  setupEventListeners();
}

function setupEventListeners() {
  bot.on('login', onLogin);
  bot.on('spawn', onSpawn);
  bot.on('death', onDeath);
  bot.on('kicked', onKicked);
  bot.on('end', onEnd);
  bot.on('error', onError);
}

function onLogin() {
  console.log(`Logged in as ${bot.username}`);
  reconnectAttempts = 0;
  startMoving();
  scheduleDisconnect(); // Schedule the disconnect after 1 hour
  scheduleChatMessages(); // Schedule random chat messages every 10 minutes
}

function onSpawn() {
  console.log("Spawned");
}

function onDeath() {
  bot.emit("respawn");
}

function onKicked(reason) {
  console.log(`Kicked from the server: ${JSON.stringify(reason)}`);
  if (!scheduledRestart) {
    attemptReconnect(reason);
  }
}

function onEnd() {
  console.log("Disconnected");
  cleanupIntervals();
  if (!scheduledRestart) {
    attemptReconnect();
  }
}

function onError(err) {
  console.error(`Error occurred: ${err}`);
  if (!scheduledRestart) {
    attemptReconnect(err);
  }
}

function startMoving() {
  setInterval(() => {
    if (!bot || typeof bot.setControlState !== 'function') {
      console.error('Bot is not initialized or setControlState is not a function');
      return;
    }
    const action = getRandomAction();
    bot.setControlState(action, true);
    setTimeout(() => {
      if (bot && typeof bot.setControlState === 'function') {
        bot.setControlState(action, false);
      }
    }, naturalMoveDuration()); // Move for a natural duration
  }, moveInterval); // Move every 20 seconds
}

function scheduleChatMessages() {
  setInterval(() => {
    const message = getRandomMessage();
    if (bot && typeof bot.chat === 'function') {
      bot.chat(message);
      console.log(`Sent message: ${message}`);
    }
  }, chatInterval);
}

function attemptReconnect(reason) {
  let reasonString = '';

  if (typeof reason === 'string') {
    reasonString = reason;
  } else if (reason && reason.value && reason.value.translate) {
    reasonString = reason.value.translate;
  }

  if (reasonString.includes('throttled')) {
    console.log('Throttled by server, waiting before next reconnect...');
    reconnectAttempts++;
    setTimeout(() => {
      if (reconnectAttempts < maxReconnectAttempts) {
        console.log(`Reconnection attempt ${reconnectAttempts}/${maxReconnectAttempts}...`);
        startBot();
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
        startBot();
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
    scheduledRestart = true; // Set flag for scheduled restart
    if (bot) bot.quit();
    setTimeout(() => {
      console.log("Reconnecting after scheduled restart...");
      reconnectAttempts = 0; // Reset reconnect attempts after scheduled disconnect
      scheduledRestart = false; // Reset flag after reconnecting
      startBot();
    }, 40 * 1000); // Wait for 40 seconds before reconnecting
  }, disconnectInterval);
}

function cleanupIntervals() {
  clearInterval(moveIntervalId);
  clearInterval(chatIntervalId);
  clearTimeout(disconnectTimeoutId);
}

startBot();
