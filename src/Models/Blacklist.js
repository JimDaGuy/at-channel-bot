const mongoose = require('mongoose');

mongoose.Promise = global.Promise;

let BlacklistModel = {};

const BlacklistSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  serverDisabled: {
    type: Boolean,
    required: true,
    default: false,
  },
  disabledChannels: {
    type: Map,
    of: String,
    required: true,
    default: {},
  },
});

BlacklistSchema.statics.checkUserEnabled = (username, channel, callback) => {
    BlacklistModel.findOne({ username }, (error, user) => {
      if (error) {
        console.dir("Error: Could not search username");
        callback(false);
        return;
      }

    // User hasn't added any blacklists
    if (!user) {
      callback(true);
      return;
    }

    if (user.hasOwnProperty('serverDisabled')) {
      // User muted the server
      if (user.serverDisabled) {
        callback(false);
        return;
      }
    } else {
      callback(true);
      return;
    }

    // Check disabled channels map for current channel
    const { disabledChannels } = user;
    if (disabledChannels[channel]) {
      callback(false);
      return;
    }

    // Current channel isn't blacklisted for the user
    callback(true);
    return;
  });
};

BlacklistSchema.statics.disableChannel = (username, channel, callback) => { 
  const channelKey = `disabledChannels.${channel}`;
  BlacklistModel.findOneAndUpdate({ username }, { $set: { [channelKey]: true }}, { upsert: true }, (error) => {
    callback(error);
  });
};

BlacklistSchema.statics.enableChannel = (username, channel, callback) => { 
  const channelKey = `disabledChannels.${channel}`;
  BlacklistModel.findOneAndUpdate({ username }, { $set: { [channelKey]: false }}, { upsert: true }, (error) => {
    callback(error);
  });
};

BlacklistSchema.statics.disableServer = (username, callback) => { 
  BlacklistModel.findOneAndUpdate({ username }, { serverDisabled: true }, { upsert: true }, (error) => {
    callback(error);
  });
};

BlacklistSchema.statics.enableServer = (username, callback) => { 
  BlacklistModel.findOneAndUpdate({ username }, { serverDisabled: false }, { upsert: true }, (error) => {
    callback(error);
  });
};

BlacklistModel = mongoose.model('Blacklist', BlacklistSchema);

module.exports = {
  BlacklistModel,
  BlacklistSchema,
};
