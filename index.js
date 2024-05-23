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
const moveInterval = 2000; // 2 seconds movement interval
const maxRandom = 5000; // 0-5 seconds added to movement interval (randomly)
const actions = ['forward', 'back', 'left', 'right'];

let lastTime = -1;
let connected = false; // Use boolean to track connection state
let lastAction;

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
  });

  bot.on('spawn', function () {
    connected = true;
  });

  bot.on('kicked', function (reason) {
    console.log("Bot was kicked from the server. Reason:", reason);
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

  bot.on('chat', (username, message) => {
    // Do nothing for chat events
  });

  startMoving(bot);
}

function startMoving(bot) {
  setInterval(() => {
    if (!connected) return;

    const currentTime = new Date().getTime();
    if (lastTime < 0 || currentTime - lastTime > (moveInterval + getRandomArbitrary(0, maxRandom))) {
      lastAction = actions[Math.floor(Math.random() * actions.length)];
      bot.setControlState(lastAction, true);
      setTimeout(() => {
        bot.setControlState(lastAction, false);
      }, 500); // Move for 0.5 seconds to avoid "moved too quickly"
      lastTime = currentTime;
    }
  }, moveInterval);
}

function attemptReconnect() {
  setTimeout(createBot, 10000); // Attempt to reconnect after 10 seconds
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
