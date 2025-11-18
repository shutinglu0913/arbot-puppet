/**
 * API Client Service - Abstracts all external API calls
 * Handles OpenAI, Claude, and other LLM providers
 */

import { API_CONFIG, ENV } from '../config/constants.js';

export class APIClient {
  constructor(config = {}) {
    this.config = {
      provider: config.provider || import.meta.env.VITE_API_PROVIDER || 'openai',
      apiKey: config.apiKey || import.meta.env.VITE_LLM_API_KEY,
      timeout: config.timeout || 30000,
      retries: config.retries || 3,
      ...config
    };

    if (!this.config.apiKey) {
      console.warn('[APIClient] No API key configured');
    }
  }

  /**
   * Send message to LLM API
   */
  async sendMessage(messages, options = {}) {
    try {
      const {
        systemPrompt = '',
        temperature = 0.7,
        maxTokens = 150
      } = options;

      // Format messages for API
      const formattedMessages = [
        { role: 'system', content: systemPrompt },
        ...messages
      ];

      let response;
      if (this.config.provider === 'openai') {
        response = await this.callOpenAI(formattedMessages, { temperature, maxTokens });
      } else if (this.config.provider === 'claude') {
        response = await this.callClaude(formattedMessages.slice(1), {
          systemPrompt,
          temperature,
          maxTokens
        });
      } else {
        throw new Error(`Unknown API provider: ${this.config.provider}`);
      }

      return response;
    } catch (error) {
      console.error('[APIClient] Error sending message:', error);
      throw error;
    }
  }

  /**
   * Call OpenAI API with retry logic
   */
  async callOpenAI(messages, options = {}) {
    const { temperature, maxTokens } = options;
    const config = API_CONFIG.openai;

    const makeRequest = async () => {
      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          model: config.model,
          messages: messages,
          temperature: temperature || config.temperature,
          max_tokens: maxTokens || config.maxTokens
        }),
        signal: this.getAbortSignal()
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const text = data.choices[0]?.message?.content || '';

      return {
        success: true,
        text: text.trim(),
        provider: 'openai',
        usage: data.usage || {}
      };
    };

    return this.withRetry(makeRequest);
  }

  /**
   * Call Claude API with retry logic
   */
  async callClaude(messages, options = {}) {
    const { systemPrompt, temperature, maxTokens } = options;
    const config = API_CONFIG.claude;

    const makeRequest = async () => {
      const response = await fetch(`${config.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': config.version
        },
        body: JSON.stringify({
          model: config.model,
          max_tokens: maxTokens || config.maxTokens,
          system: systemPrompt,
          messages: messages,
          temperature: temperature || 0.7
        }),
        signal: this.getAbortSignal()
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Claude API error: ${error.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const text = data.content[0]?.text || '';

      return {
        success: true,
        text: text.trim(),
        provider: 'claude',
        usage: data.usage || {}
      };
    };

    return this.withRetry(makeRequest);
  }

  /**
   * Retry logic with exponential backoff
   */
  async withRetry(fn, attempt = 1) {
    try {
      return await fn();
    } catch (error) {
      if (attempt < this.config.retries) {
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.log(`[APIClient] Retry attempt ${attempt}/${this.config.retries} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.withRetry(fn, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Get abort signal for timeout
   */
  getAbortSignal() {
    return AbortSignal.timeout(this.config.timeout);
  }

  /**
   * Check API connectivity
   */
  async checkConnectivity() {
    try {
      console.log('[APIClient] Checking API connectivity...');

      const messages = [
        { role: 'user', content: 'ping' }
      ];

      const response = await this.sendMessage(messages, {
        maxTokens: 10
      });

      return {
        success: true,
        provider: this.config.provider,
        message: 'API is reachable'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        provider: this.config.provider
      };
    }
  }

  /**
   * Set API key
   */
  setAPIKey(apiKey) {
    this.config.apiKey = apiKey;
  }

  /**
   * Set API provider
   */
  setProvider(provider) {
    if (['openai', 'claude'].includes(provider)) {
      this.config.provider = provider;
      return true;
    }
    return false;
  }
}

// Create singleton instance
export const apiClient = new APIClient();

export default apiClient;
