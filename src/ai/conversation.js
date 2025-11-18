/**
 * Conversation Engine - Manages chat logic and AI responses
 * Integrates with LLM API for generating puppet responses
 * Coordinates animations with conversation flow
 */

import { Message, Session } from '../schema/index.js';
import { API_CONFIG } from '../config/constants.js';

export class ConversationEngine {
  constructor(config = {}) {
    this.config = {
      apiProvider: config.apiProvider || 'openai',
      maxHistoryLength: config.maxHistoryLength || 10,
      systemPrompt: config.systemPrompt || this.getDefaultSystemPrompt(),
      ...config
    };

    this.session = null;
    this.isProcessing = false;
    this.listeners = {};
  }

  /**
   * Initialize conversation session
   */
  async initialize(userId = '') {
    try {
      console.log('[ConversationEngine] Initializing session...');
      
      this.session = new Session({
        userId: userId || 'anonymous',
        active: true
      });

      // Emit greeting message from puppet
      const greetingMsg = new Message({
        sender: 'puppet',
        text: '你好！我是你的AI机器人伙伴。很高兴见到你！',
        type: 'text'
      });

      this.session.addMessage(greetingMsg);
      this.emit('messageReceived', greetingMsg);

      console.log('[ConversationEngine] Session initialized:', this.session.sessionId);
      this.emit('initialized');

      return {
        success: true,
        message: 'Conversation session initialized',
        sessionId: this.session.sessionId
      };
    } catch (error) {
      console.error('[ConversationEngine] Initialization error:', error);
      return {
        success: false,
        message: error.message,
        error
      };
    }
  }

  /**
   * Process user message and generate AI response
   */
  async processUserMessage(text) {
    if (!this.session || this.isProcessing) {
      console.warn('[ConversationEngine] Session not ready or processing');
      return null;
    }

    try {
      this.isProcessing = true;

      // Create and store user message
      const userMessage = new Message({
        sender: 'user',
        text: text,
        type: 'text'
      });

      this.session.addMessage(userMessage);
      this.emit('messageReceived', userMessage);
      console.log('[ConversationEngine] User message added:', userMessage.id);

      // Generate AI response
      const aiResponse = await this.generateAIResponse(text);

      // Create puppet message
      const puppetMessage = new Message({
        sender: 'puppet',
        text: aiResponse.text || '我想不出好的回答...',
        type: 'text',
        metadata: {
          animationHint: aiResponse.animationHint || 'talking'
        }
      });

      this.session.addMessage(puppetMessage);
      this.emit('messageReceived', puppetMessage);
      console.log('[ConversationEngine] Puppet response generated:', puppetMessage.id);

      return puppetMessage;
    } catch (error) {
      console.error('[ConversationEngine] Error processing message:', error);
      this.emit('error', error);
      return null;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Generate AI response using LLM API
   */
  async generateAIResponse(userText) {
    try {
      const conversationContext = this.session.getConversationContext(this.config.maxHistoryLength);
      
      // Format messages for API
      const messages = conversationContext.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      }));

      // Call LLM API
      const response = await this.callLLMAPI({
        messages,
        systemPrompt: this.config.systemPrompt
      });

      console.log(`[ConversationEngine] API returned text length: ${response.text.length} chars`);
      console.log(`[ConversationEngine] API response: "${response.text}"`);

      return {
        text: response.text || '',
        animationHint: response.animationHint || 'talking'
      };
    } catch (error) {
      console.error('[ConversationEngine] Error generating response:', error);
      
      // Return fallback response
      return {
        text: '抱歉，我现在有点困惑。请再说一遍？',
        animationHint: 'confused'
      };
    }
  }

  /**
   * Call LLM API with retry logic
   */
  async callLLMAPI(payload) {
    const maxRetries = 3;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // 从环境变量或 localStorage 获取API密钥
        let apiKey = import.meta.env.VITE_LLM_API_KEY;
        
        // 如果环境变量中没有，从 localStorage 读取
        if (!apiKey && typeof localStorage !== 'undefined') {
          apiKey = localStorage.getItem('VITE_LLM_API_KEY');
        }
        
        if (!apiKey) {
          throw new Error('LLM API key not configured. Please set VITE_LLM_API_KEY.');
        }

        // Determine which API to call based on provider
        let response;
        if (this.config.apiProvider === 'openai') {
          response = await this.callOpenAI(payload, apiKey);
        } else if (this.config.apiProvider === 'claude') {
          response = await this.callClaude(payload, apiKey);
        } else {
          throw new Error(`Unknown API provider: ${this.config.apiProvider}`);
        }

        return response;
      } catch (error) {
        lastError = error;
        console.warn(`[ConversationEngine] API call attempt ${attempt} failed:`, error.message);
        
        if (attempt < maxRetries) {
          // Exponential backoff
          const delay = Math.pow(2, attempt - 1) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  /**
   * Call OpenAI API
   */
  async callOpenAI(payload, apiKey) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: payload.systemPrompt },
          ...payload.messages
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.choices[0]?.message?.content || '';

    console.log(`[callOpenAI] Raw response length: ${text.length} chars`);

    return {
      text: text.trim(),
      animationHint: this.selectAnimationHint(text)
    };
  }

  /**
   * Call Claude API
   */
  async callClaude(payload, apiKey) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        system: payload.systemPrompt,
        messages: payload.messages
      })
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.content[0]?.text || '';

    console.log(`[callClaude] Raw response length: ${text.length} chars`);

    return {
      text: text.trim(),
      animationHint: this.selectAnimationHint(text)
    };
  }

  /**
   * Select animation hint based on response content
   */
  selectAnimationHint(text) {
    if (text.includes('？') || text.includes('?')) {
      return 'confused';
    }
    if (text.includes('！') || text.includes('!')) {
      return 'happy';
    }
    return 'talking';
  }

  /**
   * Get default system prompt for puppet personality
   */
  getDefaultSystemPrompt() {
    return `你是一个友好的AI机器人助手。你的名字是"小AI"。
你应该：
- 用详细、友好的方式回答问题
- 根据问题需要提供完整的回答，可以是多段落
- 尽量让对话有趣和互动
- 使用适当的表情符号`;
  }

  /**
   * Get conversation history
   */
  getConversationHistory() {
    return this.session ? this.session.conversationHistory : [];
  }

  /**
   * Clear conversation history
   */
  clearHistory() {
    if (this.session) {
      this.session.conversationHistory = [];
    }
  }

  /**
   * End session
   */
  endSession() {
    if (this.session) {
      this.session.endSession();
      console.log('[ConversationEngine] Session ended');
      this.emit('sessionEnded');
    }
  }

  /**
   * Event emitter methods
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[ConversationEngine] Error in event listener for '${event}':`, error);
        }
      });
    }
  }

  /**
   * Get session info
   */
  getSessionInfo() {
    return this.session ? this.session.toJSON() : null;
  }
}

export default ConversationEngine;
