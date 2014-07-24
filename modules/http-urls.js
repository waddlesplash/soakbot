/* Waterbot -- Module "http-urls"
 *   Spouts page title when someone posts a link.
 *
 * Copyright 2014 Augustin Cavalier (waddlesplash).
 * Licensed under the MIT license.
 */

var http = require("http");
var https = require("https");

/* From PHPJS */
function htmlspecialchars_decode(string, quote_style) {
  var optTemp = 0,
  i = 0,
  noquotes = false;
  if (typeof quote_style === 'undefined') {
    quote_style = 2;
  }
  string = string.toString()
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>');
  var OPTS = {
    'ENT_NOQUOTES': 0,
    'ENT_HTML_QUOTE_SINGLE': 1,
    'ENT_HTML_QUOTE_DOUBLE': 2,
    'ENT_COMPAT': 2,
    'ENT_QUOTES': 3,
    'ENT_IGNORE': 4
  };
  if (quote_style === 0) {
    noquotes = true;
  }
  if (typeof quote_style !== 'number') { // Allow for a single string or an array of string flags
    quote_style = [].concat(quote_style);
    for (i = 0; i < quote_style.length; i++) {
      // Resolve string input to bitwise e.g. 'PATHINFO_EXTENSION' becomes 4
      if (OPTS[quote_style[i]] === 0) {
        noquotes = true;
      } else if (OPTS[quote_style[i]]) {
        optTemp = optTemp | OPTS[quote_style[i]];
      }
    }
    quote_style = optTemp;
  }
  if (quote_style & OPTS.ENT_HTML_QUOTE_SINGLE) {
    string = string.replace(/&#0*39;/g, "'"); // PHP doesn't currently escape if more than one 0, but it should
    // string = string.replace(/&apos;|&#x0*27;/g, "'"); // This would also be useful here, but not a part of PHP
  }
  if (!noquotes) {
    string = string.replace(/&quot;/g, '"');
  }
  // Put this in last place to avoid escape being double-decoded
  string = string.replace(/&amp;/g, '&');
  
  return string;
}

exports.onMessage = function(channelSettings, globalSettings, parameters) {
  var urls = [], match;
  var regexp = /(https?:\/\/[^\s]+)/g;
  console.log(parameters.message);
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
        var pos = data.toLowerCase().indexOf("<title>") + "<title>".length;
        if(pos == -1) return;
        
        var title = data.slice(pos);
        pos = title.toLowerCase().indexOf("</title");
        if(pos == -1) return;

        title = title.slice(0, pos);
        parameters.bot.say(parameters.channel, url.replace("https://", '').replace("http://", '').slice(0, 10) 
                                               + "..." + url.slice(-6) + ': ' + htmlspecialchars_decode(title.trim()));
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
