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
  const messageTimestamp = params.event.event_ts;
  const threadTimestamp = params.event.thread_ts || null;
  const threaded = threadTimestamp !== null; 

  switch (eventType) {
    case 'app_mention':
      res.status(200).send();
      // If not blacklisted and not sent from a bot
      if ((!blacklist.includes(channel)) && !(botMessage)) {
        // Get the list of members currently in the channel
        bot.channels.info({
          token: botToken,
          channel
        }).then(channelInfo => {
          const channelMembers = channelInfo.channel.members;
          console.dir(channelMembers);
          // Post the original message
          /*
          bot.chat.postMessage({ 
            token: botToken, 
            channel, 
            text: `<@${user}>: ${message}` 
          });
*/

          if (threaded) {
            bot.chat.postMessage({
              token: botToken,
              channel,
              text: 'Called in thread',
              thread_ts: threadTimestamp
            });
          } else {
            bot.chat.postMessage({
              token: botToken,
              channel,
              text: 'Called out of thread',
              event_ts: messageTimestamp 
            });
          }
        });
      
        
      }
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
