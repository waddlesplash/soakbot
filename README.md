Soakbot
=====================
A modular IRC bot written in NodeJS designed for open-source projects. Use one
of the builtin modules, or write your own.

Configuration
--------------------------
Configuration is stored in a `config.json` file. If you're using the `heroku-deploy.js`
script, then use `config.deployment.json` instead. There are 2 root objects: `networks`
and `channels`. `settings` is passed to all the loaded modules, and `networks` is parsed
by the bot to determine what modules to load in what channels.

See `config.example.json` for an example configuration file.

Modules
---------------------------
All the builtin modules complete with configuration options are listed below.

### Issues
**Example:**
```
<waddlesplash> #1 #2
<soakbot> Issue 1: YourApp crashes on line 1337. https://github.com/your/repo/issues/1
<soakbot> Pull 2: Fix crash on line 1337. https://github.com/your/repo/pull/2
```
**Global settings**:
 - `github-token`, an OAuth2 token for use with the GitHub API.
**Per-channel settings**:
 - `github-repo`, the GitHub repo to use when looking up issues. (e.g. `waddlesplash/soakbot`).
