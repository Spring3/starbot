const { WebClient, RTMClient } = require('@slack/client');
const {
  autoScanInterval,
  // scanTriggerEmoji,
  reactionEmoji,
  // favoritesReactionEmoji
} = require('./configuration.js');
// const mongo = require('./mongo');
const Team = require('./team.js');
const TeamEntity = require('../entities/team.js');
// const Links = require('../entities/links.js');
// const Highlights = require('../entities/highlights.js');
// const Channel = require('./channel');
const blacklist = require('./blacklist');

const ignoredEvents = ['hello', 'ping', 'pong'];

/**
 * A class of a slack bot
 */
class Bot {
  constructor(data) {
    const { bot = {}, scope, team_id } = data;
    this.token = data.token || bot.bot_access_token;
    this.id = data._id || bot.bot_user_id;
    this.blacklist = blacklist;
    this.rtm = new RTMClient(this.token);
    this.webClient = new WebClient(this.token);
    this.scopes = data.scopes || (scope || '').split(',');
    this.team = { id: data.teamId || team_id };
    if (autoScanInterval) {
      this.scanningInterval = this.beginScanningInterval();
    }
  }

  /**
   * Put an reaction emoji on the behalf of the bot
   * @param  {ChatMessage} message
   * @param  {string} emoji   - code for the emoji without colon sign (:)
   * @return {Promise}
   */
  async react(message, emoji = reactionEmoji.toLowerCase()) {
    if (!message.isMarked()) {
      try {
        await this.web.bot.reactions.add(emoji, {
          channel: message.channel.id || message.channel,
          timestamp: message.timestamp,
        });
        message.mark();
      } catch (e) {
        console.error(e);
      }
    }
  }

  /**
   * Starts the automatic scan interval
   * @return {function} - function to stop the interval
   */
  beginScanningInterval() {
    return setInterval(() => {
      const command = `<@${this.id}> scan`;
      for (const [id, channel] of this.channels.entries()) { // eslint-disable-line no-unused-vars
        const chatMessage = channel.getMessage({
          type: 'message',
          text: command
        });
        chatMessage.getCommand().getHandler().handle(chatMessage.getDirectMessage(), channel.id);
      }
    }, parseInt(autoScanInterval, 10));
  }

  /**
   * Stop the bot activity
   * @return {undefined}
   */
  shutdown() {
    clearInterval(this.scanningInterval);
  }

  /**
   * Start the bot activity
   * @return {undefined}
   */
  start() {
    this.init();
    this.rtm.start();
  }

