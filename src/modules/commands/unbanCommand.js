const Command = require('./command');
const blacklist = require('../blacklist.js');

class UnBanCommand extends Command {
  constructor(chatMessage) {
    super(chatMessage);
  }

  handle(message, channel) {
    super.handle(message, channel);
    blacklist.unban(message.split(' ')[1].toLowerCase().trim());
    this.rtm.sendMessage(`Blacklist: ${blacklist.getValues()}`, channel);
  }
}

module.exports = UnBanCommand;