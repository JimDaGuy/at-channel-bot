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

      console.dir(username);

    // User hasn't added any blacklists
    if (!user) {
      console.dir("1");
      callback(true);
      return;
    }

    const userdoc = user._doc;
    // console.dir(userdoc);

    if (userdoc.hasOwnProperty('serverDisabled')) {
      // User muted the server
      if (userdoc.serverDisabled) {
        console.dir("2");
        callback(false);
        return;
      }
    } else {
      console.dir("3");
      callback(true);
      return;
    }

    // Check disabled channels map for current channel
    const { disabledChannels } = userdoc;
    const channelDisabled = disabledChannels.get(channel);
    console.dir(disabledChannels);
    console.dir(channelDisabled);
    if (channelDisabled !== undefined) {
      if (channelDisabled !== true) {
        console.dir("4");
        callback(false);
        return;
      }
    }

    // Current channel isn't blacklisted for the user
      console.dir("5");
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
