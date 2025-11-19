/**
 * UI Manager - Handles chat interface, message display, and input handling
 */

export class UIManager {
  constructor(config = {}) {
    this.config = {
      containerId: config.containerId || 'app',
      chatHistoryId: config.chatHistoryId || 'chat-history',
      messageInputId: config.messageInputId || 'message-input',
      sendButtonId: config.sendButtonId || 'send-button',
      statusIndicatorId: config.statusIndicatorId || 'status',
      ...config
    };

    this.container = null;
    this.chatHistory = null;
    this.messageInput = null;
    this.sendButton = null;
    this.statusIndicator = null;
    this.chatFab = null;
    this.chatContainer = null;
    this.chatCloseBtn = null;
    this.robotDialogue = null;
    this.listeners = {};
    this.isListening = false;
    this.dialogueTimeout = null;
    this.lastSentMessage = null;
    this.lastSentMessageElement = null;
    this.lastSentTextElement = null;
  }

  /**
   * Initialize UI components
   */
  initialize() {
    try {
      console.log('[UIManager] Initializing UI...');

      // Get DOM elements
      this.container = document.getElementById(this.config.containerId);
      this.chatHistory = document.getElementById(this.config.chatHistoryId);
      this.messageInput = document.getElementById(this.config.messageInputId);
      this.sendButton = document.getElementById(this.config.sendButtonId);
      this.statusIndicator = document.getElementById(this.config.statusIndicatorId);
      
      // New UI elements
      this.chatFab = document.getElementById('chat-fab');
      this.chatContainer = document.getElementById('chat-container');
      this.chatCloseBtn = document.getElementById('chat-close-btn');
      this.robotDialogue = document.getElementById('robot-dialogue');
      this.lastSentMessageElement = document.getElementById('last-sent-message');
      this.lastSentTextElement = document.getElementById('last-sent-text');

      // Attach event listeners
      this.attachEventListeners();

      console.log('[UIManager] UI initialized');
      return true;
    } catch (error) {
      console.error('[UIManager] Initialization error:', error);
      return false;
    }
  }

