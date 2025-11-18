/**
 * Session Schema - Defines AR session and user interaction state
 */

import { Message } from './message.js';

export class Session {
  constructor({
    sessionId = crypto.randomUUID(),
    userId = '',
    startTime = Date.now(),
    active = true,
    conversationHistory = []
  } = {}) {
    this.sessionId = sessionId;
    this.userId = userId;
    this.startTime = startTime;
    this.active = active;
    this.conversationHistory = conversationHistory;
  }

  addMessage(message) {
    if (Message.validate(message)) {
      this.conversationHistory.push(message);
      return true;
    }
    return false;
  }

  getLastMessage() {
    return this.conversationHistory[this.conversationHistory.length - 1] || null;
  }

  getConversationContext(limit = 10) {
    return this.conversationHistory.slice(-limit);
  }

  endSession() {
    this.active = false;
  }

  getDuration() {
    return Date.now() - this.startTime;
  }

  toJSON() {
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      startTime: this.startTime,
      duration: this.getDuration(),
      active: this.active,
      messageCount: this.conversationHistory.length,
      conversationHistory: this.conversationHistory.map(msg => msg.toJSON())
    };
  }

  static validate(session) {
    if (!session.sessionId || typeof session.sessionId !== 'string') return false;
    if (!Array.isArray(session.conversationHistory)) return false;
    return true;
  }
}

export default Session;
