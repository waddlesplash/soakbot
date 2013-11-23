/* Waterbot -- Module "googcode-issues"
 *   When you reference a Google Code issue in a channel,
 *   it spits out the name and url of the issue.
 *
 * Copyright 2013 waddlesplash.
 * Licensed under the MIT license.
 *
 * SERVERS.JSON options
 * ====================
 * "googproj": name of a Google Code project.
 */

var http = require("http");

exports.globalInit = function() {
};

exports.shouldRun = function(msg, configObj) {
  /* Is there a #number in the message? */
  return msg.match(/(^|\s)+(#(\d+)).*/);
};

exports.run = function(from, msg, channel, topic, bot, nick, configObj) {
  if(!configObj.googproj) { return; }
  
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
      host: 'code.google.com',
      path: '/p/'+configObj.googproj+'/issues/csv?can=1&q=id%3A'+issues[i]+'&colspec=ID%20Summary'
    };
    callback = function(response) {
      var str = '';
      response.on('data', function(chunk) {
        str += chunk;
      });
      response.on('end', function() {
        var csv = str.split("\n")[1], say = "Issue ";
        if(!csv) { return; }
        csv = csv.substr(1,csv.length-2); /* Strip first and last quotemark */
        csv = csv.split('","');
        say += csv[0]+': '+csv[1]+'. '+'https://code.google.com/p/'+configObj.googproj+'/issues/detail?id='+csv[0];
        bot.say(channel, say);
      });
    }
    http.get(options, callback).end();
  }
};
