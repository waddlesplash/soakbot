Waterbot
=====================
An IRC bot that gives you links to GitHub issues when you reference them. Example:
```
<waddlesplash> #1 #2
<waterbot> Issue 1: BlahApp crashes on line BLAH. https://github.com/your/repo/issues/1
<waterbot> Issue 2: Add "Blah blah" to blah.blah. https://github.com/your/repo/pull/2
```

It can handle multiple channels across multiple IRC servers in one instance on one thread.

## Getting one for your channel
`waterbot` currently operates on both Mozilla IRC and Freenode IRC (on Freenode as `soakbot`). To add Waterbot to your channel,
use the `/invite` command. To make waterbot leave, use `waterbot: leave`. Waterbot looks for a GitHub URL in your channel's topic. If you don't have one, it will leave.

Note that when Waterbot is restarted, it won't auto-join your channel. If you'd like a permanent Waterbot in your channel, add your channel and GitHub repo for the channel to the `servers.json` file and submit a pull request.
If you use an IRC server other than Mozilla or Freenode, please report an issue instead of opening a pull request.

## Removing your channel
Remove your channel and GitHub repo from the `servers.json` file and submit a pull request. Note that a channel admin will be contacted to confirm removal.

## Hosting one yourself
For each IRC server in `servers.json`, there must be two environment variables set: nick and NickServ password. So for Freenode, you must set `irc_freenode_net_nick` and `irc_freenode_net_pass`. `github_access_token` must also be set, get one from the "personal access tokens" page of your account.

## Known bugs
 - If for some reason disconnected from a server, the bot does not automatically reconnect.
