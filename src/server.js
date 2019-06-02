const express = require('express');
const bodyParser = require('body-parser');

const blacklist = require('./blacklistedChannels.js').blacklist;

const Slack = require('slack');
const botToken = `${process.env.BOT_USER_OAUTH_TOKEN}` || '';
const bot = new Slack({token: botToken});

const mongoose = require('mongoose');
const dbURL = process.env.MONGODB_URI || 'mongodb://localhost/atChannelBot';

mongoose.connect(dbURL, (err) => {
  if (err) {
    console.dir("Could not connect to database");
    throw err;
  }
});

const models = require('./Models/index.js');
const Blacklist = models.Blacklist.BlacklistModel;

const port = process.env.PORT || process.env.NODE_PORT || 3000;

const app = express();
app.use(bodyParser.urlencoded({ extended: true, }));
app.use(bodyParser.json());

app.post('*', (request, response) => {
  const req = request;
  const res = response;

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
      if (!botMessage) {
          if (!user || !channel) {
            return;
          }

          // Check if the message is requesting something other than an at channel
          if (message.includes("help")) {
            bot.chat.postEphemeral({
              token: botToken,
              channel,
              text: `Here\s my commands! \n
                     =================== \n
                     Help: \`@Notify help\` \n
                     Enable Server: \`@Notify enable server\` \n
                     Disable Server: \`@Notify disable server\` \n
                     Enable Channel: \`@Notify enable channel\` \n
                     Disable Channel: \`@Notify disable channel\` \n
                     `,
              user: user,
            });
          } else if (message.includes("disable server")) {
            Blacklist.disableServer(user, (err) => {
              if (err) {
                console.dir(`Error muting server for ${user}`);
              }
              bot.chat.postEphemeral({
                token: botToken,
                channel,
                text: 'Successfully muted the server for your user. Type \`@Notify enable server\` to undo',
                user: user,
              });
            });
            return;
          } else if (message.includes("enable server")) {
            Blacklist.enableServer(user, (err) => {
              if (err) {
                console.dir(`Error unmuting server for ${user}`);
              }
              bot.chat.postEphemeral({
                token: botToken,
                channel,
                text: 'Successfully unmuted the server for your user. Type \`@Notify disable server\` to undo',
                user: user,
              });
            });
            return;
          } else if (message.includes("disable channel")) {            
            Blacklist.disableChannel(user, channel, (err) => {
              if (err) {
                console.dir(`Error muting ${channel} for ${user}`);
              }
              bot.chat.postEphemeral({
                token: botToken,
                channel,
                text: `Successfully muted <!${channel}> for your user. Type \`@Notify enable channel\` to undo`,
                user: user,
              });
            });
            return;
          } else if (message.includes("enable channel")) {
            Blacklist.enableChannel(user, channel, (err) => {
              if (err) {
                console.dir(`Error unmuting ${channel} for ${user}`);
              }
              bot.chat.postEphemeral({
                token: botToken,
                channel,
                text: `Successfully unmuted <!${channel}> for your user. Type \`@Notify disable channel\` to undo`,
                user: user,
              });
            });
            return;
          }

        // If channel is not blacklisted
        if (!blacklist.includes(channel)) {
            // Get the list of members currently in the channel
            bot.channels.info({
              token: botToken,
              channel
            }).then(channelInfo => {
              const channelMembers = channelInfo.channel.members;

              // Create message filled with users
              let message = "";
              let j = 0;
              for (let i = 0; i < channelMembers.length; i++) {
                if (channelMembers[i] === 'UE7JDB49G') {
                  j++;
                  if (j >= channelMembers.length) {
                    // Don't send empty message
                    if (message === "") {
                      return;
                    }

                    // Respond to thread or create new thread
                    if (threaded) {
                      bot.chat.postMessage({
                        token: botToken,
                        channel,
                        text: message,
                        thread_ts: threadTimestamp
                      });
                      return;
                    } else {
                      bot.chat.postMessage({
                        token: botToken,
                        channel,
                        text: message,
                        thread_ts: messageTimestamp 
                      });
                      return;
                    }
                  }
                  continue;
                }

                // Check is user is enabled for this channel
                Blacklist.checkUserEnabled(user, channel, (enabled) => {
                  if (enabled) {
                    message = `${message} <@${channelMembers[i]}>`;
                  }

                  j++;
                  if (j >= channelMembers.length) {
                    // Don't send empty message
                    if (message === "") {
                      return;
                    }

                    // Respond to thread or create new thread
                    if (threaded) {
                      bot.chat.postMessage({
                        token: botToken,
                        channel,
                        text: message,
                        thread_ts: threadTimestamp
                      });
                      return;
                    } else {
                      bot.chat.postMessage({
                        token: botToken,
                        channel,
                        text: message,
                        thread_ts: messageTimestamp 
                      });
                      return;
                    }
                  }
                });
              }

              
            });
        }
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
