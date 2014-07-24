/* Waterbot -- Module "http-urls"
 *   Spouts page title when someone posts a link.
 *
 * Copyright 2014 Augustin Cavalier (waddlesplash).
 * Licensed under the MIT license.
 */

var http = require("http");
var https = require("https");

exports.onMessage = function(channelSettings, globalSettings, parameters) {
  var taskPattern = /https?/g;
  var urls = [], match;
  var regexp = /(\b(https?):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
  while(matches = regexp.exec(parameters.message)) {
    if((matches[0].indexOf("127.0.0.1") == -1) && (matches[0].indexOf("localhost") == -1))
      urls.push(matches[0]);
    else {
      parameters.bot.say(parameters.channel, "I'm not that stupid. :P");
      console.log("[http-urls.js] Someone tried to request localhost!");
    }
  }

  for(var urli in urls) {
    var url = urls[urli];
    var callback = function(response) {
      var data = '';
      function findTitle() {
        var pos = data.indexOf("<title>") + "<title>".length;
        if(pos == -1) {
          console.log("No title found for "+ url +"");
          return;
        } else {
          var title = data.slice(pos);
          title = title.slice(0, title.indexOf("</title"));
          parameters.bot.say(parameters.channel, url + ': ' + title.trim());
        }
      }
      response.on('data', function (chunk) {
        data += chunk;
        if(data.indexOf("</title") != -1) {
          response.destroy();
        }
      });
      response.on('end', findTitle);
    }

    if(url.indexOf("https") == 0)
      https.request(url, callback).end();
    else
      http.request(url, callback).end();
  }
};
