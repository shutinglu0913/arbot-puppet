/**
 * 3D Puppet Module - Loads and manages 3D robot model using Three.js
 * Handles animations, positioning, and rendering in AR space
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Puppet } from '../schema/puppet.js';

export class PuppetModel {
  constructor(config = {}) {
    this.config = {
      modelUrl: config.modelUrl || '/models/puppet.gltf',
      position: config.position || { x: 0, y: -0.5, z: -2 },
      scale: config.scale || 1,
      ...config
    };
    
    this.scene = null;
    this.model = null;
    this.mixer = null;
    this.animations = {};
    this.currentAnimation = null;
    this.schema = new Puppet(this.config);
    this.listeners = {};
  }

  /**
   * Initialize puppet model in scene
   */
  async initialize(scene) {
    try {
      console.log('[PuppetModel] Initializing puppet...');
      this.scene = scene;

      // Load 3D model
      await this.loadModel();

      // Setup animations
      this.setupAnimations();

      // Play greeting animation
      await this.playAnimation('greeting');

      console.log('[PuppetModel] Puppet initialized successfully');
      this.emit('initialized');

      return {
        success: true,
        message: 'Puppet model loaded',
        model: this.model
      };
    } catch (error) {
      console.error('[PuppetModel] Initialization error:', error);
      this.emit('error', error);
      return {
        success: false,
        message: error.message,
        error
      };
    }
  }

  /**
   * Load 3D model using GLTFLoader or create a simple placeholder
   */
  async loadModel() {
    return new Promise((resolve, reject) => {
      const loader = new GLTFLoader();
      
      // 首先尝试加载GLTF文件
      loader.load(
        this.config.modelUrl,
        (gltf) => {
          this.model = gltf.scene;
          this.setupLoadedModel(gltf);
          resolve(this.model);
        },
        (progress) => {
          const percentComplete = (progress.loaded / progress.total) * 100;
          console.log('[PuppetModel] Loading progress:', percentComplete + '%');
          this.emit('loadProgress', percentComplete);
        },
        (error) => {
          console.warn('[PuppetModel] GLTF模型加载失败，使用简单3D模型代替:', error.message);
          // 加载失败，使用简单的Three.js几何体
          this.createSimpleModel();
          resolve(this.model);
        }
      );
    });
  }

  /**
   * 设置加载的模型
   */
  setupLoadedModel(gltf) {
    // Apply initial positioning
    this.updatePosition(
      this.config.position.x,
      this.config.position.y,
      this.config.position.z
    );
    this.updateScale(this.config.scale);

    // Setup animation mixer
    if (gltf.animations.length > 0) {
      this.mixer = new THREE.AnimationMixer(this.model);
    }

    // Add to scene
    this.scene.add(this.model);

    console.log('[PuppetModel] Model loaded:', this.config.modelUrl);
  }

  /**
   * 创建简单的3D模型作为占位符
   */
  createSimpleModel() {
    // 创建一个简单的机器人外形（立方体头部 + 圆柱体身体）
    const group = new THREE.Group();

    // 身体（圆柱体）
    const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.8, 32);
    const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0x4CAF50 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0;
    group.add(body);

    // 头部（立方体）
    const headGeometry = new THREE.BoxGeometry(0.4, 0.5, 0.4);
    const headMaterial = new THREE.MeshPhongMaterial({ color: 0x2196F3 });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 0.7;
    group.add(head);

    // 左眼
    const eyeGeometry = new THREE.SphereGeometry(0.08, 16, 16);
    const eyeMaterial = new THREE.MeshPhongMaterial({ color: 0xFFFFFF });
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.12, 0.85, 0.15);
    group.add(leftEye);

    // 右眼
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.12, 0.85, 0.15);
    group.add(rightEye);

    // 左眼瞳孔
    const pupilGeometry = new THREE.SphereGeometry(0.04, 16, 16);
    const pupilMaterial = new THREE.MeshPhongMaterial({ color: 0x000000 });
    const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
    leftPupil.position.set(-0.12, 0.85, 0.22);
    group.add(leftPupil);

    // 右眼瞳孔
    const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
    rightPupil.position.set(0.12, 0.85, 0.22);
    group.add(rightPupil);

    // 嘴巴（简单的线条）
    const mouthGeometry = new THREE.BoxGeometry(0.2, 0.05, 0.02);
    const mouthMaterial = new THREE.MeshPhongMaterial({ color: 0x000000 });
    const mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
    mouth.position.set(0, 0.6, 0.2);
    group.add(mouth);

    // 左手臂
    const armGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.6, 16);
    const armMaterial = new THREE.MeshPhongMaterial({ color: 0x4CAF50 });
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.45, 0.3, 0);
    leftArm.rotation.z = Math.PI / 6;
    group.add(leftArm);

    // 右手臂
    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.45, 0.3, 0);
    rightArm.rotation.z = -Math.PI / 6;
    group.add(rightArm);

    // 应用初始位置和缩放
    this.model = group;
    this.updatePosition(
      this.config.position.x,
      this.config.position.y,
      this.config.position.z
    );
    this.updateScale(this.config.scale);

    // 添加到场景
    this.scene.add(this.model);

    console.log('[PuppetModel] Simple 3D model created as placeholder');
  }

  /**
   * Setup available animations from loaded model
   */
  setupAnimations() {
    if (!this.mixer) {
      console.warn('[PuppetModel] No animations found in model');
      return;
    }

    // This would typically be set up based on the actual model's animations
    // For now, we create placeholder animation tracks
    const animationNames = [
      'idle', 'greeting', 'talking', 'listening', 'happy', 'confused'
    ];

    animationNames.forEach(name => {
      this.animations[name] = null;
    });

    console.log('[PuppetModel] Animations setup:', Object.keys(this.animations));
  }

  /**
   * Play animation by name
   */
  async playAnimation(animationName, options = {}) {
    const {
      loop = THREE.LoopRepeat,
      duration = 1000,
      onComplete = null
    } = options;

    if (!this.mixer || !this.model) {
      console.warn('[PuppetModel] Cannot play animation: mixer or model not ready');
      return false;
    }

    try {
      // Stop current animation
      if (this.currentAnimation) {
        this.currentAnimation.stop();
      }

      // Get animation from model
      const clip = THREE.AnimationClip.findByName(this.model.animations, animationName);
      
      if (!clip) {
        console.warn(`[PuppetModel] Animation not found: ${animationName}`);
        // Create placeholder animation
        this.currentAnimation = null;
        return false;
      }

      // Create and play action
      const action = this.mixer.clipAction(clip);
      action.loop = loop;
      action.reset();
      action.play();

      this.currentAnimation = action;
      this.schema.setAnimationState(animationName, true);

      // Schedule completion callback
      if (onComplete) {
        setTimeout(onComplete, duration);
      }

      console.log('[PuppetModel] Playing animation:', animationName);
      this.emit('animationStart', animationName);

      return true;
    } catch (error) {
      console.error('[PuppetModel] Error playing animation:', error);
      return false;
    }
  }

  /**
   * Stop current animation
   */
  stopAnimation() {
    if (this.currentAnimation) {
      this.currentAnimation.stop();
      this.currentAnimation = null;
      this.emit('animationStop');
      return true;
    }
    return false;
  }

  /**
   * Update puppet position in AR space
   */
  updatePosition(x, y, z) {
    if (!this.model) return;
    this.model.position.set(x, y, z);
    this.schema.updatePosition(x, y, z);
  }

  /**
   * Update puppet scale
   */
  updateScale(scale) {
    if (!this.model) return;
    const newScale = Math.max(0.1, scale);
    this.model.scale.set(newScale, newScale, newScale);
    this.schema.updateScale(newScale);
  }

  /**
   * Update puppet rotation
   */
  updateRotation(x, y, z) {
    if (!this.model) return;
    this.model.rotation.order = 'YXZ';
    this.model.rotation.set(x, y, z);
  }

  /**
   * Frame update - animate mixer
   */
  update(deltaTime) {
    if (this.mixer) {
      this.mixer.update(deltaTime);
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
          console.error(`[PuppetModel] Error in event listener for '${event}':`, error);
        }
      });
    }
  }

  /**
   * Cleanup and dispose
   */
  dispose() {
    if (this.mixer) {
      this.mixer.stopAllAction();
    }
    if (this.model && this.scene) {
      this.scene.remove(this.model);
    }
    this.model = null;
    this.mixer = null;
    this.listeners = {};
    console.log('[PuppetModel] Puppet disposed');
  }

  /**
   * Get puppet schema
   */
  getSchema() {
    return this.schema;
  }
}

export default PuppetModel;
