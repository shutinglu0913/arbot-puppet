/**
 * Application State Management
 * Simple observable state container with reactive updates
 */

class StateManager {
  constructor(initialState = {}) {
    this.state = initialState;
    this.subscribers = [];
    this.history = [{ ...this.state, timestamp: Date.now() }];
  }

  /**
   * Get current state
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Update state with partial updates
   */
  setState(updates) {
    const oldState = { ...this.state };
    this.state = { ...this.state, ...updates };

    // Add to history
    this.history.push({
      ...this.state,
      timestamp: Date.now(),
      changes: updates
    });

    // Notify subscribers
    this.notifySubscribers(oldState, this.state, updates);

    return this.state;
  }

  /**
   * Subscribe to state changes
   */
  subscribe(callback) {
    this.subscribers.push(callback);

    // Return unsubscribe function
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== callback);
    };
  }

  /**
   * Notify all subscribers
   */
  notifySubscribers(oldState, newState, changes) {
    this.subscribers.forEach(callback => {
      try {
        callback({
          oldState,
          newState,
          changes
        });
      } catch (error) {
        console.error('[StateManager] Error in subscriber callback:', error);
      }
    });
  }

  /**
   * Get state history
   */
  getHistory(limit = 10) {
    return this.history.slice(-limit);
  }

  /**
   * Reset state to initial
   */
  reset(initialState) {
    this.state = initialState;
    this.history = [{ ...this.state, timestamp: Date.now() }];
    this.notifySubscribers({}, this.state, this.state);
  }

  /**
   * Log current state
   */
  log() {
    console.log('[StateManager] Current state:', this.state);
  }
}

// Create global state instance
export const globalState = new StateManager({
  // AR & Session
  arSessionActive: false,
  userId: '',
  sessionId: null,

  // UI
  isLoading: false,
  loadingMessage: '',
  statusMessage: 'Initializing...',
  statusType: 'info', // info, success, warning, error, listening

  // Puppet
  puppetLoaded: false,
  puppetAnimationState: 'idle',
  puppetPosition: { x: 0, y: -0.5, z: -2 },

  // Conversation
  conversationActive: false,
  messageCount: 0,
  lastMessageTime: null,

  // Errors
  errors: [],
  lastError: null
});

export { StateManager };
export default globalState;
