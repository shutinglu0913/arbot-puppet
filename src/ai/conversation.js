/**
 * Conversation Engine - Manages chat state, message history, and LLM integration
 */

import { apiClient } from '../services/apiClient.js';

export default class ConversationEngine {
  constructor(config = {}) {
    this.config = {
      maxHistory: config.maxHistory || 10,
      systemPrompt: config.systemPrompt || '你是一个友好、有帮助的AI助手。',
      ...config
    };

    this.conversationHistory = [];
    this.isProcessing = false;
    this.listeners = {};
  }

  /**
   * Initialize conversation engine
   */
  async initialize(userId = null) {
    try {
      console.log('[ConversationEngine] Initializing...');
      this.conversationHistory = [];
      
      // Verify API Key is available
      const apiKey = this.getAPIKey();
      if (!apiKey) {
        console.warn('[ConversationEngine] API Key not found - using localStorage fallback');
      }
      
      this.emit('ready');
      return { success: true, message: 'Conversation engine initialized' };
    } catch (error) {
      console.error('[ConversationEngine] Initialization error:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Send user message and get AI response
   */
  async sendMessage(userMessage) {
    if (this.isProcessing) {
      console.warn('[ConversationEngine] Already processing a message');
      return null;
    }

    if (!userMessage.trim()) {
      console.warn('[ConversationEngine] Empty message');
      return null;
    }

    this.isProcessing = true;
    this.emit('processing', true);

    try {
      // Add user message to history
      this.conversationHistory.push({
        role: 'user',
        content: userMessage
      });

      // Trim history if too long
      if (this.conversationHistory.length > this.config.maxHistory) {
        this.conversationHistory = this.conversationHistory.slice(-this.config.maxHistory);
      }

      // Call OpenAI API
      const response = await this.callOpenAIAPI();

      // Add assistant response to history
      if (response) {
        this.conversationHistory.push({
          role: 'assistant',
          content: response
        });

        this.emit('messageReceived', {
          id: `msg-${Date.now()}`,
          sender: 'puppet',
          text: response,
          timestamp: Date.now(),
          type: 'text',
          metadata: { animationHint: 'talking' }
        });

        return response;
      }

      return null;

    } catch (error) {
      console.error('[ConversationEngine] Error:', error);
      this.emit('error', error.message);
      return null;
    } finally {
      this.isProcessing = false;
      this.emit('processing', false);
    }
  }

  /**
   * Call OpenAI API with retry logic
   */
  async callOpenAIAPI() {
    const apiKey = this.getAPIKey();
    if (!apiKey) {
      throw new Error('API Key not found. Please set VITE_LLM_API_KEY or use localStorage.');
    }

    const maxRetries = 3;
    let lastError = null;
    
    // 使用代理 URL（开发环境）或直接调用（生产环境）
    const isDev = import.meta.env.DEV;
    const apiUrl = isDev 
      ? '/api/openai/chat/completions'  // 本地代理
      : 'https://api.openai.com/v1/chat/completions';  // 生产环境

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[ConversationEngine] API Request attempt ${attempt}/${maxRetries}`);
        console.log(`[ConversationEngine] Using API URL: ${isDev ? 'proxy' : 'direct'}`);

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
              {
                role: 'system',
                content: this.config.systemPrompt
              },
              ...this.conversationHistory
            ],
            max_tokens: 1000,
            temperature: 0.7
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error?.message || 
            `HTTP ${response.status}: ${response.statusText}`
          );
        }

        const data = await response.json();

        if (!data.choices || !data.choices[0]) {
          throw new Error('Invalid API response: missing choices');
        }

        const assistantMessage = data.choices[0].message.content;
        console.log('[ConversationEngine] Response received:', assistantMessage.substring(0, 50) + '...');

        return assistantMessage;

      } catch (error) {
        lastError = error;
        console.warn(`[ConversationEngine] Attempt ${attempt} failed:`, error.message);

        if (attempt < maxRetries) {
          // Exponential backoff
          const delay = Math.pow(2, attempt - 1) * 1000;
          console.log(`[ConversationEngine] Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  /**
   * Get API Key from environment or localStorage
   */
  getAPIKey() {
    // Try environment variable first
    const envKey = import.meta.env.VITE_LLM_API_KEY;
    if (envKey) return envKey;

    // Try localStorage
    const storedKey = localStorage.getItem('openai_api_key');
    if (storedKey) return storedKey;

    return null;
  }

  /**
   * Get conversation history
   */
  getHistory() {
    return [...this.conversationHistory];
  }

  /**
   * Clear conversation history
   */
  clearHistory() {
    this.conversationHistory = [];
    this.emit('history-cleared');
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
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  emit(event, data) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(callback => callback(data));
  }

  /**
   * Cleanup
   */
  dispose() {
    this.listeners = {};
  }
}
