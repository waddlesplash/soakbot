Waterbot
=====================
It's a Modular IRC Bot written in JavaScript. There are different modules for different tasks.  
A common one is issues. Here's an example of the GitHub issue module (others work similarly):
```
<waddlesplash> #1 #2
<waterbot> Issue 1: BlahApp crashes on line BLAH. https://github.com/your/repo/issues/1
<waterbot> Issue 2: Add "Blah blah" to blah.blah. https://github.com/your/repo/pull/2
```

It can handle multiple channels across multiple IRC servers in one instance on one thread.

## Hosting one yourself
For each IRC server in `servers.json`, there must be two environment variables set: nick and NickServ password. So for Freenode, you must set `irc_freenode_net_nick` and `irc_freenode_net_pass`. `github_access_token` must also be set, get one from the "personal access tokens" page of your account.
