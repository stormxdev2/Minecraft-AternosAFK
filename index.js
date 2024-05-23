const mineflayer = require('mineflayer');
const cmd = require('mineflayer-cmd').plugin;
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
const moveinterval = 2; // 2 second movement interval
const maxrandom = 5; // 0-5 seconds added to movement interval (randomly)
const actions = ['forward', 'back', 'left', 'right'];

let lasttime = -1;
let connected = false; // Use boolean to track connection state
let lastaction;
let isSpectator = false;
let attemptSpectatorOnce = true;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5; // Maximum reconnect attempts before longer wait
const reconnectInterval = 10000; // 10 seconds

function getRandomArbitrary(min, max) {
  return Math.random() * (max - min) + min;
}

function attemptSpectatorMode(bot) {
  if (attemptSpectatorOnce) {
    setTimeout(() => {
      bot.chat("/gamemode spectator");
      console.log("Switched to spectator mode. Starting to move...");
      isSpectator = true;
      attemptSpectatorOnce = false; // Ensure this runs only once
      startMoving(bot);
    }, 30000); // Wait 30 seconds before trying to switch to spectator mode
  }
}

function createBot() {
  const bot = mineflayer.createBot({
    host: host,
    username: username,
  });

  bot.loadPlugin(cmd);

  bot.on('login', function () {
    console.log("Logged In");
    connected = true;
    reconnectAttempts = 0; // Reset reconnect attempts on successful login
    attemptSpectatorMode(bot);
  });

  bot.on('time', function () {
    if (!connected || !isSpectator) return;

    const currentTime = new Date().getTime();
    if (lasttime < 0 || currentTime - lasttime > (moveinterval * 1000 + Math.random() * maxrandom * 1000)) {
      lastaction = actions[Math.floor(Math.random() * actions.length)];
      bot.setControlState(lastaction, true);
      setTimeout(() => bot.setControlState(lastaction, false), 500); // Move for 0.5 seconds to avoid "moved too quickly"
      lasttime = currentTime;
    }
  });

  bot.on('spawn', function () {
    connected = true;
  });

  bot.on('death', function () {
    bot.emit("respawn");
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
}

function startBot() {
  console.log("Attempting to log in...");
  createBot(); // Attempt to create a bot instance
}

function attemptReconnect() {
  if (reconnectAttempts < maxReconnectAttempts) {
    reconnectAttempts++;
    setTimeout(createBot, reconnectInterval);
  } else {
    console.log(`Max reconnect attempts reached. Waiting longer to reconnect...`);
    setTimeout(createBot, reconnectInterval * 6); // Wait 1 minute before reconnecting
  }
}

function startMoving(bot) {
  bot.on('time', function () {
    if (!connected || !isSpectator) return;

    const currentTime = new Date().getTime();
    if (lasttime < 0 || currentTime - lasttime > (moveinterval * 1000 + Math.random() * maxrandom * 1000)) {
      lastaction = actions[Math.floor(Math.random() * actions.length)];
      bot.setControlState(lastaction, true);
      setTimeout(() => bot.setControlState(lastaction, false), 500); // Move for 0.5 seconds to avoid "moved too quickly"
      lasttime = currentTime;
    }
  });
}

// Continuous login attempts
function attemptLogin() {
  startBot(); // Start attempting to log in
}

// Begin attempting to log in
attemptLogin();
