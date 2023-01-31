import Client from '../structures/Client';

import { JSONMessage, Message } from 'oceanic.js';

export default class MessageUpdate {
  client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  run(message: Message, oldMessage: JSONMessage) {
    if (!oldMessage || !message || oldMessage.content === message.content) return;

    if (this.client.blacklist?.includes(message.author.id)) return;

    this.client.emit('messageCreate', message);
  }
}