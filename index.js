const mineflayer = require('mineflayer');
const fs = require('fs');
const keep_alive = require('./keep_alive.js');

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
  process.exit(1); // Exit if config is not found or invalid
}

const host = data["ip"];
const username = data["name"];
const moveInterval = 2000; // 2-second movement interval
const maxRandom = 500; // 0.5 seconds added to movement interval (randomly)
const actions = ['forward', 'back', 'left', 'right'];

let connected = false; // Use boolean to track connection state

function getRandomArbitrary(min, max) {
  return Math.random() * (max - min) + min;
}

function createBot() {
  const bot = mineflayer.createBot({
    host: host,
    username: username,
  });

  bot.on('login', function () {
    console.log("Logged In");
    connected = true;
    startMoving(bot);
  });

  bot.on('spawn', function () {
    connected = true;
  });

  bot.on('death', function () {
    bot.emit("respawn");
  });

  bot.on('kicked', function (reason) {
    console.log(`Bot was kicked from the server. Reason: ${reason}`);
    connected = false;
    attemptReconnect();
  });

  bot.on('end', function () {
    console.log("Bot has been disconnected. Reconnecting...");
    connected = false;
    attemptReconnect();
  });

  bot.on('error', function (err) {
    console.log("Error occurred:", err);
    connected = false;
    attemptReconnect();
  });
}

function startMoving(bot) {
  setInterval(() => {
    if (!connected) return;

    const action = actions[Math.floor(Math.random() * actions.length)];
    bot.setControlState(action, true);
    console.log(`Bot is moving: ${action}`);

    setTimeout(() => {
      bot.setControlState(action, false);
      console.log(`Bot stopped moving: ${action}`);
    }, moveInterval + Math.random() * maxRandom);
  }, moveInterval);
}

function attemptReconnect() {
  setTimeout(createBot, 10000); // Reconnect after 10 seconds
}

function startBot() {
  console.log("Attempting to log in...");
  createBot(); // Attempt to create a bot instance
}

// Continuous login attempts
function attemptLogin() {
  startBot(); // Start attempting to log in
}

// Begin attempting to log in
attemptLogin();
