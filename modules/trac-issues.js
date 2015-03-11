/* Soakbot -- Module "trac-issues"
 *   When you reference a Trac issue in a channel,
 *   it spits out the name and url of the issue.
 *
 * Copyright 2013-2014 Augustin Cavalier (waddlesplash).
 * Licensed under the MIT license.
 *
 * OPTIONS
 * ====================
 * Per-channel: "trac-url": root URL of a Trac server (including the protocol).
 */

var http = require("http");
var https = require("https");

exports.onMessage = function(channelSettings, globalSettings, parameters) {
  if(!'trac-url' in channelSettings)
    return;
  if(!parameters.message.match(/(^|\s)+(#(\d+)).*/))
    return;

  var issuePattern = /(^|\s)+((issue)?#(\d+))/g;
  var issues = [], match;
  while(match = issuePattern.exec(parameters.message)) {
    if(!isNaN(match[4]) && (issues.indexOf(match[4]) == -1)) {
      /* Add the issue that wasn't already in the list */
      issues.push(match[4]);
    }
  }
  
  /* Get issues using CSV */
  for(var i in issues) {
    callback = function(response) {
      var str = '';
      response.on('data', function(chunk) {
        str += chunk;
      });
      response.on('end', function() {
        var csv = str.split("\r\n")[1], say = "Ticket ";
        if (!csv) return;
        csv = csv.split(',');
        say += csv[0]+': '+csv[1]+'. '+channelSettings['trac-url']+'/ticket/'+csv[0];
        parameters.bot.say(parameters.channel, say);
      });
    }
    if(channelSettings['trac-url'].indexOf("https") == 0)
      https.get(channelSettings['trac-url'] + '/ticket/'+issues[i]+'?format=csv', callback).end();
    else
      http.get(channelSettings['trac-url'] + '/ticket/'+issues[i]+'?format=csv', callback).end();
  }
};
