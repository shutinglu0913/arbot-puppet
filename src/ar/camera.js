/**
 * AR Camera Module - Initializes and manages 8thwall XR8 session
 * Handles camera permissions, video stream, and AR lifecycle
 */

import { UPDATE_STATE } from '../config/constants.js';

export class ARCamera {
  constructor(config = {}) {
    this.config = {
      requestedPermissions: ['camera'],
      ...config
    };
    this.session = null;
    this.isActive = false;
    this.listeners = {};
  }

  /**
   * Initialize AR session with 8thwall XR8
   */
  async initialize() {
    try {
      console.log('[ARCamera] Initializing XR8 session...');
      
      // Check if XR8 is loaded
      if (!window.XR8) {
        throw new Error('XR8 not loaded. Ensure 8thwall script is included in HTML.');
      }

      console.log('[ARCamera] XR8 detected, configuring session...');

      // Request camera permissions
      await this.requestCameraPermission();

      // Initialize XR8 with configuration
      this.session = window.XR8.XrController.configure({
        enableLighting: true,
        enableWorldTracking: true,
        allowMultipleDevices: true,
        requiredPermissions: this.config.requestedPermissions
      });

      // Setup event listeners
      this.setupEventListeners();

      // Start AR session
      await this.session.start();
      this.isActive = true;

      console.log('[ARCamera] AR session initialized successfully');
      this.emit('initialized');
      
      return {
        success: true,
        message: 'AR session initialized',
        session: this.session
      };
    } catch (error) {
      console.error('[ARCamera] Initialization error:', error);
      
      // 如果是模拟模式，继续运行
      if (window.XR8 && window.XR8._isMock) {
        console.log('[ARCamera] Using mock XR8 mode for development');
        this.session = window.XR8.XrController.configure({});
        await this.session.start();
        this.isActive = true;
        this.emit('initialized');
        return {
          success: true,
          message: 'AR session initialized (mock mode)',
          session: this.session
        };
      }

      this.emit('error', { type: 'initialization', error });
      return {
        success: false,
        message: error.message,
        error
      };
    }
  }

  /**
   * Request camera permissions from user
   */
  async requestCameraPermission() {
    try {
      // 在模拟模式下跳过
      if (window.XR8 && window.XR8._isMock) {
        console.log('[ARCamera] Mock mode: 跳过摄像头权限请求');
        return true;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true,
        audio: false 
      });
      
      // Stop the stream - we just wanted to request permission
      stream.getTracks().forEach(track => track.stop());
      
      console.log('[ARCamera] Camera permission granted');
      return true;
    } catch (error) {
      console.warn('[ARCamera] Camera permission denied or unavailable:', error.message);
      // 不中断流程，继续使用模拟模式
      return true;
    }
  }

  /**
   * Setup AR session event listeners
   */
  setupEventListeners() {
    if (!this.session) return;

    this.session.addEventListener('xrupdate', (event) => {
      this.emit('update', event);
    });

    this.session.addEventListener('xrloaded', () => {
      console.log('[ARCamera] XR8 loaded');
      this.emit('loaded');
    });

    this.session.addEventListener('xrerror', (error) => {
      console.error('[ARCamera] XR8 error:', error);
      this.emit('error', error);
    });
  }

  /**
   * Get current camera pose/transform
   */
  getCameraPose() {
    if (!this.session) return null;
    return this.session.getPose ? this.session.getPose() : null;
  }

  /**
   * Pause AR session
   */
  async pause() {
    if (this.session && this.session.pause) {
      await this.session.pause();
      this.isActive = false;
      this.emit('paused');
    }
  }

  /**
   * Resume AR session
   */
  async resume() {
    if (this.session && this.session.resume) {
      await this.session.resume();
      this.isActive = true;
      this.emit('resumed');
    }
  }

  /**
   * Destroy AR session and cleanup
   */
  async dispose() {
    if (this.session && this.session.stop) {
      await this.session.stop();
    }
    this.session = null;
    this.isActive = false;
    this.listeners = {};
    console.log('[ARCamera] AR session disposed');
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
          console.error(`[ARCamera] Error in event listener for '${event}':`, error);
        }
      });
    }
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      isActive: this.isActive,
      hasSession: this.session !== null,
      sessionInfo: this.session ? {
        state: this.session.state,
        lighting: this.session.lighting
      } : null
    };
  }
}

export default ARCamera;
