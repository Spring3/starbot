const Bot = require('./../bot');
const AbstractCommand = require('./abstractCommand');
const ChatMessage = require('./../chatMessage');
const mongo = require('./../../services/mongo').instance;

const linksCollection = mongo.collection('Links');

class ScanCommand extends AbstractCommand {
  constructor(rtm, chatMessage) {
    super(rtm, chatMessage);
  }

  async handle(message, channel) {
    super.handle(message, channel);
    // getting all messages from the channel
    let messages = await Bot.instance.mainChannel.getMessages(Bot.instance);
    const linksToInsert = [];
    // filtering and getting only plain text messages with links, sent not by bot itself
    let chatMessagesWithLinks = messages.map((message) => {
      return new ChatMessage(Object.assign(message, { channel: Bot.instance.mainChannel.id }));
    })
    .filter((chatMessage) => {
      return chatMessage.isTextMessage() && chatMessage.author !== Bot.instance.id && chatMessage.containsLink();
    });
    messages = null;
    // putting them into an array for the mongodb query
    let allLinks = [];
    for (const chatMessage of chatMessagesWithLinks) {
      allLinks = allLinks.concat(chatMessage.getLinks().map((link) => link.href));
    }
    let result = await linksCollection.find({ href: { $in: allLinks }}).toArray();
    result = result.map((link) => link.href);
    allLinks = null;

    // for each of the message with link, check if there is a unique link.
    // if there is, then insert it to the batch and mark the message with a star
    const batch = linksCollection.initializeUnorderedBulkOp();
    let uniqueLinksCount = 0;
    for (const chatMessage of chatMessagesWithLinks) {
      for (const link of chatMessage.getLinks()) {
        if (!result.includes(link.href)) {
          batch.insert(link);
          uniqueLinksCount ++;
        }
        if (!chatMessage.isMarked()) {
          Bot.instance.react(chatMessage);
          chatMessage.mark();
        }
      }

    }
    if (uniqueLinksCount > 0) {
      batch.execute();
    }
    this.rtm.sendMessage(`${uniqueLinksCount} new links saved`, channel);
  }
}

module.exports = ScanCommand;
