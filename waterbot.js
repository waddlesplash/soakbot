/* Waterbot - "What issue is that again?"
 *   It's like Firebot, but for GitHub repos.
 *
 * MIT license.
 */

var fs = require('fs');
var irc = require("irc");
var gha = require("github");
var servers;

/* Server list */
servers = fs.readFileSync('servers.json', {'encoding': 'utf8'});
if(!servers) { process.exit(1); }
servers = JSON.parse(servers);

/* GitHub API Setup */
var GitHubApi = new gha({version: "3.0.0"});
GitHubApi.authenticate({
  type: "oauth",
  token: process.env['github_access_token']
});
global.GHA = GitHubApi;

/* Initiate: connect to all specified servers */
for (var server in servers) {
  var channelsAndRepos = servers[server];
  startOnServer(server, channelsAndRepos);  
}

function startOnServer(server, channelsAndRepos) {
  /* What's the nick for this server?
   * Server "irc.freenode.net" becomes "irc_freenode_net_nick" */
  var nick = process.env[server.replace(/\./g,'_') + '_nick'];
  
  /* The Settings. Tweak as needed. */
  var bot = new irc.Client(server, nick, {
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
      handleChannel(bot, nick, channelsAndRepos[i].channel, channelsAndRepos[i].repo);
    }
  });
  
  /* Join channels upon invitation. */
  bot.addListener('invite', function(channel, from, msg) {
    handleChannel(bot, nick, channel);
  });

  /* Global commands: can be executed in any channel. */
  var globalCmds = function (from, chan, msg) {
    if(chan == nick) { chan = from; } /* this is a PM. */
    if((msg == nick + ': about') ||
       (msg == nick + ': help')) {
      bot.say(chan, from + ': I am Waterbot. The Issue Guru.');
      bot.say(chan, from + ': Ask me about the Issues.');
      bot.say(chan, from + ': Say "#1" or "#2" and I shall diverge my knowledge.');
      bot.say(chan, from + ': See https://github.com/waddlesplash/waterbot for more infos.');
    } else if((msg.indexOf(nick + ': join') == 0) ||
              (msg.indexOf(nick + ': invite') == 0)) {
      /* Join the specified channel.
       * Syntax: "waterbot: invite #channel [your/repo] */
      var data = msg.split(' ');
      var chanl = data[2], repo = data[3];
      if(chanl && (chanl.indexOf('#') == 0)) {
        if(!(chanl in bot.chans)) { // Ensure we aren't already there.
          handleChannel(bot, nick, chanl, repo);
          bot.say(chan, from + ": Thanks for the invite!");
        } else {
          bot.say(chan, from + ": Thanks -- but I'm already there!");
        }
      } else {
        /* Where's the channel? */
        bot.say(chan, from + ': I think you missed something. Like the channel, perhaps?');
      }
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
function handleChannel(bot, nick, channel, repoAndUser) {
  var user, repo, canLeave = false, addedListener = false;
  bot.join(channel);
  
  /* If the repo came from the JSON file, use that. If not,
   * examine the channel topic and try to find a GitHub URL. */
  if(repoAndUser) { 
    user = repoAndUser.split('/')[0];
    repo = repoAndUser.split('/')[1];
  } else { // Extract user/repo from URL in channel topic
    canLeave = true;
    bot.addListener('topic', function (chan, topic, nick, msg) {
      if(chan == channel) {
        var ghUrls = [], match, didUrl = false,
            pattern = /(https:\/\/github.com\/.+?)(\s|$)/g;
        while(match = pattern.exec(topic)) {
          if(match[1] && (ghUrls.indexOf(match[1]) == -1)) {
            ghUrls.push(match[1]);
          }
        }
        for(var i in ghUrls) {
          /* Remove any commas. */
          var url = ghUrls[i].split(',')[0].split('/');
          user = url[3]; // user
          repo = url[4]; // repo
          if(!user || !repo) continue;
          didUrl = true;
          break;
        }
        if(!didUrl) {
          bot.say(channel, "sorry, no GitHub URL found in topic -- parting.");
          bot.part(channel);
          if(addedListener) bot.removeListener('message' + channel, onChanMsg);
        } else {
          bot.say(channel, "using repo: "+user+'/'+repo);
        }
      }
    });
  }
  
  var onChanMsg = function (from, msg) {
    if(msg.match(/(^|\s)+(#(\d+)).*/)) {
      /* Someone said something that had #nums in it! */
      var issuePattern = /(^|\s)+((issue)?#(\d+))/g;
      var issues = [], match;
      while(match = issuePattern.exec(msg)) {
        if(!isNaN(match[4]) &&
           (issues.indexOf(match[4]) == -1)) {
          /* Add the issue that wasn't already in the list
           * to the list. */
          issues.push(match[4]);
        }
      }
      
      /* Get GitHub API for those issues. */
      for(var i in issues) {
        global.GHA.issues.getRepoIssue(
            {user: user, repo: repo, number: issues[i]}, function(err, data) {
              if(err != null) return;
              bot.say(channel, "Issue "+data.number+": "+data.title+". "+data.html_url);
            });
      }
    } else if((msg == nick + ': leave') || (msg == nick + ': part')) {
      /* We're not wanted here anymore. */
      if(canLeave) {
        bot.part(channel);
        bot.removeListener('message' + channel, onChanMsg);
      } else {
        bot.say(channel, from + ': leaving not allowed, chan is in "servers.json".');
      }
    }
  };

  /* The above event loop is in a var = fn so we can detach
   * the event listener when we want to, as removeListener
   * requires the name of a function. */
  bot.addListener('message' + channel, onChanMsg);
  addedListener = true;
}
