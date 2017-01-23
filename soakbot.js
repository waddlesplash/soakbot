/* Soakbot - The Modular IRC Bot
 *   Sorta like Hubot, but for IRC and JavaScript
 *   instead of Campfire and CoffeeScript.
 *
 * Copyright 2013-2015 Augustin Cavalier <waddlesplash>.
 * Licensed under the MIT license.
 */

// Catch-all for exceptions
process.on('uncaughtException', function (err) {
  console.trace(err);
});

var fs = require('fs'),
    irc = require("irc");

/* Server list */
var config = fs.readFileSync('config.json', {'encoding': 'utf8'});
if (!config) {
  console.log("FATAL: No configuration file!");
  process.exit(1);
}
config = JSON.parse(config);

/* Initiate: connect to all specified servers */
for (var URL in config.networks) {
  var serverSettings = config.networks[URL];
  startOnServer(serverSettings, URL, config.settings);
}

function startOnServer(serverSettings, serverURL, globalSettings) {
  var tempNick = "skbot" + Math.floor(Math.random()*1000);
  var bot = new irc.Client(serverURL, tempNick, {
    userName: 'soakbot',
    realName: 'https://github.com/waddlesplash/soakbot',
    port: 6697, /* IRC over SSL */
    autoRejoin: false, /* Allows bot to be kicked. */
    secure: true,
    floodProtection: true,
    floodProtectionDelay: 500,
    stripColors: true
  });

  bot.on('registered', function(msg) {
    if ("password" in serverSettings) {
      bot.say("NickServ", "release " + serverSettings.nick + " " + serverSettings.password);
      bot.say("NickServ", "identify " + serverSettings.nick + " " +  serverSettings.password);
      bot.send("NICK", serverSettings.nick);
    }

    for (var i in serverSettings.channels) {
      handleChannel(bot, serverSettings.channels[i], serverSettings, globalSettings);
    }
  });

  /* Give help when someone PMs the bot */
  bot.on('pm', function(nick, msg, raw) {
    if ((msg == serverSettings.nick + ': about') || (msg == serverSettings.nick + ': help') ||
       (msg == "about") || (msg == "help")) {
      bot.say(nick, "I'm a modular NodeJS-based IRC bot. Operator(s): " +
        globalSettings.operators.join(', ') + ".");
      bot.say(nick, 'Source code & issue tracker at https://github.com/waddlesplash/soakbot');
    } else {
      console.log("WARN: " + nick + " msg'd me: \"" + msg + '"');
    }
  });
  bot.on('notice', function(nick, to, msg, raw) {
    console.log("WARN: " + nick + " notice'd me: \"" + msg + '"');
  });

  bot.on('nick', function (oldNick, newNick) {
    serverSettings.nick = newNick;
  });
}

/* Per-channel functionality. */
function handleChannel(bot, channelSettings, serverSettings, globalSettings) {
  var channel = channelSettings.channel, topic, modules = {}, users = [];

  bot.join(channel);
  if ("ignored" in channelSettings) {
    var ignored = [];
    for (var i in channelSettings.ignored)
      ignored[i] = channelSettings.ignored[i].toLowerCase();
    channelSettings.ignored = ignored;
  }

  bot.on('topic', function(chan, chanTopic, whoSetIt) {
    if (chan == channel) {
      topic = chanTopic;
    }
  });

  var onMessage = function(from, msg) {
    if ('ignored' in channelSettings) {
      for (var i in channelSettings.ignored) {
        if (from.toLowerCase().indexOf(channelSettings.ignored[i]) == 0)
          return;
      }
    }

    var parameters = {from: from, message: msg, originalMessage: msg, channel: channel, topic: topic, bot: bot, nick: serverSettings.nick};

    if ((msg == serverSettings.nick + ': about') ||
      (msg == serverSettings.nick + ': help')) {
      bot.say(channel, "I'm a modular NodeJS-based IRC bot. Operator(s): " + globalSettings.operators.join(', ') + ".");
      bot.say(channel, 'Source code & issue tracker at https://github.com/waddlesplash/soakbot');
      bot.say(channel, 'Enabled modules: ' + channelSettings.modules);
    } else {
      for (var i in modules)
        modules[i].onMessage(channelSettings, globalSettings, parameters);
    }
  };

  /* Load the modules! */
  for (var i in channelSettings.modules) {
    var module = require("./modules/" + channelSettings.modules[i]);
    modules[channelSettings.modules[i]] = module;
    if ("onLoad" in module)
      module.onLoad(channelSettings, globalSettings);
  }

  bot.on('message' + channel, onMessage);
}
