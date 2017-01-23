/* Soakbot -- Module "github-issues"
 *   When you reference a GitHub issue in a channel,
 *   it spits out the name and url of the issue.
 *
 * Copyright 2013-2017 waddlesplash.
 * Licensed under the MIT license.
 *
 * OPTIONS
 * ====================
 * "settings": "github-token", OAuth2 access token.
 * Per-channel: "github-repo": GitHub repository, e.g. "waddlesplash/soakbot".
 */

var gha = require("github");

exports.onLoad = function(channelSettings, globalSettings) {
  if (!!global.GHA) /* We've already been called. */
    return;

  /* GitHub API Setup */
  var GitHubApi = new gha({version: "3.0.0"});
  GitHubApi.authenticate({
    type: "oauth",
    token: globalSettings['github-token']
  });
  global.GHA = GitHubApi;
};

exports.onMessage = function(channelSettings, globalSettings, parameters) {
  if (!parameters.message.match(/(^|\s)+(#(\d+)).*/))
    return;
  if (!channelSettings.user || !channelSettings.repo) {
    /* Figure out what repo to use. If the repo came from the
     * JSON file, use that. If not, examine the channel topic
     * and try to find a GitHub URL. */
    if (!!channelSettings['github-repo']) {
      channelSettings.githubUser = channelSettings['github-repo'].split('/')[0];
      channelSettings.githubRepo = channelSettings['github-repo'].split('/')[1];
    } else {
      var ghUrls = [], match, didUrl = false,
      pattern = /(https:\/\/github.com\/.+?)(\s|$)/g;
      while(match = pattern.exec(parameters.topic)) {
        if (match[1] && (ghUrls.indexOf(match[1]) == -1)) {
          ghUrls.push(match[1]);
        }
      }
      for (var i in ghUrls) {
        /* Remove any commas. */
        var url = ghUrls[i].split(',')[0].split('/');
        user = url[3]; /* user */
        repo = url[4]; /* repo */
        if (!user || !repo) { continue; }
        didUrl = true;
        break;
      }
      if (!didUrl)
        return;
    }
  }

  var issuePattern = /(^|\s)+((issue)?#(\d+))/g;
  var issues = [], match;
  while(match = issuePattern.exec(parameters.message)) {
    if (!isNaN(match[4]) && (issues.indexOf(match[4]) == -1)) {
      /* Add the issue that wasn't already in the list */
      issues.push(match[4]);
    }
  }

  /* Get issues using GitHub API. */
  for (var i in issues) {
    global.GHA.issues.get(
      { owner: channelSettings.githubUser, repo: channelSettings.githubRepo, number: issues[i] }, function(err, data) {
        if (err != null) {
          console.log(err);
          return;
        }
        var str;
        if (data.html_url.indexOf("/pull/") != -1)
          str = "Pull ";
        else
          str = "Issue ";
        parameters.bot.say(parameters.channel, str+data.number+": "+data.title+". "+data.html_url);
      });
  }
};
