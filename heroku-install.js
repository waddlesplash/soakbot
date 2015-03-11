/* Waterbot - The Modular IRC Bot
 *   Sorta like Hubot, but for IRC and JavaScript
 *   instead of Campfire and CoffeeScript.
 *
 * Copyright 2013-2014 Augustin Cavalier (waddlesplash).
 * Licensed under the MIT license.
 * 
 * Install script to create and upload to a Heroku instance.
 * USAGE: npm install shelljs; node heroku-install name_of_herokuapp
 */
require('shelljs/global');

if(!which('git')) {
  echo('This script requires git to be in your PATH.');
  exit(1);
} else if(!which('heroku')) {
  echo('This script requires the Heroku Toolbelt to be in your PATH.');
  exit(1);
} else if(process.argv[2] == undefined) {
  echo('You must pass a HerokuApp name as an argument.');
  exit(1);
}

echo("Copying files...");
mkdir("heroku-build");
cp('-Rf', 'modules', 'heroku-build');
cp('-f', '*.*', 'heroku-build');

cd('heroku-build'); {
  echo("Deleting ignored files...");
  echo("worker: node soakbot.js\n").to("Procfile");
  rm("-rf", "node_modules");
  rm("*.json");
  cp("../package.json", ".");
  cp("../config.deployment.json", "./config.json");
  rm("heroku-install.js");
  
  echo("Creating Git repository...");
  exec("git init .");
  exec("git add *");
  exec('git commit -m "Automated import for Heroku." --author="heroku-install.js <heroku-install@localhost>"');
  
  var pushURL = "git@heroku.com:" + process.argv[2] + ".git";
  echo("Force-pushing to " + pushURL + "...");
  exec("git push --force " + pushURL + " master:master");
  echo("Done!");
} cd('..');

if((process.argv[3] != "--save-temporary") &&
   (process.argv[3] != "-t")) {
  rm('-rf', 'heroku-build');
}
