# pm2-alert
Get notified the changes and events of your processes in Slack

### How it works
Depends on the cron configuration that defined in `pm2-alert.js`, it check the memory of your processes which managed by `pm2` and if its memory reach the maximum size then it will send notification via `Slack`

### How to use
1. simply install pm2-alert via 
```npm install pm2-alert --save``` 
2. Copy `pm2-alert.js` from node_modules/pm2-alert into the root directory of your application
