/**
 * Project Configuration and Constants
 */

// API Configuration
export const API_CONFIG = {
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-3.5-turbo',
    maxTokens: 150,
    temperature: 0.7
  },
  claude: {
    baseUrl: 'https://api.anthropic.com/v1',
    model: 'claude-3-haiku-20240307',
    maxTokens: 150,
    version: '2023-06-01'
  }
};

// 8thwall Configuration
export const XRWALL_CONFIG = {
  enableLighting: true,
  enableWorldTracking: true,
  allowMultipleDevices: false,
  requiredPermissions: ['camera']
};

// 3D Scene Configuration
export const SCENE_CONFIG = {
  backgroundColor: 0x1a1a1a,
  cameraFOV: 75,
  cameraNear: 0.1,
  cameraFar: 1000,
  defaultPuppetPosition: { x: 0, y: 0, z: 0 },
  defaultPuppetScale: 1
};

// Animation Configuration
export const ANIMATION_CONFIG = {
  defaultDuration: 1000,
  transitionDuration: 300,
  animationStates: [
    'idle',
    'greeting',
    'talking',
    'listening',
    'happy',
    'confused'
  ]
};

// State Update Events
export const UPDATE_STATE = {
  AR_SESSION_START: 'ar:sessionStart',
  AR_SESSION_END: 'ar:sessionEnd',
  PUPPET_LOADED: 'puppet:loaded',
  PUPPET_ANIMATION: 'puppet:animation',
  MESSAGE_RECEIVED: 'message:received',
  MESSAGE_SENT: 'message:sent',
  SESSION_ACTIVE: 'session:active',
  SESSION_ENDED: 'session:ended',
  ERROR_OCCURRED: 'error:occurred'
};

// UI Messages
export const UI_MESSAGES = {
  initializing: '初始化中...',
  arReady: 'AR已就绪',
  waitingForInput: '等待输入...',
  processing: '处理中...',
  error: '发生错误',
  sessionEnded: '对话已结束'
};

// Default Configuration
export const DEFAULT_CONFIG = {
  apiProvider: 'openai', // or 'claude'
  language: 'zh-CN',
  maxConversationHistory: 10,
  autoPlayGreeting: true,
  enableVoiceInput: true,
  enableVoiceOutput: false,
  debugMode: true
};

// Environment Variables
export const ENV = {
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  apiKey: import.meta.env.VITE_LLM_API_KEY,
  apiProvider: import.meta.env.VITE_API_PROVIDER || 'openai',
  xr8Key: import.meta.env.VITE_XR8_KEY
};

// Logging Configuration
export const LOG_CONFIG = {
  enabled: ENV.isDevelopment,
  level: ENV.isDevelopment ? 'debug' : 'warn', // debug, info, warn, error
  prefix: '[ARPuppet]',
  colors: {
    debug: 'color: #999',
    info: 'color: #0066cc',
    warn: 'color: #ff9900',
    error: 'color: #cc0000'
  }
};

// Asset Paths
export const ASSET_PATHS = {
  models: '/models',
  textures: '/textures',
  sounds: '/sounds',
  defaultPuppetModel: '/models/puppet.gltf'
};

export default {
  API_CONFIG,
  XRWALL_CONFIG,
  SCENE_CONFIG,
  ANIMATION_CONFIG,
  UPDATE_STATE,
  UI_MESSAGES,
  DEFAULT_CONFIG,
  ENV,
  LOG_CONFIG,
  ASSET_PATHS
};
