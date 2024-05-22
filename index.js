const mineflayer = require('mineflayer');
const cmd = require('mineflayer-cmd').plugin;
const fs = require('fs');
const keep_alive = require('./keep_alive.js');
let rawdata = fs.readFileSync('config.json');
let data = JSON.parse(rawdata);

var lasttime = -1;
var moving = 0;
var connected = false; // Use boolean to track connection state
var actions = ['forward', 'back', 'left', 'right'];
var lastaction;
var pi = 3.14159;
var moveinterval = 2; // 2 second movement interval
var maxrandom = 5; // 0-5 seconds added to movement interval (randomly)
var host = data["ip"];
var username = data["name"];
var nightskip = data["auto-night-skip"];

function getRandomArbitrary(min, max) {
    return Math.random() * (max - min) + min;
}

function createBot() {
    const bot = mineflayer.createBot({
        host: host,
        username: username
    });

    bot.loadPlugin(cmd);

    bot.on('login', function() {
        console.log("Logged In");
        connected = true;
        bot.chat("hello");
    });

    bot.on('time', function(time) {
        if (nightskip == "true" && bot.time.timeOfDay >= 13000) {
            bot.chat('/time set day');
        }

        if (!connected) return;

        if (lasttime < 0 || bot.time.age - lasttime > (moveinterval * 20 + Math.random() * maxrandom * 20)) {
            const yaw = Math.random() * pi - (0.5 * pi);
            const pitch = Math.random() * pi - (0.5 * pi);
            lastaction = actions[Math.floor(Math.random() * actions.length)];
            bot.look(yaw, pitch, false);
            bot.setControlState(lastaction, true);
            moving = true;
            lasttime = bot.time.age;
            bot.activateItem();
        }
    });

    bot.on('spawn', function() {
        connected = true;
    });

    bot.on('death', function() {
        bot.emit("respawn");
    });

    bot.on('kicked', function(reason, loggedIn) {
        console.log("Bot was kicked from the server. Reason:", reason);
        connected = false;
        setTimeout(createBot, 5000); // Reconnect after 5 seconds
    });

    bot.on('end', function() {
        console.log("Bot has been disconnected. Reconnecting...");
        connected = false;
        setTimeout(createBot, 5000); // Reconnect after 5 seconds
    });

    bot.on('error', function(err) {
        console.log("Error occurred:", err);
        console.log("Attempting to log in again...");
        connected = false;
        setTimeout(createBot, 5000); // Retry after 5 seconds on error
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