  /**
   * Attach event listeners to UI elements
   */
  attachEventListeners() {
    // 聊天浮标按钮
    if (this.chatFab) {
      this.chatFab.addEventListener('click', () => {
        this.openChatPanel();
      });
    }

    // 关闭按钮
    if (this.chatCloseBtn) {
      this.chatCloseBtn.addEventListener('click', () => {
        this.closeChatPanel();
      });
    }

    // 发送消息按钮
    if (this.sendButton) {
      this.sendButton.addEventListener('click', () => {
        const text = this.getMessageInput();
        if (text.trim()) {
          this.updateLastSentMessage(text);
          this.emit('sendMessage', text);
          this.clearMessageInput();
        }
      });
    }

    // 输入框回车发送
    if (this.messageInput) {
      this.messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          const text = this.getMessageInput();
          if (text.trim()) {
            this.updateLastSentMessage(text);
            this.emit('sendMessage', text);
            this.clearMessageInput();
          }
        }
      });
    }

    // 语音按钮
    const voiceBtn = document.getElementById('voice-button');
    if (voiceBtn) {
      voiceBtn.addEventListener('click', () => {
        this.startVoiceRecognition();
      });
    }
  }

  /**
   * 打开聊天面板
   */
  openChatPanel() {
    if (this.chatContainer) {
      this.chatContainer.classList.add('open');
    }
    if (this.chatFab) {
      this.chatFab.classList.add('open');
    }
    if (this.messageInput) {
      this.messageInput.focus();
    }
  }

  /**
   * 关闭聊天面板
   */
  closeChatPanel() {
    console.log('[UIManager] Closing chat panel');
    if (this.chatContainer) {
      this.chatContainer.classList.remove('open');
      console.log('[UIManager] Chat container classes:', this.chatContainer.className);
    }
    if (this.chatFab) {
      this.chatFab.classList.remove('open');
    }
  }

  /**
   * Add message to chat history
   */
  addMessage(message) {
    if (!this.chatHistory) return;

    const messageEl = document.createElement('div');
    messageEl.className = `message message-${message.sender}`;
    messageEl.innerHTML = `
      <div class="message-content">
        <span class="message-sender">${message.sender === 'user' ? 'You' : 'Robot'}</span>
        <p class="message-text">${this.escapeHtml(message.text)}</p>
        <span class="message-time">${this.formatTime(message.timestamp)}</span>
      </div>
    `;

    this.chatHistory.appendChild(messageEl);
    this.scrollToBottom();
    
    // 如果是机器人消息，在头顶显示对话框
    if (message.sender === 'puppet') {
      this.showRobotDialogue(message.text);
    }
  }

  /**
   * 在机器人头顶显示对话框（显示全部文本）
   */
  showRobotDialogue(text) {
    if (!this.robotDialogue) return;

    console.log(`[UIManager] showRobotDialogue - Text length: ${text.length} chars`);
    console.log(`[UIManager] Text content: "${text}"`);

    const contentDiv = this.robotDialogue.querySelector('.robot-dialogue-content');
    if (contentDiv) {
      contentDiv.textContent = text;
      console.log(`[UIManager] Displayed in bubble - Length: ${contentDiv.textContent.length} chars`);
    }

    this.robotDialogue.style.display = 'block';
  }

  /**
   * Update status indicator
   */
  setStatus(text, type = 'info') {
    if (!this.statusIndicator) return;

    const statusText = this.statusIndicator.querySelector('.status-text');
    const statusDot = this.statusIndicator.querySelector('.status-dot');

    if (statusText) statusText.textContent = text;
    if (statusDot) {
      statusDot.className = `status-dot status-${type}`;
    }

    this.statusIndicator.className = `status-indicator status-${type}`;
  }

  /**
   * Enable/disable input
   */
  setInputEnabled(enabled = true) {
    if (this.messageInput) {
      this.messageInput.disabled = !enabled;
    }
    if (this.sendButton) {
      this.sendButton.disabled = !enabled;
    }
  }

  /**
   * Get message input value
   */
  getMessageInput() {
    return this.messageInput ? this.messageInput.value : '';
  }

  /**
   * Clear message input
   */
  clearMessageInput() {
    if (this.messageInput) {
      this.messageInput.value = '';
    }
  }

  /**
   * Start voice recognition
   */
  startVoiceRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Your browser does not support voice recognition');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.language = 'zh-CN';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      console.log('[UIManager] Voice recognition started');
      this.setStatus('Listening...', 'listening');
    };

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join('');

      console.log('[UIManager] Voice input:', transcript);
      if (transcript.trim()) {
        this.emit('voiceInput', transcript);
      }
    };

    recognition.onerror = (event) => {
      console.error('[UIManager] Voice recognition error:', event.error);
      this.setStatus('Voice recognition error', 'error');
    };

    recognition.onend = () => {
      console.log('[UIManager] Voice recognition ended');
      this.setStatus('Ready', 'ready');
    };

    recognition.start();
  }

  /**
   * Scroll chat history to bottom
   */
  scrollToBottom() {
    if (this.chatHistory) {
      this.chatHistory.scrollTop = this.chatHistory.scrollHeight;
    }
  }

  /**
   * Format timestamp to readable time
   */
  formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }

  /**
   * Escape HTML special characters
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Clear chat history
   */
  clearChatHistory() {
    if (this.chatHistory) {
      this.chatHistory.innerHTML = '';
    }
  }

  /**
   * Update last sent message display
   */
  updateLastSentMessage(text) {
    this.lastSentMessage = text;
    
    if (this.lastSentTextElement) {
      this.lastSentTextElement.textContent = text;
    }
    
    if (this.lastSentMessageElement) {
      this.lastSentMessageElement.style.display = 'flex';
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
          console.error(`[UIManager] Error in event listener for '${event}':`, error);
        }
      });
    }
  }

  /**
   * Dispose UI
   */
  dispose() {
    this.listeners = {};
    if (this.dialogueTimeout) {
      clearTimeout(this.dialogueTimeout);
    }
    console.log('[UIManager] UI disposed');
  }
}

export default UIManager;
