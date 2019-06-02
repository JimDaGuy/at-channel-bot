const express = require('express');
const bodyParser = require('body-parser');

const blacklist = require('./blacklistedChannels.js').blacklist;

const Slack = require('slack');
const botToken = `${process.env.BOT_USER_OAUTH_TOKEN}` || '';
const bot = new Slack({token: botToken});

const port = process.env.PORT || process.env.NODE_PORT || 3000;

const app = express();
app.use(bodyParser.urlencoded({ extended: true, }));
app.use(bodyParser.json());

app.post('*', (request, response) => {
  const req = request;
  const res = response;

  console.dir("Body");
  console.log("Body2");
  console.dir(req.body);
  const params = req.body;

  const eventType = params.event.type;
  const message = params.event.text;
  const user = params.event.user;
  const channel = params.event.channel;
  const botMessage = params.event.subtype === 'bot_message';

  switch (eventType) {
    case 'app_mention':
      res.status(200).send();
      // If not blacklisted and not responding to a bot, send @channel
      if ((!blacklist.includes(channel)) && !(botMessage))
        bot.chat.postMessage({ 
          token: botToken, 
          channel, 
          text: `<@${user}>: ${message}` });
      break;
    case 'message':
    default:
      res.status(200).send();
      break;
  }
});

app.listen(port, (err) => {
  if (err) {
    throw err;
  }

  console.log(`Listening on port ${port}`);
});
