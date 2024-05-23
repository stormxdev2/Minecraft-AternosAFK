const mineflayer = require('mineflayer');
const cmd = require('mineflayer-cmd').plugin;
const fs = require('fs');
// Add keep_alive
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

// Remove join and leave messages for the bot
function removeBotMessages(bot) {
  bot.on('playerJoined', (player) => {
    if (player.username !== bot.username) {
      console.log(`${player.username} joined the game`);
    }
  });

  bot.on('playerLeft', (player) => {
    if (player.username !== bot.username) {
      console.log(`${player.username} left the game`);
    }
  });
}

// Start keep-alive mechanism
function startKeepAlive(bot) {
  setInterval(() => {
    bot.setControlState('forward', true); // Move forward (or any action to keep bot active)
    setTimeout(() => {
      bot.setControlState('forward', false); // Stop moving forward after 1 second
    }, 1000);
  }, 30 * 1000); // Keep bot active every 30 seconds
}

function attemptSpectatorMode(bot) {
  if (attemptSpectatorOnce) {
    setTimeout(() => {
      bot.chat("/gamemode spectator");
      console.log("Should be in spectator mode, starting walking #stormxdev");
      isSpectator = true;
      attemptSpectatorOnce = false; // Ensure this runs only once
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
    removeBotMessages(bot); // Remove join and leave messages for the bot
    startKeepAlive(bot); // Start the keep-alive mechanism after logging in
    reconnectAttempts = 0; // Reset reconnect attempts on successful login
    attemptSpectatorMode(bot);
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

  bot.on('chat', (username, message) => {
    if (username === bot.username) return;

    console.log(`${username}: ${message}`);

    if (message.includes('switched to Spectator mode')) {
      isSpectator = true;
      console.log("Should be in spectator mode, starting walking #stormxdev");
      startMoving(bot);
    }
  });
}

function startMoving(bot) {
  bot.on('time', function () {
    if (!connected || !isSpectator) return;

    const currentTime = new Date().getTime();
    if (lasttime < 0 || currentTime - lasttime > (moveinterval * 1000 + Math.random() * maxrandom * 1000)) {
      lastaction = actions[Math.floor(Math.random() * actions.length)];
      bot.setControlState(lastaction, true);
      console.log(`Bot is moving: ${lastaction}`);
      setTimeout(() => {
        bot.setControlState(lastaction, false);
        console.log(`Bot stopped moving: ${lastaction}`);
      }, 500); // Move for 0.5 seconds to avoid "moved too quickly"
      lasttime = currentTime;
    }
  });
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
