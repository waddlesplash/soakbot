/* Waterbot -- Module "trac-issues"
 *   When you reference a Trac issue in a channel,
 *   it spits out the name and url of the issue.
 *
 * Copyright 2013 waddlesplash.
 * Licensed under the MIT license.
 *
 * SERVERS.JSON options
 * ====================
 * "tracurl": root url of a Trac server, without the "http".
 */

var http = require("http");

exports.globalInit = function() {
};

exports.shouldRun = function(msg, configObj) {
  /* Is there a #number in the message? */
  return msg.match(/(^|\s)+(#(\d+)).*/);
};

exports.run = function(from, msg, channel, topic, bot, nick, configObj) {
  if(!configObj.tracurl) { return; }
  
  var issuePattern = /(^|\s)+((issue)?#(\d+))/g;
  var issues = [], match;
  while(match = issuePattern.exec(msg)) {
    if(!isNaN(match[4]) && (issues.indexOf(match[4]) == -1)) {
      /* Add the issue that wasn't already in the list */
      issues.push(match[4]);
    }
  }
  
  /* Get issues using CSV */
  for(var i in issues) {
    var options = {
      host: configObj.tracurl,
      path: '/ticket/'+issues[i]+'?format=csv'
    };
    callback = function(response) {
      var str = '';
      response.on('data', function(chunk) {
        str += chunk;
      });
      response.on('end', function() {
        var csv = str.split("\r\n")[1].split(','), say = "Ticket ";
        say += csv[0]+': '+csv[1]+'. '+'https://'+configObj.tracurl+'/ticket/'+csv[0];
        bot.say(channel, say);
      });
    }
    http.get(options, callback).end();
  }
};
