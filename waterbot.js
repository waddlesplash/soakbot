/* Waterbot - "What issue is that again?"
 *   It's like Firebot, but for GitHub.
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

for (var server in servers) {
  var channelsAndRepos = servers[server];
  startOnServer(server, channelsAndRepos);  
}

function startOnServer(server, channelsAndRepos) {
  var nick = process.env[server.replace(/\./g,'_') + '_nick'];

  var bot = new irc.Client(server, nick, {
    realName: 'https://github.com/waddlesplash/waterbot',
    port: 6697, /* SSL */
    autoRejoin: false,
    secure: true,
    floodProtection: true,
    floodProtectionDelay: 300, /* yes, this is dangerous... */
    stripColors: true
  });
  
  bot.addListener('registered', function(msg) {
    if(process.env[server.replace(/\./g,'_') + '_pass']) {
      bot.send('NickServ', 'identify', process.env[server.replace(/\./g,'_') + '_pass']);
    }
    for(var i in channelsAndRepos) {
      handleChannel(bot, nick, channelsAndRepos[i].channel, channelsAndRepos[i].repo);
    }
  });
  
  bot.addListener('invite', function(channel, from, msg) {
    handleChannel(bot, nick, channel);
  });
  
  // If you delete this, the whole app will crash on an error
  bot.addListener('error', function(msg) {
      console.log('error: ', msg);
  });
}

function handleChannel(bot, nick, channel, repoAndUser) {
  var user, repo, canLeave = false, addedListener = false;
  bot.join(channel);
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
          var url = ghUrls[i].split('/');
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
      var issuePattern = /(^|\s)+((issue)?#(\d+))/g;
      var issues = [], match;
      while(match = issuePattern.exec(msg)) {
        if(!isNaN(match[4]) &&
           (issues.indexOf(match[4]) == -1)) {
          issues.push(match[4]);
        }
      }
      
      for(var i in issues) {
        global.GHA.issues.getRepoIssue(
            {user: user, repo: repo, number: issues[i]}, function(err, data) {
              if(err != null) return;
              bot.say(channel, "Issue "+data.number+": "+data.title+". "+data.html_url);
            });
      }
    } else if((msg == nick + ': leave') || (msg == nick + ': part')) {
      if(canLeave) {
        bot.part(channel);
        bot.removeListener('message' + channel, onChanMsg);
      } else {
        bot.say(channel, from + ': leaving not allowed, as this channel is in my "servers.json" file.');
      }
    }
  };

  bot.addListener('message' + channel, onChanMsg);
  addedListener = true;
}
