import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { soundEngine } from './audio';
import { ModiRunnerCharacter } from './character';
import { EnvironmentManager } from './environments';
import { LANE_X, ObstaclePoolManager } from './obstacles';
import { createProceduralTextures, ProceduralTextures } from './textures';
import {
  ActivePowerUpHUD,
  CharacterId,
  GameMode,
  ObstacleType,
  OutfitId,
  POWERUP_DEFS,
  PowerUpType,
  QualityLevel,
  RunHUDState,
  TimeOfDayMode,
  WING_CATALOG,
  WingDefinition,
  WingId,
} from './types';

export interface EngineCallbacks {
  onHUDUpdate: (hud: RunHUDState) => void;
  onGameOver: (finalHud: RunHUDState) => void;
  onContextLost?: (lost: boolean) => void;
}

const OBSTACLE_POOL_WEIGHTS: ObstacleType[] = [
  'car',
  'auto',
  'bus',
  'barricade',
  'cone',
  'cow',
  'vendor_cart',
  'construction',
  'truck',
];

const POWERUP_KEYS: PowerUpType[] = [
  'magnet',
  'jetpack',
  'shield',
  'chai',
  'double_coins',
  'super_jump',
  'slow_mo',
];

const PARTICLE_COUNT = 180;

export class GameEngine {
  private readonly container: HTMLElement;
  private readonly callbacks: EngineCallbacks;
  private readonly isSoftwareGl: boolean;

  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly dirLight: THREE.DirectionalLight;
  private readonly hemiLight: THREE.HemisphereLight;
  private readonly textures: ProceduralTextures;
  private readonly env: EnvironmentManager;
  private readonly character: ModiRunnerCharacter;
  private readonly pool: ObstaclePoolManager;
  private readonly contactShadow: THREE.Mesh;

  private readonly particleGeo: THREE.BufferGeometry;
  private readonly particleMat: THREE.PointsMaterial;
  private readonly particlePositions = new Float32Array(PARTICLE_COUNT * 3);
  private readonly particleVelocities = new Float32Array(PARTICLE_COUNT * 3);
  private readonly particleLife = new Float32Array(PARTICLE_COUNT);
  private particleCursor = 0;

  private frameId = 0;
  private lastTime = performance.now();
  private elapsed = 0;
  private destroyed = false;

  // Game State
  private mode: GameMode = 'classic';
  private timeOfDayMode: TimeOfDayMode = 'auto';
  private quality: QualityLevel = 'medium';
  private isPlaying = false;
  private isPaused = false;
  private isCrashed = false;
  private showcaseMode: 'menu' | 'shop_characters' | 'shop_outfits' | 'shop_wings' = 'menu';

  // Player Physics
  private lane = 1;
  private playerX = 0;
  private playerY = 0;
  private velY = 0;
  private isGrounded = true;
  private slideTimer = 0;
  private hasShield = false;
  private crashTimer = 0;
  private cameraShake = 0;
  private wingColorHex = 0xffd54f;

  // Collectible Wing State (NEVER equipped by default!)
  private activeWingId: WingId | null = null;
  private activeWingDef: WingDefinition | null = null;
  private wingFlightTimer = 0;
  private wingFlightTotal = 10;

  // Run Metrics
  private score = 0;
  private coins = 0;
  private distance = 0;
  private baseSpeed = 16;
  private currentSpeed = 16;
  private spawnTimer = 0;
  private coinWaveTimer = 0;
  private powerUpSpawnTimer = 6;
  private wingSpawnTimer = 9;
  private obstaclesAvoided = 0;
  private wingsUsed = 0;
  private powerUpsCollected = 0;
  private hudSyncTimer = 0;
  private flySoundTimer = 0;

  // Active Power-Up Timers
  private readonly activeTimers: Record<PowerUpType, number> = {
    magnet: 0,
    jetpack: 0,
    wings: 0,
    shield: 0,
    chai: 0,
    double_coins: 0,
    super_jump: 0,
    slow_mo: 0,
  };

  private readonly camTargetPos = new THREE.Vector3();
  private readonly camTargetLook = new THREE.Vector3();

  constructor(container: HTMLElement, callbacks: EngineCallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    this.isSoftwareGl = (() => {
      try {
        const probe = document.createElement('canvas');
        const gl = probe.getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return false;
      }
    })();

    const width = Math.max(container.clientWidth, 320);
    const height = Math.max(container.clientHeight, 320);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.renderer.domElement.addEventListener('webglcontextlost', this.handleContextLost);
    this.renderer.domElement.addEventListener('webglcontextrestored', this.handleContextRestored);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x7cc4fa);
    this.scene.fog = new THREE.Fog(0xbce0fd, 42, 128);

