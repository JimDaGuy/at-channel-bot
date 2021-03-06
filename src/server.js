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
  const edited = params.event.edited !== undefined && params.event.edited !== null;

  res.status(200).send();
  if (edited) {
    return;
  }

  switch (eventType) {
    case 'app_mention':
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
              text: `\n
                    Here\s my commands! \n
                    =================== \n
                    Help: \`@Notify help\` \n
                    Enable Server: \`@Notify enable server\` \n
                    Disable Server: \`@Notify disable server\` \n
                    Enable Channel: \`@Notify enable channel\` \n
                    Disable Channel: \`@Notify disable channel\` \n
                     `,
              user: user,
            });
            return;
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
                text: `Successfully muted <#${channel}> for your user. Type \`@Notify enable channel\` to undo`,
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
                text: `Successfully unmuted <#${channel}> for your user. Type \`@Notify disable channel\` to undo`,
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
              let newMessage = "";
              let promises = [];

              for (let i = 0; i < channelMembers.length; i++) {
                if (channelMembers[i] === 'UE7JDB49G') {
                  continue;
                } else if (channelMembers[i] === user) {
                  continue;
                }

                const currPromise = new Promise((resolve, reject) => {
                  // Check is user is enabled for this channel
                  Blacklist.checkUserEnabled(channelMembers[i], channel, (enabled) => {
                    if (enabled) {
                      newMessage = `${newMessage} <@${channelMembers[i]}>`;
                    }
                    resolve();
                  });
                });

                promises.push(currPromise);
              }

              Promise.all(promises).then( () => {
                // Respond to thread or create new thread
                if (threaded) {
                  sendMessage(botToken, channel, newMessage, threadTimestamp, user, message);
                } else {
                  sendMessage(botToken, channel, newMessage, messageTimestamp, user, message);
                }
              });
              
            });
        }
      }
      break;
    default:
      break;
  }
});

const sendMessage = (token, channel, memberString, timestamp, user, originalMessage) => {
  // Don't send empty message
  if (memberString === "") {
    return;
  }

  const trimmedMessage = originalMessage.replace("<@UE7JDB49G>", "").trim();
  
  const outputText = `<@${user}>: ${trimmedMessage} | ${memberString}`;

  bot.chat.postMessage({
    token,
    channel,
    text: outputText,
    thread_ts: timestamp
  });
};

app.listen(port, (err) => {
  if (err) {
    throw err;
  }

  console.log(`Listening on port ${port}`);
});
