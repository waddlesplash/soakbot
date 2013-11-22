Waterbot
=====================
It's a Modular IRC Bot written in JavaScript. There are different modules for different tasks.  
A common one is issues. Here's an example of the GitHub issue module (others work similarly):
```
<waddlesplash> #1 #2
<waterbot> Issue 1: BlahApp crashes on line BLAH. https://github.com/your/repo/issues/1
<waterbot> Issue 2: Add "Blah blah" to blah.blah. https://github.com/your/repo/pull/2
```
(todo: rewrite this readme!)

It can handle multiple channels across multiple IRC servers in one instance on one thread.

## Getting one for your channel
`waterbot` currently operates on both Mozilla IRC and Freenode IRC (on Freenode as `soakbot`).

If you'd like a permanent Waterbot in your channel, add your channel and GitHub repo for the channel to the `servers.json` file and submit a pull request.

## Removing your channel
Remove your channel and GitHub repo from the `servers.json` file and submit a pull request. Note that a channel admin will be contacted to confirm removal.

## Hosting one yourself
For each IRC server in `servers.json`, there must be two environment variables set: nick and NickServ password. So for Freenode, you must set `irc_freenode_net_nick` and `irc_freenode_net_pass`. `github_access_token` must also be set, get one from the "personal access tokens" page of your account.