    this.camera = new THREE.PerspectiveCamera(58, width / height, 0.2, 220);
    this.camera.position.set(0, 4.1, 7.4);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.hemiLight = new THREE.HemisphereLight(0x8fd3ff, 0x8b6b4a, 0.72);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xfff4d6, 1.65);
    this.dirLight.position.set(12, 22, 14);
    this.dirLight.castShadow = !this.isSoftwareGl;
    this.dirLight.shadow.mapSize.set(1024, 1024);
    this.dirLight.shadow.camera.left = -18;
    this.dirLight.shadow.camera.right = 18;
    this.dirLight.shadow.camera.top = 18;
    this.dirLight.shadow.camera.bottom = -18;
    this.dirLight.shadow.camera.near = 2;
    this.dirLight.shadow.camera.far = 65;
    this.dirLight.shadow.bias = -0.0005;
    this.dirLight.shadow.normalBias = 0.02;
    this.scene.add(this.dirLight);

    const rimLight = new THREE.DirectionalLight(0xffedd5, 0.55);
    rimLight.position.set(-10, 10, -14);
    this.scene.add(rimLight);

    this.textures = createProceduralTextures(this.renderer);
    this.env = new EnvironmentManager(this.scene, this.textures, this.dirLight, this.hemiLight);
    this.character = new ModiRunnerCharacter();
    this.scene.add(this.character.root);

    const shGeo = new THREE.PlaneGeometry(2.1, 2.1);
    const shMat = new THREE.MeshBasicMaterial({
      map: this.textures.contactShadow,
      transparent: true,
      opacity: 0.52,
      depthWrite: false,
    });
    this.contactShadow = new THREE.Mesh(shGeo, shMat);
    this.contactShadow.rotation.x = -Math.PI / 2;
    this.contactShadow.position.y = 0.03;
    this.scene.add(this.contactShadow);

    this.pool = new ObstaclePoolManager();
    this.scene.add(this.pool.root);

    this.particleGeo = new THREE.BufferGeometry();
    this.particleGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(this.particlePositions, 3)
    );
    this.particleMat = new THREE.PointsMaterial({
      size: 0.44,
      map: this.textures.particleGlow,
      color: 0xffd54f,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(this.particleGeo, this.particleMat);
    points.frustumCulled = false;
    this.scene.add(points);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    window.addEventListener('resize', this.handleResize);
    this.startLoop();
  }

  private handleContextLost = (e: Event): void => {
    e.preventDefault();
    this.callbacks.onContextLost?.(true);
  };

  private handleContextRestored = (): void => {
    this.callbacks.onContextLost?.(false);
  };

  private handleResize = (): void => {
    if (this.destroyed) return;
    const width = Math.max(this.container.clientWidth, 320);
    const height = Math.max(this.container.clientHeight, 320);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  public applyCustomization(characterId: CharacterId, outfitId: OutfitId, wingId: WingId): void {
    this.character.applyCharacter(characterId);
    this.character.applyOutfit(outfitId);
    // Only apply preview wing skin when not actively flying on a collected wing
    if (!this.activeWingId) {
      this.character.applyWingSkin(wingId);
    }
    const wingDef = WING_CATALOG.find((w) => w.id === wingId);
    this.wingColorHex = wingDef?.particleColor ?? 0xffd54f;
  }

  public applySettings(quality: QualityLevel, timeOfDay: TimeOfDayMode): void {
    this.quality = quality;
    this.timeOfDayMode = timeOfDay;
    this.env.setQuality(quality);

    if (!this.isSoftwareGl) {
      if (quality === 'low') {
        this.renderer.setPixelRatio(1);
        this.renderer.shadowMap.enabled = false;
      } else if (quality === 'medium') {
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
        this.renderer.shadowMap.enabled = true;
      } else {
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        this.renderer.shadowMap.enabled = true;
      }
    }
  }

  public setShowcaseMode(mode: 'menu' | 'shop_characters' | 'shop_outfits' | 'shop_wings'): void {
    this.showcaseMode = mode;
    this.isPlaying = false;
    this.isPaused = false;
    this.isCrashed = false;
    this.activeWingId = null;
    this.activeWingDef = null;
    this.wingFlightTimer = 0;
    this.pool.resetAll();
    this.character.root.position.set(0, 0, 0);
  }

  public startRun(mode: GameMode): void {
    this.mode = mode;
    this.isPlaying = true;
    this.isPaused = false;
    this.isCrashed = false;
    this.pool.resetAll();

    // Reset physics — IMPORTANT: Start with NO wings on back!
    this.lane = 1;
    this.playerX = 0;
    this.playerY = 0;
    this.velY = 0;
    this.isGrounded = true;
    this.slideTimer = 0;
    this.activeWingId = null;
    this.activeWingDef = null;
    this.wingFlightTimer = 0;
    this.hasShield = false;
    this.crashTimer = 0;
    this.cameraShake = 0;

    this.score = 0;
    this.coins = 0;
    this.distance = 0;
    this.obstaclesAvoided = 0;
    this.wingsUsed = 0;
    this.powerUpsCollected = 0;

    this.baseSpeed = mode === 'speed_run' ? 24 : mode === 'challenge' ? 18.5 : 15.5;
    this.currentSpeed = this.baseSpeed;
    this.spawnTimer = 1.2;
    this.coinWaveTimer = 0.5;
    this.powerUpSpawnTimer = 5.5;
    // Wings spawn randomly on road — quicker in Flying Wings mode, periodic in all others
    this.wingSpawnTimer = mode === 'flying' ? 4.5 : 9.5;

    for (const key of POWERUP_KEYS) {
      this.activeTimers[key] = 0;
    }

    this.character.root.position.set(0, 0, 0);
    // Position chase camera cleanly behind runner immediately
    this.camera.position.set(0, 4.15, 7.4);
    this.camera.lookAt(0, 1.45, -12);
    this.emitHUD();
  }

  public setPaused(paused: boolean): void {
    if (!this.isPlaying || this.isCrashed) return;
    this.isPaused = paused;
  }

  public moveLeft(): void {
    if (!this.isPlaying || this.isPaused || this.isCrashed) return;
    if (this.lane > 0) {
      this.lane--;
      soundEngine.playSlide();
    }
  }

  public moveRight(): void {
    if (!this.isPlaying || this.isPaused || this.isCrashed) return;
    if (this.lane < 2) {
      this.lane++;
      soundEngine.playSlide();
    }
  }

  public jump(): void {
    if (!this.isPlaying || this.isPaused || this.isCrashed) return;
    if (this.wingFlightTimer > 0 || this.activeTimers.jetpack > 0) return;
    if (this.isGrounded) {
      this.slideTimer = 0;
      const superJump = this.activeTimers.super_jump > 0;
      this.velY = superJump ? 18.6 : 13.8;
      this.isGrounded = false;
      soundEngine.playJump();
      this.spawnBurst(this.playerX, 0.25, 0, 8, superJump ? 0xa855f7 : 0xfaf7f0);
    }
  }

  public slide(): void {
    if (!this.isPlaying || this.isPaused || this.isCrashed) return;
    if (this.wingFlightTimer > 0 || this.activeTimers.jetpack > 0) {
      return;
    }
    if (!this.isGrounded) {
      this.velY = -20;
    }
    this.slideTimer = 0.78;
    soundEngine.playSlide();
  }

  private spawnBurst(x: number, y: number, z: number, count: number, colorHex: number): void {
    this.particleMat.color.setHex(colorHex);
    for (let i = 0; i < count; i++) {
      const idx = this.particleCursor;
      this.particleCursor = (this.particleCursor + 1) % PARTICLE_COUNT;
      const i3 = idx * 3;
      this.particlePositions[i3] = x + (Math.random() - 0.5) * 0.9;
      this.particlePositions[i3 + 1] = y + (Math.random() - 0.5) * 0.6;
      this.particlePositions[i3 + 2] = z + (Math.random() - 0.5) * 0.5;
      this.particleVelocities[i3] = (Math.random() - 0.5) * 4.5;
      this.particleVelocities[i3 + 1] = Math.random() * 4.2 + 0.8;
      this.particleVelocities[i3 + 2] = Math.random() * 5.0 + 2.0;
      this.particleLife[idx] = 0.55 + Math.random() * 0.35;
    }
  }

  private startLoop(): void {
    const tick = () => {
      if (this.destroyed) return;
      const now = performance.now();
      const rawDelta = Math.min((now - this.lastTime) / 1000, 0.05);
      this.lastTime = now;

      this.update(rawDelta);
      this.renderer.render(this.scene, this.camera);

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      this.afterDraw(tick);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.destroyed) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private update(delta: number): void {
    this.elapsed += delta;
    this.updateParticles(delta);

    // Showcase State (Menu / Character Shop / Outfit Shop / Wings Shop)
    if (!this.isPlaying) {
      this.env.update(delta, this.elapsed, 4.5, this.elapsed * 4.5, this.timeOfDayMode);
      this.character.update(delta, this.elapsed, {
        isGrounded: true,
        isSliding: false,
        isFlying: false,
        isJetpack: false,
        hasShield: false,
        hasMagicShoes: false,
        showWings: this.showcaseMode === 'shop_wings', // Show wings ONLY inside Wings Shop!
        isCrashed: false,
        speedRatio: 0,
        laneTilt: 0,
        showcaseMode: this.showcaseMode,
      });

      if (this.showcaseMode === 'shop_wings') {
        this.camTargetPos.set(0.3, 1.9, 3.8);
        this.camTargetLook.set(0, 1.35, 0);
      } else if (this.showcaseMode === 'shop_characters') {
        this.camTargetPos.set(0, 1.65, 3.5);
        this.camTargetLook.set(0, 1.25, 0);
      } else if (this.showcaseMode === 'shop_outfits') {
        this.camTargetPos.set(0.6, 1.65, 3.4);
        this.camTargetLook.set(0, 1.25, 0);
      } else {
        this.camTargetPos.set(0.5, 1.85, 4.2);
        this.camTargetLook.set(0, 1.25, 0);
      }

      this.camera.position.lerp(this.camTargetPos, Math.min(1, delta * 6));
      this.camera.lookAt(this.camTargetLook);
      this.contactShadow.position.set(0, 0.03, 0);
      this.contactShadow.scale.setScalar(1);
      return;
    }

    if (this.isPaused) return;

    if (this.isCrashed) {
      this.crashTimer -= delta;
      this.cameraShake = Math.max(0, this.cameraShake - delta * 2.5);
      this.character.update(delta, this.elapsed, {
        isGrounded: true,
        isSliding: false,
        isFlying: false,
        isJetpack: false,
        hasShield: false,
        hasMagicShoes: false,
        showWings: this.activeWingId !== null,
        isCrashed: true,
        speedRatio: 0,
        laneTilt: 0,
        showcaseMode: 'none',
      });
      this.updateCamera(delta);
      if (this.crashTimer <= 0) {
        this.isPlaying = false;
        this.callbacks.onGameOver(this.buildHUDState());
      }
      return;
    }

    // --- ACTIVE GAMEPLAY LOOP ---
    for (const key of POWERUP_KEYS) {
      if (this.activeTimers[key] > 0) {
        this.activeTimers[key] = Math.max(0, this.activeTimers[key] - delta);
      }
    }

    // Wing timer expiration: remove wings automatically!
    const isFlyingWings = this.wingFlightTimer > 0 && this.activeWingId !== null;
    if (isFlyingWings) {
      this.wingFlightTimer = Math.max(0, this.wingFlightTimer - delta);
      if (this.wingFlightTimer <= 0) {
        // Wings disappear automatically!
        this.activeWingId = null;
        this.activeWingDef = null;
      } else {
        if (Math.random() < (this.quality === 'low' ? 0.3 : 0.75)) {
          this.spawnBurst(this.playerX, this.playerY + 1.15, 0.35, 1, this.wingColorHex);
        }
        this.flySoundTimer -= delta;
        if (this.flySoundTimer <= 0) {
          this.flySoundTimer = 0.34;
          soundEngine.playFlyingShimmer();
        }
      }
    }

    const modeAccel = this.mode === 'speed_run' ? 0.42 : this.mode === 'challenge' ? 0.3 : 0.22;
    this.baseSpeed = Math.min(40, this.baseSpeed + delta * modeAccel);

    let effectiveSpeed = this.baseSpeed;
    if (this.activeTimers.chai > 0) effectiveSpeed *= 1.2;
    if (this.activeTimers.jetpack > 0) effectiveSpeed *= 1.42;
    if (this.activeWingDef?.speedMult) effectiveSpeed *= this.activeWingDef.speedMult;
    if (this.activeTimers.slow_mo > 0 || this.activeWingDef?.slowObstacles) {
      effectiveSpeed *= 0.65;
    }
    this.currentSpeed = THREE.MathUtils.damp(this.currentSpeed, effectiveSpeed, 6, delta);

    const distDelta = this.currentSpeed * delta;
    this.distance += distDelta;

    const modeScoreMult =
      this.mode === 'speed_run'
        ? 2.5
        : this.mode === 'challenge'
          ? 2.0
          : this.mode === 'flying'
            ? 1.25
            : this.mode === 'coin_rush'
              ? 1.2
              : 1.0;
    const scorePowerMult =
      (this.activeTimers.chai > 0 ? 2 : 1) * (this.activeWingDef?.scoreMult ?? 1);
    this.score += distDelta * 2.5 * modeScoreMult * scorePowerMult;

    // Player Lane & Vertical Physics
    const targetX = LANE_X[this.lane];
    const prevX = this.playerX;
    this.playerX = THREE.MathUtils.damp(this.playerX, targetX, 15, delta);
    const laneTilt = THREE.MathUtils.clamp((this.playerX - prevX) / Math.max(delta, 0.001) / 16, -1, 1);

    const isJetpack = this.activeTimers.jetpack > 0;
    const isWingFlying = this.wingFlightTimer > 0 && this.activeWingId !== null;

    if (isJetpack) {
      this.playerY = THREE.MathUtils.damp(this.playerY, 5.4, 7, delta);
      this.velY = 0;
      this.isGrounded = false;
      this.spawnBurst(this.playerX, this.playerY + 0.6, 0.4, 1, 0xf97316);
    } else if (isWingFlying) {
      this.playerY = THREE.MathUtils.damp(this.playerY, 4.6, 6, delta);
      this.velY = 0;
      this.isGrounded = false;
    } else {
      if (this.slideTimer > 0) {
        this.slideTimer = Math.max(0, this.slideTimer - delta);
      }
      if (!this.isGrounded) {
        this.velY -= 38 * delta;
        this.playerY += this.velY * delta;
        if (this.playerY <= 0) {
          this.playerY = 0;
          this.velY = 0;
          this.isGrounded = true;
        }
      }
    }

    this.character.root.position.set(this.playerX, this.playerY, 0);
    this.contactShadow.position.set(this.playerX, 0.03, 0);
    const shadowScale = Math.max(0.35, 1 - this.playerY * 0.11);
    this.contactShadow.scale.setScalar(shadowScale);

    const stepTriggered = this.character.update(delta, this.elapsed, {
      isGrounded: this.isGrounded,
      isSliding: this.slideTimer > 0,
      isFlying: isWingFlying,
      isJetpack,
      hasShield: this.hasShield,
      hasMagicShoes: this.activeTimers.super_jump > 0,
      showWings: isWingFlying, // Wings appear ONLY when a Wing Power-Up is active!
      isCrashed: false,
      speedRatio: (this.currentSpeed - 15) / 25,
      laneTilt,
      showcaseMode: 'none',
    });
    if (stepTriggered) soundEngine.playFootstep();

    const envInfo = this.env.update(
      delta,
      this.elapsed,
      this.currentSpeed,
      this.distance,
      this.timeOfDayMode
    );

    this.updateSpawners(delta);
    this.updateWorldEntities(delta, isWingFlying || isJetpack);
    this.updateCamera(delta);

    this.hudSyncTimer += delta;
    if (this.hudSyncTimer >= 0.065) {
      this.hudSyncTimer = 0;
      this.emitHUD(envInfo.zoneLabel, envInfo.timePhase);
    }
  }

  private updateSpawners(delta: number): void {
    this.spawnTimer -= delta;
    if (this.spawnTimer <= 0) {
      const interval =
        this.mode === 'challenge'
          ? Math.max(0.55, 1.35 - this.distance / 2800)
          : this.mode === 'coin_rush'
            ? 1.35
            : Math.max(0.65, 1.55 - this.distance / 3200);
      this.spawnTimer = interval * (0.85 + Math.random() * 0.35);

      const lanes = [0, 1, 2];
      const count = Math.random() < (this.mode === 'challenge' ? 0.55 : 0.32) ? 2 : 1;
      for (let i = 0; i < count; i++) {
        const pickIdx = Math.floor(Math.random() * lanes.length);
        const lane = lanes.splice(pickIdx, 1)[0];
        const obsType =
          OBSTACLE_POOL_WEIGHTS[Math.floor(Math.random() * OBSTACLE_POOL_WEIGHTS.length)];
        this.pool.spawnObstacle(obsType, lane, -108 - i * 4);
      }
    }

    this.coinWaveTimer -= delta;
    if (this.coinWaveTimer <= 0) {
      this.coinWaveTimer = this.mode === 'coin_rush' ? 0.72 : 1.25;
      const lane = Math.floor(Math.random() * 3);
      const isAirborne = this.wingFlightTimer > 0 || this.activeTimers.jetpack > 0;
      const yBase = isAirborne ? 4.8 : 1.05;
      const arc = !isAirborne && Math.random() < 0.35;
      this.pool.spawnCoinLine(lane, -98, this.mode === 'coin_rush' ? 7 : 5, yBase, arc);
      if (this.mode === 'coin_rush') {
        const secondLane = (lane + 1) % 3;
        this.pool.spawnCoinLine(secondLane, -104, 5, yBase, false);
      }
    }

    // Standard Power-Ups (Magic Shoes, Jetpack, Magnet, Shield, Multiplier, Double Coins, Slow-Mo)
    this.powerUpSpawnTimer -= delta;
    if (this.powerUpSpawnTimer <= 0) {
      this.powerUpSpawnTimer = 7.5 + Math.random() * 4.5;
      const lane = Math.floor(Math.random() * 3);
      const pType = POWERUP_KEYS[Math.floor(Math.random() * POWERUP_KEYS.length)];
      const yPos = this.wingFlightTimer > 0 || this.activeTimers.jetpack > 0 ? 4.8 : 1.3;
      this.pool.spawnPowerUp(pType, lane, -102, yPos);
    }

    // Random Collectible Wing Power-Ups (all 12 wings spawn randomly on the road!)
    this.wingSpawnTimer -= delta;
    if (this.wingSpawnTimer <= 0) {
      this.wingSpawnTimer = this.mode === 'flying' ? 6.5 + Math.random() * 3.5 : 12 + Math.random() * 7;
      const lane = Math.floor(Math.random() * 3);
      const yPos = this.wingFlightTimer > 0 || this.activeTimers.jetpack > 0 ? 4.8 : 1.45;
      this.pool.spawnRandomWingCollectible(lane, -105, yPos);
    }
  }

  private updateWorldEntities(delta: number, isAirbornePower: boolean): void {
    const playerMinY = this.playerY;
    const playerMaxY = this.playerY + (this.slideTimer > 0 ? 0.85 : 1.95);
    const magnetOn = this.activeTimers.magnet > 0 || Boolean(this.activeWingDef?.magnetOn);

    // 1. Obstacles
    for (const obs of this.pool.obstacles) {
      if (!obs.active) continue;
      obs.group.position.z += (this.currentSpeed + obs.speedOffset) * delta;

      const z = obs.group.position.z;
      if (!obs.scoredAvoid && z > 2.2) {
        obs.scoredAvoid = true;
        this.obstaclesAvoided++;
      }
      if (z > 14) {
        obs.active = false;
        obs.group.visible = false;
        continue;
      }

      if (Math.abs(z) < obs.halfD + 0.42) {
        const dx = Math.abs(this.playerX - obs.group.position.x);
        if (dx < obs.halfW + 0.36) {
          const overlapY = playerMaxY > obs.minY + 0.12 && playerMinY < obs.maxY - 0.12;
          if (overlapY) {
            if (this.hasShield) {
              this.hasShield = false;
              this.activeTimers.shield = 0;
              obs.active = false;
              obs.group.visible = false;
              this.cameraShake = 0.45;
              soundEngine.playShieldBreak();
              this.spawnBurst(this.playerX, this.playerY + 1.0, 0, 24, 0x06b6d4);
            } else if (!isAirbornePower) {
              this.isCrashed = true;
              this.crashTimer = 0.85;
              this.cameraShake = 0.85;
              soundEngine.playCollision();
              soundEngine.playGameOver();
              this.spawnBurst(this.playerX, this.playerY + 1.0, 0, 30, 0xef4444);
              return;
            }
          }
        }
      }
    }

    // 2. Golden Coins
    const coinMult =
      (this.activeTimers.double_coins > 0 ? 2 : 1) *
      (this.mode === 'coin_rush' ? 2 : 1) *
      (this.activeWingDef?.coinMult ?? 1);

    for (const coin of this.pool.coins) {
      if (!coin.active) continue;
      coin.mesh.position.z += this.currentSpeed * delta;
      coin.mesh.rotation.y += delta * 4.5;

      if (magnetOn && coin.mesh.position.z > -24 && coin.mesh.position.z < 4) {
        coin.mesh.position.x = THREE.MathUtils.damp(coin.mesh.position.x, this.playerX, 11, delta);
        coin.mesh.position.y = THREE.MathUtils.damp(
          coin.mesh.position.y,
          this.playerY + 1.0,
          11,
          delta
        );
      }

      if (coin.mesh.position.z > 12) {
        coin.active = false;
        coin.mesh.visible = false;
        continue;
      }

      const dz = Math.abs(coin.mesh.position.z);
      const dx = Math.abs(coin.mesh.position.x - this.playerX);
      const dy = Math.abs(coin.mesh.position.y - (this.playerY + 1.0));
      if (dz < 1.15 && dx < 1.15 && dy < 1.35) {
        coin.active = false;
        coin.mesh.visible = false;
        this.coins += coinMult;
        this.score += 15 * coinMult;
        soundEngine.playCoin();
        this.spawnBurst(coin.mesh.position.x, coin.mesh.position.y, 0, 5, 0xfbbf24);
      }
    }

    // 3. Standard Power-Ups
    for (const p of this.pool.powerUps) {
      if (!p.active) continue;
      p.group.position.z += this.currentSpeed * delta;
      p.group.rotation.y += delta * 2.8;
      p.ring.rotation.x += delta * 2.2;

      if (p.group.position.z > 12) {
        p.active = false;
        p.group.visible = false;
        continue;
      }

      const dz = Math.abs(p.group.position.z);
      const dx = Math.abs(p.group.position.x - this.playerX);
      const dy = Math.abs(p.group.position.y - (this.playerY + 1.0));
      if (dz < 1.35 && dx < 1.25 && dy < 1.55) {
        p.active = false;
        p.group.visible = false;
        this.applyPowerUp(p.type);
      }
    }

    // 4. Collectible Wing Power-Ups (All 12 wings!)
    for (const w of this.pool.wingCollectibles) {
      if (!w.active) continue;
      w.group.position.z += this.currentSpeed * delta;
      w.group.rotation.y += delta * 3.0;
      w.ring.rotation.x += delta * 2.5;

      if (w.group.position.z > 12) {
        w.active = false;
        w.group.visible = false;
        continue;
      }

      const dz = Math.abs(w.group.position.z);
      const dx = Math.abs(w.group.position.x - this.playerX);
      const dy = Math.abs(w.group.position.y - (this.playerY + 1.0));
      if (dz < 1.4 && dx < 1.3 && dy < 1.6) {
        w.active = false;
        w.group.visible = false;
        this.collectWingPowerUp(w.wingId);
      }
    }
  }

  private collectWingPowerUp(wingId: WingId): void {
    const def = WING_CATALOG.find((w) => w.id === wingId) ?? WING_CATALOG[0];
    this.activeWingId = def.id;
    this.activeWingDef = def;
    this.wingFlightTimer = def.duration;
    this.wingFlightTotal = def.duration;
    this.wingColorHex = def.particleColor;
    this.wingsUsed++;
    this.powerUpsCollected++;

    this.character.applyWingSkin(def.id);
    this.isGrounded = false;
    this.slideTimer = 0;

    if (def.grantShield) {
      this.hasShield = true;
    }

    soundEngine.playWingFlap();
    soundEngine.playPowerUp();
    this.spawnBurst(this.playerX, this.playerY + 1.2, 0, 32, def.particleColor);
  }

  private applyPowerUp(type: PowerUpType): void {
    const def = POWERUP_DEFS[type];
    this.powerUpsCollected++;
    soundEngine.playPowerUp();
    this.spawnBurst(this.playerX, this.playerY + 1.2, 0, 20, def.hexNum);

    if (type === 'shield') {
      this.hasShield = true;
      this.activeTimers.shield = 1;
    } else {
      this.activeTimers[type] = def.duration;
      if (type === 'jetpack') {
        this.isGrounded = false;
        this.slideTimer = 0;
      }
    }
  }

  private updateCamera(delta: number): void {
    const targetFov =
      this.activeTimers.chai > 0 ||
      this.activeTimers.jetpack > 0 ||
      this.mode === 'speed_run' ||
      this.activeWingDef?.speedMult
        ? 66
        : this.wingFlightTimer > 0
          ? 63
          : 58;
    if (Math.abs(this.camera.fov - targetFov) > 0.1) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 5, delta);
      this.camera.updateProjectionMatrix();
    }

    const shakeX = this.cameraShake > 0 ? (Math.random() - 0.5) * this.cameraShake : 0;
    const shakeY = this.cameraShake > 0 ? (Math.random() - 0.5) * this.cameraShake : 0;

    // Elevated Subway Surfers-style third-person chase camera behind runner
    const desiredCamX = this.playerX * 0.6 + shakeX;
    const desiredCamY = 4.15 + this.playerY * 0.72 + shakeY;
    const desiredCamZ = this.wingFlightTimer > 0 || this.activeTimers.jetpack > 0 ? 8.6 : 7.4;

    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, desiredCamX, 8, delta);
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, desiredCamY, 8, delta);
    this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, desiredCamZ, 6, delta);

    // Look ahead down -Z so character is centered and obstacles/road ahead are clearly visible
    this.camTargetLook.set(this.playerX * 0.45, 1.45 + this.playerY * 0.78, -12);
    this.camera.lookAt(this.camTargetLook);
  }

  private updateParticles(delta: number): void {
    let dirty = false;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      if (this.particleLife[i] <= 0) continue;
      dirty = true;
      this.particleLife[i] -= delta;
      const i3 = i * 3;
      if (this.particleLife[i] <= 0) {
        this.particlePositions[i3 + 1] = -999;
      } else {
        this.particlePositions[i3] += this.particleVelocities[i3] * delta;
        this.particlePositions[i3 + 1] += this.particleVelocities[i3 + 1] * delta;
        this.particlePositions[i3 + 2] += this.particleVelocities[i3 + 2] * delta;
      }
    }
    if (dirty) {
      this.particleGeo.attributes.position.needsUpdate = true;
    }
  }

  private buildHUDState(
    zoneName = 'New Delhi · India Gate',
    timePhase: 'Day' | 'Sunset' | 'Night' = 'Day'
  ): RunHUDState {
    const activePowerUps: ActivePowerUpHUD[] = [];
    for (const key of POWERUP_KEYS) {
      if (key === 'shield') continue;
      if (this.activeTimers[key] > 0) {
        const def = POWERUP_DEFS[key];
        activePowerUps.push({
          type: key,
          label: def.shortLabel,
          remaining: this.activeTimers[key],
          total: def.duration || 10,
          color: def.color,
        });
      }
    }

    const mult =
      (this.activeTimers.chai > 0 ? 2 : 1) *
      (this.activeTimers.double_coins > 0 ? 2 : 1) *
      (this.activeWingDef?.scoreMult ?? 1);

    return {
      score: Math.floor(this.score),
      coins: this.coins,
      distance: Math.floor(this.distance),
      speedKmh: Math.round(this.currentSpeed * 3.1),
      multiplier: mult,
      isFlying: this.wingFlightTimer > 0 || this.activeTimers.jetpack > 0,
      activeWingId: this.activeWingId,
      activeWingName: this.activeWingDef?.name ?? null,
      activeWingAbility: this.activeWingDef?.abilityName ?? null,
      activeWingRemaining: this.wingFlightTimer,
      activeWingTotal: this.wingFlightTotal,
      hasShield: this.hasShield,
      zoneName,
      timePhase,
      activePowerUps,
      obstaclesAvoided: this.obstaclesAvoided,
      wingsUsed: this.wingsUsed,
      powerUpsCollected: this.powerUpsCollected,
      crashed: this.isCrashed,
    };
  }

  private emitHUD(zoneLabel?: string, timePhase?: 'Day' | 'Sunset' | 'Night'): void {
    this.callbacks.onHUDUpdate(this.buildHUDState(zoneLabel, timePhase));
  }

  public dispose(): void {
    this.destroyed = true;
    cancelAnimationFrame(this.frameId);
    window.clearTimeout(this.frameId);
    window.removeEventListener('resize', this.handleResize);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.handleContextLost);
    this.renderer.domElement.removeEventListener('webglcontextrestored', this.handleContextRestored);

    this.character.dispose();
    this.env.dispose();
    this.pool.dispose();
    this.textures.dispose();
    this.particleGeo.dispose();
    this.particleMat.dispose();
    this.contactShadow.geometry.dispose();
    (this.contactShadow.material as THREE.Material).dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
