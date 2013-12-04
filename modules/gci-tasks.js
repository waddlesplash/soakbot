/* Waterbot -- Module "google-melange"
 * Reference a google-melange url, get info!
 *
 * Copyright 2013 :Puckipedia.
 * Licensed under the MIT license.
 *
 */

var http = require("http");
var cheerio = require ("cheerio");

exports.shouldRun = function(msg, configObj) {
  return msg.match(/https?:\/\/(www\.)?google-melange(\.appspot)?\.com\/([^/]+)\/task\/view\/([^/]+)\/([^/]+)\/([0-9]+)/g);
};

exports.run = function(from, msg, channel, topic, bot, nick, configObj) {
  var taskPattern = /https?:\/\/(www\.)?google-melange(\.appspot)?\.com\/([^/]+)\/task\/view\/([^/]+)\/([^/]+)\/([0-9]+)/g;
  var tasks = [], match;
  while(match = taskPattern.exec(msg)) {
    tasks.push(match[0].replace(/https?:\/\//, "").split("/"));
  }
  for(var taski in tasks) {
    var task = tasks[taski];
    var options = {
      host: task[0],
      path: "/"+(task.slice(1).join("/"))
    }; 
    var callback = function(response) {
      var data = '';

      //another chunk of data has been recieved, so append it to `str`
      response.on('data', function (chunk) {
        data += chunk;
      });

      response.on('end', function () {
        var $ = cheerio.load(data);
        var title = $(".title").text();
        var project = $(".project").text();
        var status = $(".status .emph").text();
        var mentors = $(".mentor .emph").text().split(", ");
        var tags = $(".tags .emph").text().split(", ");
        var first = {
          num: parseInt($(".time-first .number").text(), 10),
          unit: $(".time-first .cap").text()
        };
        var second = {
          num: parseInt($(".time:not(.time-first) .number").text(), 10),
          unit: $(".time:not(.time-first) .cap").text()
        };
        bot.say(channel, project+": "+title+" ("+status+")");
        bot.say(channel, "Mentor"+(mentors.length > 1 ? "s" : "")+": "+mentors.join(", "));
        if(!(isNaN(first.num) || isNaN(second.num)))
          bot.say(channel, first.num+" "+first.unit+", "+second.num+" "+second.unit+" remaining");
      });
    }
    http.request(options, callback).end(); 
  }
};
