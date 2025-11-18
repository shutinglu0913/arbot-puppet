/**
 * Message Schema - Defines structure for chat messages
 */

export class Message {
  constructor({
    id = crypto.randomUUID(),
    sender = 'user', // 'user' or 'puppet'
    text = '',
    timestamp = Date.now(),
    type = 'text', // 'text' or 'voice'
    metadata = {}
  } = {}) {
    this.id = id;
    this.sender = sender;
    this.text = text;
    this.timestamp = timestamp;
    this.type = type;
    this.metadata = metadata; // for additional data (e.g., confidence scores)
  }

  static validate(msg) {
    if (!msg.id || typeof msg.id !== 'string') return false;
    if (!['user', 'puppet'].includes(msg.sender)) return false;
    if (!msg.text || typeof msg.text !== 'string') return false;
    if (typeof msg.timestamp !== 'number') return false;
    if (!['text', 'voice'].includes(msg.type)) return false;
    return true;
  }

  toJSON() {
    return {
      id: this.id,
      sender: this.sender,
      text: this.text,
      timestamp: this.timestamp,
      type: this.type,
      metadata: this.metadata
    };
  }
}

export default Message;
