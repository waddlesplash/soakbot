/* Waterbot -- Module "github-issues"
 *   When you reference a GitHub issue in a channel,
 *   it spits out the name and url of the issue.
 *
 * Copyright 2013 waddlesplash.
 * Licensed under the MIT license.
 *
 * SERVERS.JSON options
 * ====================
 * 
 */

var gha = require("github");

exports.globalInit = function() {
  if(!!global.GHA) { return; }

  /* GitHub API Setup */
  var GitHubApi = new gha({version: "3.0.0"});
  GitHubApi.authenticate({
    type: "oauth",
    token: process.env['github_access_token']
  });
  global.GHA = GitHubApi;
};

/* The actual bot functions */
exports.shouldRun = function(msg, configObj) {
  /* Is there a #number in the message? */
  return msg.match(/(^|\s)+(#(\d+)).*/);
};

exports.run = function(from, msg, channel, topic, bot, nick, configObj) {
  if(!configObj.user || !configObj.repo) {
    /* Figure out what repo to use. If the repo came from the
     * JSON file, use that. If not, examine the channel topic
     * and try to find a GitHub URL. */ 
    if(!!configObj.ghrepo) {
      configObj.user = configObj.ghrepo.split('/')[0];
      configObj.repo = configObj.ghrepo.split('/')[1];
    } else {
      configObj.canLeave = true;
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
        user = url[3]; /* user */
        repo = url[4]; /* repo */
        if(!user || !repo) { continue; }
        didUrl = true;
        break;
      }
      if(!didUrl) { return; }
    }
  }
  
  var issuePattern = /(^|\s)+((issue)?#(\d+))/g;
  var issues = [], match;
  while(match = issuePattern.exec(msg)) {
    if(!isNaN(match[4]) && (issues.indexOf(match[4]) == -1)) {
      /* Add the issue that wasn't already in the list */
      issues.push(match[4]);
    }
  }
  
  /* Get issues using GitHub API. */
  for(var i in issues) {
    global.GHA.issues.getRepoIssue(
      {user: configObj.user, repo: configObj.repo, number: issues[i]}, function(err, data) {
        if(err != null) { return; }
        bot.say(channel, "Issue "+data.number+": "+data.title+". "+data.html_url);
      });
  }
};
