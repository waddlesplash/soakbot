/* Waterbot - The Modular IRC Bot
 *   Sorta like Hubot, but for IRC and JavaScript
 *   instead of Campfire and CoffeeScript.
 *
 * Copyright 2013-2014 Augustin Cavalier (waddlesplash).
 * Licensed under the MIT license.
 */

var fs = require('fs');
var irc = require("irc");
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

function startOnServer(serverSettings, serverURL, settings) {
  var bot = new irc.Client(serverURL, serverSettings.nick, {
    realName: 'https://github.com/waddlesplash/waterbot',
    port: 6697, /* IRC over SSL */
    autoRejoin: false, /* Allows bot to be kicked. */
    secure: true,
    floodProtection: true,
    floodProtectionDelay: 300,
    stripColors: true
  });
  
  bot.addListener('registered', function(msg) {
    if("password" in serverSettings) {
      bot.send('NickServ', 'identify', serverSettings.nick, serverSettings.password);
    }

    for(var i in serverSettings.channels) {
      handleChannel(bot, serverSettings.channels[i], serverSettings, settings);
    }
  });

  /* Give help when someone PMs the bot */
  bot.addListener('pm', function(userNick, msg, raw) {
    if((msg == serverSettings.nick + ': about') || (msg == serverSettings.nick + ': help') ||
       (msg == "about") || (msg == "help")) {
      bot.say(userNick, 'I\'m a modular NodeJS-based IRC bot. Operator: "waddlesplash".');
      bot.say(userNick, 'Source code & issue tracker at https://github.com/waddlesplash/waterbot');
    }
  });
  bot.addListener('nick', function(oldNick, newNick) {
    /* Somebody force-changed the bot's nickname... */
    if(oldNick == serverSettings.nick)
      serverSettings.nick = newNick;
  });
  
  // If you delete this, the whole app will crash on an error
  bot.addListener('error', function(msg) {
    console.log('error: ', msg);
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
    for(var i in channelSettings.ignored) {
      if(('ignored' in channelSettings) && from.toLowerCase().indexOf(channelSettings.ignored[i]) == 0) {
        return;
      }
    }
    
    var parameters = {from: from, message: msg, channel: channel, topic: topic, bot: bot, nick: serverSettings.nick};
    if((msg == serverSettings.nick + ': about') ||
      (msg == serverSettings.nick + ': help')) {
      bot.say(channel, "I'm a modular NodeJS-based IRC bot. Operator: 'waddlesplash'.");
      bot.say(channel, 'Enabled modules: ' + channelSettings.modules);
      bot.say(channel, '(for help on a module, say "' + serverSettings.nick + ': help <module>".)');
      bot.say(channel, 'Source code & issue tracker at https://github.com/waddlesplash/waterbot');
    } else if(msg.split(' ').length > 2) {
      if(msg.split(' ')[2] in modules)
        if('onHelp' in modules[msg.split(' ')[2]])
          modules[msg.split(' ')[2]].onHelp(channelSettings, globalSettings, parameters);
      else
        bot.say(channel, from + ': that module is not loaded!');
    } else {
      for(var i in modules)
        modules[i].onMessage(channelSettings, globalSettings, parameters);
    }
  };
  
  /* Load the modules! */
  var loadme = channelSettings.modules.split(" ");
  for(var i in loadme) {
    var module = require("./modules/" + loadme[i]);
    modules[loadme[i]] = module;
    if("onLoad" in module) 
      module.onLoad(channelSettings, globalSettings);
  }

  bot.addListener('message' + channel, onMessage);
}
