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
let isAdmin = false;

function getRandomArbitrary(min, max) {
  return Math.random() * (max - min) + min;
}

function checkIfAdmin(bot) {
  bot.chat('/op ' + bot.username);
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
    checkIfAdmin(bot);
  });

  bot.on('chat', (username, message) => {
    if (username === bot.username) return;
    if (message.includes("Made " + bot.username + " a server operator")) {
      isAdmin = true;
      bot.chat("/gamemode spectator");
    }
  });

  bot.on('time', function () {
    if (!connected || !isAdmin) return;

    const currentTime = new Date().getTime();
    if (lasttime < 0 || currentTime - lasttime > (moveinterval * 1000 + Math.random() * maxrandom * 1000)) {
      lastaction = actions[Math.floor(Math.random() * actions.length)];
      bot.setControlState(lastaction, true);
      setTimeout(() => bot.setControlState(lastaction, false), 1000); // Move for 1 second
      lasttime = currentTime;
    }
  });

  bot.on('spawn', function () {
    connected = true;
    if (!isAdmin) {
      console.log("Waiting to be an operator...");
      checkIfAdmin(bot);
    }
  });

  bot.on('death', function () {
    bot.emit("respawn");
  });

  bot.on('kicked', function (reason) {
    console.log("Bot was kicked from the server. Reason:", reason);
    connected = false;
    setTimeout(createBot, 10000); // Reconnect after 10 seconds
  });

  bot.on('end', function () {
    console.log("Bot has been disconnected. Reconnecting...");
    connected = false;
    setTimeout(createBot, 10000); // Reconnect after 10 seconds
  });

  bot.on('error', function (err) {
    console.log("Error occurred:", err);
    connected = false;
    setTimeout(createBot, 10000); // Retry after 10 seconds on error
  });
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
