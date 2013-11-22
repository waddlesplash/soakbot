/* Waterbot - The Modular IRC Bot
 *   Sorta like Hubot, but for IRC and JavaScript
 *   instead of Campfire and CoffeeScript.
 *
 * Copyright 2013 waddlesplash.
 * Licensed under the MIT license.
 */

var fs = require('fs');
var irc = require("irc");
var servers;

/* Server list */
servers = fs.readFileSync('servers.json', {'encoding': 'utf8'});
if(!servers) { process.exit(1); }
servers = JSON.parse(servers);

/* Initiate: connect to all specified servers */
for (var server in servers) {
  var channelsAndRepos = servers[server];
  startOnServer(server, channelsAndRepos);  
}

function startOnServer(servr, channelsAndRepos) {
  var server; /* Use this for everything but connecting */
  if(servr.indexOf('freenode') != -1) {
    server = 'irc.freenode.net'; /* Allow other freenode servers */
  } else {
    server = servr;
  }
  
  /* What's the nick for this server?
   * Server "irc.freenode.net" becomes "irc_freenode_net_nick" */
  var nick = process.env[server.replace(/\./g,'_') + '_nick'];
  
  /* The Settings. Tweak as needed. */
  var bot = new irc.Client(servr, nick, {
    realName: 'https://github.com/waddlesplash/waterbot',
    port: 6697, /* IRC over SSL */
    autoRejoin: false, /* Allows bot to be kicked. */
    secure: true,
    floodProtection: true,
    floodProtectionDelay: 300, /* yes, this is dangerous... */
    stripColors: true
  });
  
  /* The Real Setup runs here after we get the "001" line. */
  bot.addListener('registered', function(msg) {
    /* Identify via NickServ if there's a passwrd in the ENV. */
    if(process.env[server.replace(/\./g,'_') + '_pass']) {
      bot.send('NickServ', 'identify', process.env[server.replace(/\./g,'_') + '_pass']);
    }
    /* Actually connect to channels */
    for(var i in channelsAndRepos) {
      handleChannel(bot, nick, channelsAndRepos[i]);
    }
  });
  
  /* Join channels upon invitation. */
  bot.addListener('invite', function(channel, from, msg) {
    if(!(chanl in bot.chans)) { // Ensure we aren't already there.
      handleChannel(bot, nick, channel);
    }
  });

  /* Global commands: can be executed in any channel. */
  var globalCmds = function (from, chan, msg) {
    if(chan == nick) { chan = from; } /* this is a PM. */
    if((msg.indexOf(nick + ': join') == 0) ||
       (msg.indexOf(nick + ': invite') == 0)) {
      /* TODO: make this work again!
      /* Join the specified channel.
       * Syntax: "waterbot: invite #channel [your/repo]
      var data = msg.split(' ');
      var chanl = data[2], repo = data[3];
      if(chanl && (chanl.indexOf('#') == 0)) {
        if(!(chanl in bot.chans)) { // Ensure we aren't already there.
          handleChannel(bot, nick, chanl, repo, true);
          bot.say(chan, from + ": Thanks for the invite!");
        } else {
          bot.say(chan, from + ": Thanks -- but I'm already there!");
        }
      } else {
        /* Where's the channel?
        bot.say(chan, from + ': where\'s the channel?');
      } */
    }
  };
  
  /* This triggers on PMs too. */
  bot.addListener('message', function (from, chan, msg, raw) {
    globalCmds(from, chan, msg);
  });
  
  // If you delete this, the whole app will crash on an error
  bot.addListener('error', function(msg) {
    console.log('error: ', msg);
  });
}

/* Per-channel functionality. */
function handleChannel(bot, nick, cfg, leave) {
  var configObj = cfg, channel, topic, modules = [],
      addedListener = false;
  channel = configObj.channel;
  bot.join(channel);
  
  bot.addListener('topic', function(chan, chanTopic, nick, msg) {
    if(chan == channel) {
      topic = chanTopic;
    }
  });
  
  var onChanMsg = function (from, msg) {
    for(var i in modules) {
      if(modules[i].shouldRun(msg, configObj)) {
        modules[i].run(from, msg, channel, topic, bot, nick, configObj);
      }
    }
    
    if((msg == nick + ': about') ||
       (msg == nick + ': help')) {
      bot.say(channel, 'I\'m the Modular JS-based bot. Operator: "waddlesplash".');
      bot.say(channel, 'enabled modules: ' + configObj.modules);
      bot.say(channel, 'src code at https://github.com/waddlesplash/waterbot');
    }
    /* TODO: make all this work again.
    if((msg == nick + ': leave') || (msg == nick + ': part')) {
      // We're not wanted here anymore. 
      if(canLeave) {
        bot.part(channel);
        bot.removeListener('message' + channel, onChanMsg);
      } else {
        bot.say(channel, from + ': can\'t leave, because this channel is in "servers.json".');
      }
    } */
  };
  
  /* Load dem modules! */
  var loadme = configObj.modules.split(" ");
  for(var i in loadme) {
    modules.push(require("./modules/"+loadme[i]));
    modules[modules.length-1].globalInit();
  }

  /* The above event loop is in a var = fn so we can detach
   * the event listener when we want to, as removeListener
   * requires the name of a function. */
  bot.addListener('message' + channel, onChanMsg);
  addedListener = true;
}
