/**
 * Main Application Entry Point
 * Orchestrates AR session, 3D puppet, conversation engine, and UI
 */

import * as THREE from 'three';
import ARCamera from './ar/camera.js';
import PuppetModel from './3d/puppet.js';
import ConversationEngine from './ai/conversation.js';
import UIManager from './ui/interface.js';
import globalState, { StateManager } from './state/index.js';
import { DEFAULT_CONFIG, SCENE_CONFIG, ENV } from './config/constants.js';
import { apiClient } from './services/apiClient.js';

class ARPuppetApp {
  constructor(config = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config
    };

    this.arCamera = null;
    this.puppetModel = null;
    this.conversationEngine = null;
    this.uiManager = null;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.animationFrameId = null;
    this.arCameraAvailable = false;
    this.videoBackground = null;

    this.log('Initializing AR Puppet App...');
  }

  /**
   * Initialize entire application
   */
  async initialize() {
    try {
      this.log('Starting initialization...');

      // 1. Initialize UI (show progress)
      await this.initializeUI();
      this.updateStatus('初始化AR会话...', 'info');

      // 2. Initialize AR Camera (disabled)
      await this.initializeARCamera();
      this.updateStatus('加载3D模型...', 'info');

      // 3. Initialize Three.js Scene
      this.initializeScene();

      // 4. Load Puppet Model
      await this.initializePuppet();
      this.updateStatus('初始化对话引擎...', 'info');

      // 5. Initialize Conversation Engine
      await this.initializeConversation();

      // 6. Setup event listeners and start rendering
      this.setupEventListeners();
      this.startRenderLoop();

      this.updateStatus('已准备就绪 ✓', 'success');
      globalState.setState({ arSessionActive: true });

      this.log('Initialization complete!');
      return true;
    } catch (error) {
      console.error('[ARPuppetApp] Initialization failed:', error);
      this.updateStatus(`初始化失败: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * Initialize UI Manager
   */
  async initializeUI() {
    this.uiManager = new UIManager();
    this.uiManager.initialize();
    this.uiManager.setStatus('Initializing...', 'info');

    // 自动显示欢迎语和功能介绍
    setTimeout(() => {
      this.uiManager.showRobotDialogue('Welcome! I am your AR assistant.');
      setTimeout(() => {
        this.uiManager.showRobotDialogue('You can chat with me, ask questions, or use the voice button below!');
      }, 2500);
    }, 600);

    this.uiManager.on('sendMessage', (text) => {
      this.handleUserMessage(text);
    });

    this.uiManager.on('voiceInput', (text) => {
      this.handleUserMessage(text);
    });
  }

  /**
   * Initialize AR Camera
   */
  async initializeARCamera() {
    // 暂时禁用AR相机功能，直接使用普通模式
    console.log('[ARPuppetApp] AR Camera disabled, using standard mode');
    this.arCameraAvailable = false;
    
    // 创建一个简单的占位对象
    this.arCamera = {
      on: () => {},
      pause: () => {},
      resume: () => {},
      dispose: () => Promise.resolve()
    };
    
    return;
    
    /* AR相机代码已禁用
    this.arCamera = new ARCamera();

    const result = await this.arCamera.initialize();
    if (!result.success) {
      console.warn('[ARPuppetApp] AR Camera initialization failed, using fallback mode');
      this.arCameraAvailable = false;
      return;
    }

    this.arCameraAvailable = true;

    this.arCamera.on('initialized', () => {
      this.log('AR Camera initialized');
      this.enableARBackground();
    });

    this.arCamera.on('error', (error) => {
      console.error('[ARPuppetApp] AR Camera error:', error);
      this.disableARBackground();
    });
    */
  }

  /**
   * Initialize Three.js Scene
   */
  initializeScene() {
    // Get or create container
    let container = document.getElementById('ar-canvas');
    
    if (!container) {
      container = document.createElement('canvas');
      container.id = 'ar-canvas';
      container.style.position = 'fixed';
      container.style.top = '0';
      container.style.left = '0';
      container.style.width = '100%';
      container.style.height = '100%';
      container.style.zIndex = '1';
      document.body.insertBefore(container, document.body.firstChild);
    }

    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(SCENE_CONFIG.backgroundColor);
    this.scene.fog = new THREE.Fog(SCENE_CONFIG.backgroundColor, 100, 1000);

    // Create camera
    this.camera = new THREE.PerspectiveCamera(
      SCENE_CONFIG.cameraFOV,
      window.innerWidth / window.innerHeight,
      SCENE_CONFIG.cameraNear,
      SCENE_CONFIG.cameraFar
    );
    this.camera.position.z = 3;

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      canvas: container instanceof HTMLCanvasElement ? container : undefined
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;

    if (!(container instanceof HTMLCanvasElement)) {
      container.appendChild(this.renderer.domElement);
    }

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(directionalLight);

    // Add ground plane (可选)
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.ShadowMaterial({ opacity: 0.3 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -2;
    ground.receiveShadow = true;
    // this.scene.add(ground);

    this.log('Three.js scene initialized');
  }

  /**
   * Initialize Puppet Model
   */
  async initializePuppet() {
    this.puppetModel = new PuppetModel({
      modelUrl: this.config.puppetModelUrl || '/models/puppet.gltf'
    });

    const result = await this.puppetModel.initialize(this.scene);
    if (!result.success) {
      console.warn('[ARPuppetApp] Puppet model initialization had issues, but continuing with placeholder');
    }

    this.puppetModel.on('animationStart', (animationName) => {
      globalState.setState({ puppetAnimationState: animationName });
    });

    globalState.setState({ puppetLoaded: true });
    this.log('Puppet model loaded');
  }

  /**
   * Initialize Conversation Engine
   */
  async initializeConversation() {
    this.conversationEngine = new ConversationEngine({
      apiProvider: this.config.apiProvider,
      maxHistoryLength: this.config.maxConversationHistory
    });

    const result = await this.conversationEngine.initialize(
      globalState.getState().userId
    );

    if (!result.success) {
      throw new Error(`Conversation engine initialization failed: ${result.message}`);
    }

    this.conversationEngine.on('messageReceived', (message) => {
      this.uiManager.addMessage(message);
      globalState.setState({ 
        messageCount: globalState.getState().messageCount + 1,
        lastMessageTime: Date.now()
      });

      if (message.sender === 'puppet') {
        // Play animation based on message
        const animationHint = message.metadata?.animationHint || 'talking';
        this.puppetModel.playAnimation(animationHint);
      }
    });

    this.conversationEngine.on('error', (error) => {
      console.error('[ARPuppetApp] Conversation error:', error);
      this.updateStatus('对话发生错误', 'error');
    });

    globalState.setState({ conversationActive: true });
    this.log('Conversation engine initialized');
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Window resize
    window.addEventListener('resize', () => this.onWindowResize());

    // Visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.arCamera.pause();
      } else {
        this.arCamera.resume();
      }
    });

    // AR updates
    this.arCamera.on('update', (event) => {
      // Update camera pose and puppet position if needed
    });
  }

  /**
   * Handle user message
   */
  async handleUserMessage(text) {
    if (!this.conversationEngine || !this.puppetModel) {
      console.warn('[ARPuppetApp] Application not ready for messages');
      return;
    }

    // 立即显示用户消息
    this.uiManager.addMessage({
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: text,
      timestamp: Date.now(),
      type: 'text'
    });

    this.uiManager.setInputEnabled(false);
    this.updateStatus('处理中...', 'info');

    try {
      const response = await this.conversationEngine.sendMessage(text);

      if (!response) {
        this.updateStatus('消息处理失败', 'error');
      } else {
        this.updateStatus('已准备就绪', 'success');
      }
    } catch (error) {
      console.error('[ARPuppetApp] Error processing message:', error);
      this.updateStatus('发生错误', 'error');
    } finally {
      this.uiManager.setInputEnabled(true);
    }
  }

  /**
   * Start render loop
   */
  startRenderLoop() {
    const clock = new THREE.Clock();

    const animate = () => {
      this.animationFrameId = requestAnimationFrame(animate);

      const deltaTime = clock.getDelta();

      // Update puppet
      if (this.puppetModel) {
        this.puppetModel.update(deltaTime);
      }

      // Render scene
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    };

    animate();
    this.log('Render loop started');
  }

  /**
   * Handle window resize
   */
  onWindowResize() {
    if (!this.camera || !this.renderer) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  /**
   * Enable AR background (transparent to show camera)
   */
  enableARBackground() {
    if (!this.scene || !this.renderer) return;
    
    console.log('[ARPuppetApp] Enabling AR background');
    this.scene.background = null; // 透明背景
    this.renderer.setClearColor(0x000000, 0); // 完全透明
    
    // 添加视频背景
    this.createVideoBackground();
    
    this.updateStatus('AR模式已启用 📷', 'success');
  }

  /**
   * Disable AR background (use sky blue)
   */
  disableARBackground() {
    if (!this.scene || !this.renderer) return;
    
    console.log('[ARPuppetApp] Disabling AR background, using fallback');
    this.scene.background = new THREE.Color(SCENE_CONFIG.backgroundColor);
    this.renderer.setClearColor(SCENE_CONFIG.backgroundColor, 1);
    
    // 移除视频背景
    if (this.videoBackground) {
      this.scene.remove(this.videoBackground);
      this.videoBackground = null;
    }
  }

  /**
   * Create video background from camera stream
   */
  async createVideoBackground() {
    try {
      // 尝试获取摄像头流
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' },
        audio: false 
      });
      
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();
      
      const videoTexture = new THREE.VideoTexture(video);
      videoTexture.minFilter = THREE.LinearFilter;
      videoTexture.magFilter = THREE.LinearFilter;
      
      const videoMaterial = new THREE.MeshBasicMaterial({ 
        map: videoTexture,
        side: THREE.DoubleSide
      });
      
      const videoGeometry = new THREE.PlaneGeometry(16, 9);
      this.videoBackground = new THREE.Mesh(videoGeometry, videoMaterial);
      this.videoBackground.position.z = -5;
      this.scene.add(this.videoBackground);
      
      console.log('[ARPuppetApp] Video background created');
    } catch (error) {
      console.warn('[ARPuppetApp] Failed to create video background:', error.message);
      this.disableARBackground();
    }
  }

  /**
   * Update status message in UI
   */
  updateStatus(message, type = 'info') {
    if (this.uiManager) {
      this.uiManager.setStatus(message, type);
    }
    globalState.setState({ statusMessage: message, statusType: type });
  }

  /**
   * Logging utility
   */
  log(message) {
    if (ENV.isDevelopment) {
      console.log(`[ARPuppetApp] ${message}`);
    }
  }

  /**
   * Dispose and cleanup
   */
  async dispose() {
    console.log('[ARPuppetApp] Disposing application...');

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    if (this.puppetModel) {
      this.puppetModel.dispose();
    }

    if (this.arCamera) {
      await this.arCamera.dispose();
    }

    if (this.renderer) {
      this.renderer.dispose();
    }

    if (this.conversationEngine) {
      this.conversationEngine.endSession();
    }

    if (this.uiManager) {
      this.uiManager.dispose();
    }

    globalState.setState({ arSessionActive: false });
  }
}

// Global app instance
let app = null;

/**
 * Initialize app on page load
 */
document.addEventListener('DOMContentLoaded', async () => {
  app = new ARPuppetApp();
  const success = await app.initialize();

  if (!success) {
    console.error('Failed to initialize AR Puppet App');
  }
});

/**
 * Cleanup on page unload
 */
window.addEventListener('beforeunload', async () => {
  if (app) {
    await app.dispose();
  }
});

export default ARPuppetApp;