  /**
   * Set up bot's event handlers
   * @return {undefined}
   */
  init() {
    /**
     {
        ok: true,
        url: 'wss://',
        team: { id: '', name: '', domain: '' },
        self: { id: '', name: 'star' },
        scopes: [ 'identify', 'bot:basic' ],
        acceptedScopes: [ 'rtm:stream', 'client' ]
      }
    */
    this.rtm.once('authenticated', async (data) => {
      if (data.ok) {
        const team = new Team(data.team);
        await team.getBotChannels();
        TeamEntity.upsert(Object.assign(team.toJSON(), { bot: this.id }));
        this.team = team;
      } else {
        console.error(`Error trying to authenticate: ${data.error}`);
      }
    });

    this.rtm.on('slack_event', async (type, msg) => {
      console.log(type);
      console.log(msg);
      if (ignoredEvents.includes(type) || !this.team.channels.has(msg.channel)) {
        return;
      }
      
      const channel = this.team.channels.get(msg.channel);

      /*
        { type: 'channel_joined',
  channel:
   { id: 'C8SK1H90B',
     name: 'random',
     is_channel: true,
     is_group: false,
     is_im: false,
     created: 1515975558,
     is_archived: false,
     is_general: false,
     unlinked: 0,
     name_normalized: 'random',
     is_shared: false,
     creator: 'U8S5U2V0R',
     is_ext_shared: false,
     is_org_shared: false,
     shared_team_ids: [ 'T8S5U2UTT' ],
     pending_shared: [],
     is_pending_ext_shared: false,
     is_member: true,
     is_private: false,
     is_mpim: false,
     last_read: '1532036696.000315',
     latest:
      { type: 'message',
        user: 'U8S5U2V0R',
        text: '<@U8TPTJAET> hey',
        client_msg_id: '2d9a52f3-8c9a-401a-9b1e-55eca8bf5b72',
        ts: '1532036696.000315' },
     unread_count: 0,
     unread_count_display: 0,
     members: [ 'U8S5U2V0R', 'U8TPTJAET', 'U8V0CM6K1' ],
     topic:
      { value: 'Non-work banter and water cooler conversation',
        creator: 'U8S5U2V0R',
        last_set: 1515975558 },
     purpose:
      { value: 'A place for non-work-related flimflam, faffing, hodge-podge or jibber-jabber you\'d prefer to keep out of more focused work-related channels.',
        creator: 'U8S5U2V0R',
        last_set: 1515975558 },
     previous_names: [],
     priority: 0 } }
       */
      
      /**
       { type: 'member_joined_channel',
        user: 'U8TPTJAET',
        channel: 'GBTTY9WDB',
        channel_type: 'G',
        team: 'T8S5U2UTT',
        inviter: 'U8S5U2V0R',
        event_ts: '1532036290.000320',
        ts: '1532036290.000320' }
       */
      
      /*
      { type: 'group_joined',
  channel:
   { id: 'GBTTY9WDB',
     name: 'private',
     is_channel: false,
     is_group: true,
     is_im: false,
     created: 1532036276,
     is_archived: false,
     is_general: false,
     unlinked: 0,
     name_normalized: 'private',
     is_shared: false,
     creator: 'U8S5U2V0R',
     is_ext_shared: false,
     is_org_shared: false,
     shared_team_ids: [ 'T8S5U2UTT' ],
     pending_shared: [],
     is_pending_ext_shared: false,
     is_member: true,
     is_private: true,
     is_mpim: false,
     last_read: '1532036284.000160',
     latest:
      { type: 'message',
        user: 'U8S5U2V0R',
        text: '<@U8TPTJAET> hello',
        client_msg_id: 'b02e00f5-840f-449a-b792-17bf4a9e6134',
        ts: '1532036284.000160' },
     unread_count: 0,
     unread_count_display: 0,
     is_open: true,
     members: [ 'U8S5U2V0R', 'U8TPTJAET' ],
     topic: { value: '', creator: '', last_set: 0 },
     purpose: { value: '', creator: '', last_set: 0 },
     priority: 0 } }
       */
      switch (type) {
        case 'message': {
          channel.processMessage(msg);
          // if (msg.channel) {
          //   const channel = this.channels.get(msg.channel);
          // const message = channel.getMessage(msg);
          // if (message.isTextMessage() && message.author !== this.id) {
          //   if (message.hasLink && message.isMarkedAsFavorite()) {
          //     Links.save(message);
          //     if (!message.isMarked()) {
          //       this.react(message);
          //     }
          //   } else {
          //     const command = message.getCommand();
          //     if (command) {
          //       const handler = command.getHandler();
          //       if (handler) {
          //         handler.handle(message.getDirectMessage(), message.channel.id, { replyOnFinish: true });
          //       }
          //     }
          //   }
          // }
          // }
          break;
        }
        default: {
          break;
        }
      }
    });

    // this.rtm.on('reaction_added', async (msg) => {
    //   const jsonMessage = typeof msg === 'string' ? JSON.parse(msg) : msg;
    //   if (!scanTriggerEmoji) return;
    //   const payload = jsonMessage.item;
    //   if (
    //     jsonMessage.reaction === scanTriggerEmoji.toLowerCase()
    //     && jsonMessage.user !== this.id
    //     && payload.type === 'message'
    //   ) {
    //     const channel = this.channels.get(payload.channel) || new Channel({ id: payload.channel, name: 'DM' }, this.team);
    //     const message = await channel.fetchMessage(payload.ts);
    //     if (message.isTextMessage() && message.hasLink) {
    //       Links.save(message)
    //         .then(() => Highlights.save(message, jsonMessage.user))
    //         .then(() => this.react(message, favoritesReactionEmoji.toLowerCase()));
    //     }
    //   }
    // });

    // this.rtm.on('channels_rename', async (msg) => {
    //   const jsonMessage = typeof msg === 'string' ? JSON.parse(msg) : msg;
    //   const channelId = jsonMessage.channel.id;
    //   if (this.channels.has(channelId)) {
    //     this.channels.get(channelId).name = jsonMessage.channel.name;
    //     const db = await mongo.connect();
    //     await db.collection('Links').update(
    //       { 'channel.id': channelId },
    //       {
    //         $set: {
    //           'channel.name': jsonMessage.channel.name
    //         }
    //       },
    //       { multi: true }
    //     );
    //   }
    // });

    // this.rtm.on('member_joined_channel', async (data) => {
    //   const memberId = data.user;
    //   const channelId = data.channel;
    //   if (this.channels.has(channelId)) {
    //     // somebody joined a channel
    //     const channel = this.channels.get(channelId);
    //     channel.memberJoined(memberId);
    //     this.rtm.sendMessage(`Welcome to the \`${channel.name}\` channel, <@${memberId}>!`, channelId);
    //   } else {
    //     // bot joined a channel
    //     let channelData = await this.web.bot.channels.info(channelId);
    //     channelData = typeof channelData === 'string' ? JSON.parse(channelData) : channelData;
    //     this.channels.set(channelId, new Channel(channelData.channel, this.team));
    //   }
    // });

    // this.rtm.on('member_left_channel', (data) => {
    //   const memberId = data.user;
    //   const channelId = data.channel;
    //   if (this.channels.has(channelId)) {
    //     if (memberId === this.id) {
    //       // bot left a channel
    //       this.channels.delete(channelId);
    //     } else {
    //       // somebody left a channel
    //       this.channels.get(channelId).memberLeft(memberId);
    //     }
    //   }
    // });
  }
}

module.exports = Bot;
