/* Waterbot - The Modular IRC Bot
 *   Sorta like Hubot, but for IRC and JavaScript
 *   instead of Campfire and CoffeeScript.
 *
 * Copyright 2013-2014 Augustin Cavalier (waddlesplash).
 * Licensed under the MIT license.
 */

// Catch-all for exceptions
process.on('uncaughtException', function (err) {
  console.trace(err);
}); 

var fs = require('fs');
var irc = require("irc");
var admin = require("./modules/admin.js");
var config;

/* Server list */
config = fs.readFileSync('config.json', {'encoding': 'utf8'});
if(!config) {
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
  var bot = new irc.Client(serverURL, serverSettings.nick, {
    realName: 'https://github.com/waddlesplash/waterbot',
    port: 6697, /* IRC over SSL */
    autoRejoin: false, /* Allows bot to be kicked. */
    secure: true,
    floodProtection: true,
    floodProtectionDelay: 500,
    stripColors: true
  });
  
  bot.addListener('registered', function(msg) {
    if("password" in serverSettings) {
      bot.send('NickServ', 'release', serverSettings.nick, serverSettings.password);
      bot.send('NickServ', 'identify', serverSettings.nick, serverSettings.password);
    }

    for(var i in serverSettings.channels) {
      handleChannel(bot, serverSettings.channels[i], serverSettings, globalSettings);
    }
  });

  /* Give help when someone PMs the bot */
  bot.addListener('pm', function(userNick, msg, raw) {
    if((msg == serverSettings.nick + ': about') || (msg == serverSettings.nick + ': help') ||
       (msg == "about") || (msg == "help")) {
      bot.say(channel, "I'm a modular NodeJS-based IRC bot. Operator(s): " + globalSettings.operators.join(', ') + ".");
      bot.say(userNick, 'Source code & issue tracker at https://github.com/waddlesplash/waterbot');
    } else if(globalSettings.operators.indexOf(userNick) != -1) {
      var parameters = {from: userNick, message: msg, channel: userNick, topic: '', bot: bot, nick: serverSettings.nick};
      admin.onMessage(parameters);
    }
  });
  bot.addListener('nick', function(oldNick, newNick) {
    /* Somebody force-changed the bot's nickname... */
    if(oldNick == serverSettings.nick)
      serverSettings.nick = newNick;
  });
}

/* Per-channel functionality. */
function handleChannel(bot, channelSettings, serverSettings, globalSettings) {
  var channel = channelSettings.channel, topic, modules = {}, users = [];

  bot.join(channel);
  if("ignored" in channelSettings) {
    channelSettings.ignored = channelSettings.ignored.toLowerCase().split(" ");
  }
  
  bot.addListener('topic', function(chan, chanTopic, whoSetIt) {
    if(chan == channel) {
      topic = chanTopic;
    }
  });
  
  var onMessage = function(from, msg) {
    if('ignored' in channelSettings) {
      for(var i in channelSettings.ignored) {
        if(from.toLowerCase().indexOf(channelSettings.ignored[i]) == 0)
          return;
      }
    }
    
    var parameters = {from: from, message: msg, originalMessage: msg, channel: channel, topic: topic, bot: bot, nick: serverSettings.nick};

    if((msg == serverSettings.nick + ': about') ||
      (msg == serverSettings.nick + ': help')) {
      bot.say(channel, "I'm a modular NodeJS-based IRC bot. Operator(s): " + globalSettings.operators.join(', ') + ".");
      bot.say(channel, 'Source code & issue tracker at https://github.com/waddlesplash/waterbot');
      bot.say(channel, 'Enabled modules: ' + channelSettings.modules);
    } else {
      if(globalSettings.operators.indexOf(from) != -1)
        admin.onMessage(parameters);
      for(var i in modules)
        modules[i].onMessage(channelSettings, globalSettings, parameters);
    }
  };
  
  /* Load the modules! */
  var loadme = channelSettings.modules.split(" ");
  for(var i in loadme) {
    if(!fs.existsSync("./modules/" + loadme[i]))
      continue;
    var module = require("./modules/" + loadme[i]);
    modules[loadme[i]] = module;
    if("onLoad" in module) 
      module.onLoad(channelSettings, globalSettings);
  }

  bot.addListener('message' + channel, onMessage);
}
