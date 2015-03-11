/* Soakbot -- Module "gci-tasks"
 *   Spouts info about a Google Melange task when someone posts a URL to one.
 *
 * Copyright 2013 Puck Meerburg (puckipedia).
 * Copyright 2013-2014 Augustin Cavalier (waddlesplash).
 * Licensed under the MIT license.
 */

var http = require("http");
var cheerio = require("cheerio");

exports.onMessage = function(channelSettings, globalSettings, parameters) {
  var taskPattern = /https?:\/\/(www\.)?google-melange(\.appspot)?\.com\/([^/]+)\/task\/view\/([^/]+)\/([^/]+)\/([0-9]+)/g;
  var tasks = [], match;
  while(match = taskPattern.exec(parameters.message)) {
    tasks.push(match[0].replace(/https?:\/\//, "").split("/"));
  }
  for (var taski in tasks) {
    // Remove URLs from the message so other modules don't do stuff with them
    parameters.message.replace(new RegExp("http://" + tasks[taski].join("/"), 'g'), '');
    parameters.message.replace(new RegExp("https://" + tasks[taski].join("/"), 'g'), '');

    var task = tasks[taski];
    var options = {
      host: task[0],
      path: "/"+(task.slice(1).join("/"))
    };
    var callback = function(response) {
      var data = '';

      // another chunk of data has been recieved, so append it onto 'str'
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
        var say = project + ": " + title.replace(/ \(................\)/, "");
        say += " | " + status;
        say += " | Mentor"+(mentors.length > 1 ? "s" : "") + ": " + mentors.join(", ");
        parameters.bot.say(parameters.channel, say);
      });
    }
    http.request(options, callback).end();
  }
};
