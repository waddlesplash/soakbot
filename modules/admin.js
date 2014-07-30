/* Waterbot -- Module "admin"
 *   Executes admin commands.
 *   DANGER: make sure the admins have NickServ kill protection on,
 *           or lock the bot inside a CHROOT, because this module allows
 *           execution of shell commands!!
 * 
 * Licensed under the MIT license.
 */
var exec = require('child_process').exec;

exports.onMessage = function(parameters) {
  function puts(error, stdout, stderr) {
    parameters.bot.say(parameters.channel, stderr);
    parameters.bot.say(parameters.channel, stdout);
  }
  
  var trimmed = parameters.message.trim();
  if(trimmed.indexOf("$(") == 0) {
    var cmd = trimmed.substring(2, trimmed.length - 1);
    exec(cmd, puts);
  } else if(trimmed.toLowerCase().indexOf("die!")) {
    process.exit(1);
  }
};
