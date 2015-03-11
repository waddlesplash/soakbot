/* Soakbot -- Module "http-urls"
 *   Spouts page title when someone posts a link.
 *
 * Copyright 2014 Augustin Cavalier (waddlesplash).
 * Licensed under the MIT license.
 */

var http = require("http");
var https = require("https");

function unHTMLify(string) {
  return string.trim()
    .replace(new RegExp("&amp;", 'g'), "&")
    .replace(new RegExp("&lt;", 'g'), "<")
    .replace(new RegExp("&gt;", 'g'), ">")
    .replace(new RegExp("&quot;", 'g'), '"')
    .replace(new RegExp("&#039;", 'g'), "'")
    .replace(new RegExp("&mdash;", 'g'), "–")
    
    .replace(new RegExp("\r\n", 'g'), " ")
    .replace(new RegExp("\r", 'g'), " ")
    .replace(new RegExp("\n", 'g'), " ");
}

exports.onMessage = function(channelSettings, globalSettings, parameters) {
  var urls = [], match;
  var regexp = /(https?:\/\/[^\s]+)/g;

  while(matches = regexp.exec(parameters.message)) {
    if ((matches[0].indexOf("127.0.0.1") == -1) && (matches[0].indexOf("localhost") == -1))
      urls.push(matches[0]);
    else {
      parameters.bot.say(parameters.channel, "I'm not that stupid. :P");
      console.log("[http-urls.js] Someone tried to request localhost!");
    }
  }

  for (var urli in urls) {
    var url = urls[urli];
    var callback = function(response) {
      var data = '';
      function findTitle() {
        var pos = data.toLowerCase().indexOf("<title>") + "<title>".length;
        if (pos == -1) return;
        
        var title = data.slice(pos);
        pos = title.toLowerCase().indexOf("</title");
        if (pos == -1) return;

        title = title.slice(0, pos);
        var prepend = '';
        if (urls.length > 1)
          prepend = url.replace("https://", '').replace("http://", '').slice(0, 10) + "..." + url.slice(-6) + ': ';
        parameters.bot.say(parameters.channel, prepend + unHTMLify(title));
      }
      response.on('data', function (chunk) {
        data += chunk;
        if (data.indexOf("</title") != -1) {
          response.destroy();
        }
      });
      response.on('end', findTitle);
    }

    if (url.indexOf("https") == 0)
      https.request(url, callback).end();
    else
      http.request(url, callback).end();
  }
};
