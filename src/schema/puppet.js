/**
 * Puppet Schema - Defines 3D puppet/robot model properties
 */

export class Puppet {
  constructor({
    modelUrl = '',
    position = { x: 0, y: 0, z: -2 },
    rotation = { x: 0, y: 0, z: 0 },
    scale = 1,
    animationStates = {
      idle: false,
      greeting: false,
      talking: false,
      listening: false,
      happy: false,
      confused: false
    },
    metadata = {}
  } = {}) {
    this.modelUrl = modelUrl;
    this.position = position;
    this.rotation = rotation;
    this.scale = scale;
    this.animationStates = animationStates;
    this.metadata = metadata;
  }

  updatePosition(x, y, z) {
    this.position = { x, y, z };
  }

  updateScale(scale) {
    this.scale = Math.max(0.1, scale);
  }

  setAnimationState(animationName, active = true) {
    if (animationName in this.animationStates) {
      // Reset other states
      Object.keys(this.animationStates).forEach(key => {
        this.animationStates[key] = false;
      });
      // Set target animation
      this.animationStates[animationName] = active;
    }
  }

  toJSON() {
    return {
      modelUrl: this.modelUrl,
      position: this.position,
      rotation: this.rotation,
      scale: this.scale,
      animationStates: this.animationStates,
      metadata: this.metadata
    };
  }

  static validate(puppet) {
    if (!puppet.modelUrl || typeof puppet.modelUrl !== 'string') return false;
    if (!puppet.position || typeof puppet.position !== 'object') return false;
    if (!puppet.scale || typeof puppet.scale !== 'number') return false;
    return true;
  }
}

export default Puppet;
