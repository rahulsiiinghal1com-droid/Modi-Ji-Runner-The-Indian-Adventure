import * as THREE from 'three';
import { ObstacleType, POWERUP_DEFS, PowerUpType, WING_CATALOG, WingId } from './types';

export const LANE_X = [-3.2, 0, 3.2] as const;

export interface PooledObstacle {
  active: boolean;
  type: ObstacleType;
  lane: number;
  group: THREE.Group;
  speedOffset: number;
  halfW: number;
  minY: number;
  maxY: number;
  halfD: number;
  scoredAvoid: boolean;
}

export interface PooledCoin {
  active: boolean;
  mesh: THREE.Group;
  lane: number;
  baseY: number;
}

export interface PooledPowerUp {
  active: boolean;
  type: PowerUpType;
  group: THREE.Group;
  ring: THREE.Mesh;
}

export interface PooledWingCollectible {
  active: boolean;
  wingId: WingId;
  group: THREE.Group;
  ring: THREE.Mesh;
}

const OBSTACLE_TYPES: ObstacleType[] = [
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

const POWERUP_TYPES: PowerUpType[] = [
  'magnet',
  'jetpack',
  'shield',
  'chai',
  'double_coins',
  'super_jump',
  'slow_mo',
];

export class ObstaclePoolManager {
  public readonly root = new THREE.Group();
  public readonly obstacles: PooledObstacle[] = [];
  public readonly coins: PooledCoin[] = [];
  public readonly powerUps: PooledPowerUp[] = [];
  public readonly wingCollectibles: PooledWingCollectible[] = [];

  private readonly disposables: Array<{ dispose: () => void }> = [];

  private readonly tireMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 });
  private readonly glassMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.15,
    metalness: 0.6,
  });
  private readonly coinMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xd97706,
    emissiveIntensity: 0.25,
    roughness: 0.18,
    metalness: 0.9,
  });

  constructor() {
    this.disposables.push(this.tireMat, this.glassMat, this.coinMat);

    // Pre-build 22 obstacles
    for (let i = 0; i < 22; i++) {
      const type = OBSTACLE_TYPES[i % OBSTACLE_TYPES.length];
      const built = this.createObstacleModel(type);
      built.group.visible = false;
      this.root.add(built.group);
      this.obstacles.push({
        active: false,
        type,
        lane: 1,
        group: built.group,
        speedOffset: built.speedOffset,
        halfW: built.halfW,
        minY: built.minY,
        maxY: built.maxY,
        halfD: built.halfD,
        scoredAvoid: false,
      });
    }

    // Pre-build 80 golden coins
    const coinGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.1, 16);
    coinGeo.rotateX(Math.PI / 2);
    const coinRimGeo = new THREE.TorusGeometry(0.32, 0.04, 6, 16);
    this.disposables.push(coinGeo, coinRimGeo);

    for (let i = 0; i < 80; i++) {
      const g = new THREE.Group();
      const disc = new THREE.Mesh(coinGeo, this.coinMat);
      const rim = new THREE.Mesh(coinRimGeo, this.coinMat);
      rim.position.z = 0.055;
      g.add(disc, rim);
      g.visible = false;
      this.root.add(g);
      this.coins.push({ active: false, mesh: g, lane: 1, baseY: 1 });
    }

    // Pre-build Subway-Surfers style floating Power-Ups (Magic Shoes, Jetpack, Magnet, Shield, Multiplier, Double Coins, Slow-Mo)
    const ringGeo = new THREE.TorusGeometry(0.72, 0.06, 8, 22);
    this.disposables.push(ringGeo);
    for (const pType of POWERUP_TYPES) {
      const def = POWERUP_DEFS[pType];
      const group = new THREE.Group();
      const ringMat = new THREE.MeshBasicMaterial({ color: def.hexNum });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      group.add(ring);

      const iconMesh = this.createPowerUpIcon(pType, def.hexNum);
      group.add(iconMesh);
      group.visible = false;
      this.root.add(group);
      this.disposables.push(ringMat);
      this.powerUps.push({ active: false, type: pType, group, ring });
    }

    // Pre-build all 12 Floating Wing Collectibles!
    const wingBladeGeo = new THREE.BoxGeometry(0.55, 0.24, 0.08);
    const wingTipGeo = new THREE.ConeGeometry(0.18, 0.48, 6);
    wingTipGeo.rotateZ(-Math.PI / 2);
    this.disposables.push(wingBladeGeo, wingTipGeo);

    for (const wDef of WING_CATALOG) {
      const group = new THREE.Group();
      const ringMat = new THREE.MeshBasicMaterial({ color: wDef.particleColor });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      group.add(ring);

      const wingMat = new THREE.MeshStandardMaterial({
        color: wDef.primaryColor,
        emissive: wDef.emissiveColor,
        emissiveIntensity: 0.65,
        roughness: 0.2,
        metalness: 0.8,
      });
      const tipMat = new THREE.MeshStandardMaterial({
        color: wDef.secondaryColor,
        emissive: wDef.emissiveColor,
        emissiveIntensity: 0.45,
        roughness: 0.25,
        metalness: 0.7,
      });

      // Twin miniature stylized wings floating inside aura ring
      const leftW = new THREE.Mesh(wingBladeGeo, wingMat);
      leftW.position.set(-0.34, 0.06, 0);
      leftW.rotation.z = 0.35;
      const rightW = new THREE.Mesh(wingBladeGeo, wingMat);
      rightW.position.set(0.34, 0.06, 0);
      rightW.rotation.z = -0.35;

      const leftTip = new THREE.Mesh(wingTipGeo, tipMat);
      leftTip.position.set(-0.62, 0.22, 0);
      leftTip.rotation.z = Math.PI + 0.35;
      const rightTip = new THREE.Mesh(wingTipGeo, tipMat);
      rightTip.position.set(0.62, 0.22, 0);
      rightTip.rotation.z = -0.35;

      group.add(leftW, rightW, leftTip);
      group.visible = false;
      this.root.add(group);
      this.disposables.push(ringMat, wingMat, tipMat);

      this.wingCollectibles.push({
        active: false,
        wingId: wDef.id,
        group,
        ring,
      });
    }
  }

  private createWheel(radius: number, width: number): THREE.Mesh {
    const geo = new THREE.CylinderGeometry(radius, radius, width, 12);
    geo.rotateZ(Math.PI / 2);
    this.disposables.push(geo);
    return new THREE.Mesh(geo, this.tireMat);
  }

  private createObstacleModel(type: ObstacleType): {
    group: THREE.Group;
    speedOffset: number;
    halfW: number;
    minY: number;
    maxY: number;
    halfD: number;
  } {
    const group = new THREE.Group();

    if (type === 'car') {
      const carColors = [0xffffff, 0x2563eb, 0xdc2626, 0x94a3b8];
      const bodyMat = new THREE.MeshStandardMaterial({
        color: carColors[Math.floor(Math.random() * carColors.length)],
        roughness: 0.3,
        metalness: 0.55,
      });
      this.disposables.push(bodyMat);

      const hullGeo = new THREE.BoxGeometry(1.9, 0.7, 3.6);
      const hull = new THREE.Mesh(hullGeo, bodyMat);
      hull.position.y = 0.65;
      hull.castShadow = true;

      const cabinGeo = new THREE.BoxGeometry(1.65, 0.58, 1.9);
      const cabin = new THREE.Mesh(cabinGeo, this.glassMat);
      cabin.position.set(0, 1.25, -0.1);

      const hlMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
      const hlGeo = new THREE.BoxGeometry(0.32, 0.18, 0.08);
      const hlL = new THREE.Mesh(hlGeo, hlMat);
      hlL.position.set(-0.62, 0.68, 1.82);
      const hlR = hlL.clone();
      hlR.position.x = 0.62;

      group.add(hull, cabin, hlL, hlR);
      [
        [-0.95, 0.34, 1.1],
        [0.95, 0.34, 1.1],
        [-0.95, 0.34, -1.1],
        [0.95, 0.34, -1.1],
      ].forEach(([wx, wy, wz]) => {
        const w = this.createWheel(0.34, 0.22);
        w.position.set(wx, wy, wz);
        group.add(w);
      });
      this.disposables.push(hullGeo, cabinGeo, hlMat, hlGeo);
      return { group, speedOffset: 4.5, halfW: 0.92, minY: 0, maxY: 1.55, halfD: 1.7 };
    }

    if (type === 'auto') {
      const greenMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.4, metalness: 0.3 });
      const yellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.55 });
      this.disposables.push(greenMat, yellowMat);

      const baseGeo = new THREE.BoxGeometry(1.45, 0.72, 2.35);
      const base = new THREE.Mesh(baseGeo, greenMat);
      base.position.y = 0.58;
      base.castShadow = true;

      const canopyGeo = new THREE.CylinderGeometry(0.74, 0.76, 1.95, 10, 1, false, 0, Math.PI);
      canopyGeo.rotateZ(Math.PI / 2);
      canopyGeo.rotateY(Math.PI / 2);
      const canopy = new THREE.Mesh(canopyGeo, yellowMat);
      canopy.position.set(0, 1.15, -0.1);
      canopy.castShadow = true;

      const windshieldGeo = new THREE.BoxGeometry(1.15, 0.55, 0.08);
      const ws = new THREE.Mesh(windshieldGeo, this.glassMat);
      ws.position.set(0, 1.15, 0.95);

      const wF = this.createWheel(0.26, 0.18);
      wF.position.set(0, 0.26, 0.92);
      const wBL = this.createWheel(0.26, 0.18);
      wBL.position.set(-0.74, 0.26, -0.78);
      const wBR = this.createWheel(0.26, 0.18);
      wBR.position.set(0.74, 0.26, -0.78);

      group.add(base, canopy, ws, wF, wBL, wBR);
      this.disposables.push(baseGeo, canopyGeo, windshieldGeo);
      return { group, speedOffset: 3.2, halfW: 0.78, minY: 0, maxY: 1.85, halfD: 1.15 };
    }

    if (type === 'bus') {
      const busMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.42, metalness: 0.25 });
      const stripeMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.4 });
      this.disposables.push(busMat, stripeMat);

      const bodyGeo = new THREE.BoxGeometry(2.2, 2.75, 6.2);
      const body = new THREE.Mesh(bodyGeo, busMat);
      body.position.y = 1.8;
      body.castShadow = true;

      const winBandGeo = new THREE.BoxGeometry(2.24, 0.85, 5.6);
      const winBand = new THREE.Mesh(winBandGeo, this.glassMat);
      winBand.position.y = 2.35;

      const stripeGeo = new THREE.BoxGeometry(2.25, 0.24, 6.24);
      const stripe = new THREE.Mesh(stripeGeo, stripeMat);
      stripe.position.y = 1.4;

      group.add(body, winBand, stripe);
      [
        [-1.1, 0.45, 2.0],
        [1.1, 0.45, 2.0],
        [-1.1, 0.45, -2.0],
        [1.1, 0.45, -2.0],
      ].forEach(([wx, wy, wz]) => {
        const w = this.createWheel(0.45, 0.28);
        w.position.set(wx, wy, wz);
        group.add(w);
      });
      this.disposables.push(bodyGeo, winBandGeo, stripeGeo);
      return { group, speedOffset: 2.6, halfW: 1.05, minY: 0, maxY: 3.15, halfD: 2.9 };
    }

    if (type === 'truck') {
      const cabMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.42, metalness: 0.3 });
      const cargoMat = new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.55 });
      const trimMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 });
      this.disposables.push(cabMat, cargoMat, trimMat);

      const cabGeo = new THREE.BoxGeometry(2.05, 1.8, 1.8);
      const cab = new THREE.Mesh(cabGeo, cabMat);
      cab.position.set(0, 1.35, 1.9);
      cab.castShadow = true;

      const cargoGeo = new THREE.BoxGeometry(2.2, 2.35, 3.8);
      const cargo = new THREE.Mesh(cargoGeo, cargoMat);
      cargo.position.set(0, 1.65, -0.95);
      cargo.castShadow = true;

      const crownGeo = new THREE.BoxGeometry(2.1, 0.35, 1.6);
      const crown = new THREE.Mesh(crownGeo, trimMat);
      crown.position.set(0, 2.4, 1.9);

      group.add(cab, cargo, crown);
      [
        [-1.08, 0.45, 2.0],
        [1.08, 0.45, 2.0],
        [-1.08, 0.45, -0.4],
        [1.08, 0.45, -0.4],
        [-1.08, 0.45, -2.0],
        [1.08, 0.45, -2.0],
      ].forEach(([wx, wy, wz]) => {
        const w = this.createWheel(0.45, 0.28);
        w.position.set(wx, wy, wz);
        group.add(w);
      });
      this.disposables.push(cabGeo, cargoGeo, crownGeo);
      return { group, speedOffset: 3.0, halfW: 1.05, minY: 0, maxY: 2.95, halfD: 2.75 };
    }

    if (type === 'barricade') {
      const barMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.5, metalness: 0.4 });
      const legMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.6 });
      this.disposables.push(barMat, legMat);

      const topBarGeo = new THREE.BoxGeometry(2.2, 0.48, 0.24);
      const topBar = new THREE.Mesh(topBarGeo, barMat);
      topBar.position.y = 0.85;
      topBar.castShadow = true;

      const legGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.95, 8);
      const legL = new THREE.Mesh(legGeo, legMat);
      legL.position.set(-0.9, 0.47, 0);
      const legR = legL.clone();
      legR.position.x = 0.9;

      group.add(topBar, legL, legR);
      this.disposables.push(topBarGeo, legGeo);
      return { group, speedOffset: 0, halfW: 1.05, minY: 0, maxY: 1.1, halfD: 0.35 };
    }

    if (type === 'cone') {
      const coneMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.55 });
      const bandMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
      this.disposables.push(coneMat, bandMat);

      const coneGeo = new THREE.ConeGeometry(0.32, 0.85, 12);
      const baseGeo = new THREE.BoxGeometry(0.7, 0.08, 0.7);
      const bandGeo = new THREE.CylinderGeometry(0.16, 0.22, 0.18, 12);
      [-0.65, 0, 0.65].forEach((cx) => {
        const cone = new THREE.Mesh(coneGeo, coneMat);
        cone.position.set(cx, 0.46, 0);
        cone.castShadow = true;
        const base = new THREE.Mesh(baseGeo, coneMat);
        base.position.set(cx, 0.04, 0);
        const band = new THREE.Mesh(bandGeo, bandMat);
        band.position.set(cx, 0.48, 0);
        group.add(cone, base, band);
      });
      this.disposables.push(coneGeo, baseGeo, bandGeo);
      return { group, speedOffset: 0, halfW: 0.95, minY: 0, maxY: 0.88, halfD: 0.38 };
    }

    if (type === 'cow') {
      const cowMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.78 });
      const spotMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.82 });
      const hornMat = new THREE.MeshStandardMaterial({ color: 0xfde68a, roughness: 0.45 });
      const garlandMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.6 });
      this.disposables.push(cowMat, spotMat, hornMat, garlandMat);

      const bodyGeo = new THREE.CapsuleGeometry(0.44, 0.95, 6, 12);
      bodyGeo.rotateZ(Math.PI / 2);
      const body = new THREE.Mesh(bodyGeo, cowMat);
      body.position.set(0, 0.85, 0);
      body.castShadow = true;

      const headGeo = new THREE.BoxGeometry(0.42, 0.42, 0.48);
      const head = new THREE.Mesh(headGeo, cowMat);
      head.position.set(0.75, 1.05, 0);

      const hornGeo = new THREE.ConeGeometry(0.06, 0.28, 8);
      const hL = new THREE.Mesh(hornGeo, hornMat);
      hL.position.set(0.76, 1.35, -0.14);
      hL.rotation.x = -0.35;
      const hR = hL.clone();
      hR.position.z = 0.14;
      hR.rotation.x = 0.35;

      const garlandGeo = new THREE.TorusGeometry(0.28, 0.065, 6, 14);
      garlandGeo.rotateY(Math.PI / 2);
      const garland = new THREE.Mesh(garlandGeo, garlandMat);
      garland.position.set(0.5, 0.95, 0);

      const spotGeo = new THREE.SphereGeometry(0.24, 8, 8);
      const spot = new THREE.Mesh(spotGeo, spotMat);
      spot.scale.set(1.2, 0.8, 0.6);
      spot.position.set(-0.1, 0.95, 0.34);

      const legGeo = new THREE.CylinderGeometry(0.08, 0.07, 0.62, 8);
      [
        [0.45, 0.31, 0.22],
        [0.45, 0.31, -0.22],
        [-0.45, 0.31, 0.22],
        [-0.45, 0.31, -0.22],
      ].forEach(([lx, ly, lz]) => {
        const leg = new THREE.Mesh(legGeo, cowMat);
        leg.position.set(lx, ly, lz);
        group.add(leg);
      });

      group.add(body, head, hL, hR, garland, spot);
      this.disposables.push(bodyGeo, headGeo, hornGeo, garlandGeo, spotGeo, legGeo);
      return { group, speedOffset: 0, halfW: 0.95, minY: 0, maxY: 1.32, halfD: 0.55 };
    }

    if (type === 'vendor_cart') {
      const woodMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.85 });
      const umbMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.65 });
      const potMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.25, metalness: 0.85 });
      this.disposables.push(woodMat, umbMat, potMat);

      const bedGeo = new THREE.BoxGeometry(1.75, 0.52, 2.2);
      const bed = new THREE.Mesh(bedGeo, woodMat);
      bed.position.y = 0.85;
      bed.castShadow = true;

      const poleGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.8, 8);
      const pole = new THREE.Mesh(poleGeo, woodMat);
      pole.position.y = 1.75;

      const umbGeo = new THREE.ConeGeometry(1.25, 0.55, 8);
      const umb = new THREE.Mesh(umbGeo, umbMat);
      umb.position.y = 2.65;
      umb.castShadow = true;

      const potGeo = new THREE.SphereGeometry(0.24, 10, 10);
      const pot = new THREE.Mesh(potGeo, potMat);
      pot.position.set(0.3, 1.28, 0.3);

      const wL = this.createWheel(0.45, 0.12);
      wL.position.set(-0.92, 0.45, 0);
      const wR = this.createWheel(0.45, 0.12);
      wR.position.set(0.92, 0.45, 0);

      group.add(bed, pole, umb, pot, wL, wR);
      this.disposables.push(bedGeo, poleGeo, umbGeo, potGeo);
      return { group, speedOffset: 0, halfW: 0.95, minY: 0, maxY: 2.85, halfD: 1.1 };
    }

    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.6, metalness: 0.5 });
    const hazardMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.45 });
    this.disposables.push(pillarMat, hazardMat);

    const postGeo = new THREE.CylinderGeometry(0.09, 0.09, 2.6, 8);
    const postL = new THREE.Mesh(postGeo, pillarMat);
    postL.position.set(-1.15, 1.3, 0);
    const postR = postL.clone();
    postR.position.x = 1.15;

    const beamGeo = new THREE.BoxGeometry(2.5, 0.95, 0.35);
    const beam = new THREE.Mesh(beamGeo, hazardMat);
    beam.position.set(0, 1.95, 0);
    beam.castShadow = true;

    group.add(postL, postR, beam);
    this.disposables.push(postGeo, beamGeo);
    return { group, speedOffset: 0, halfW: 1.05, minY: 1.25, maxY: 2.55, halfD: 0.35 };
  }

  private createPowerUpIcon(type: PowerUpType, colorHex: number): THREE.Group {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
      color: colorHex,
      emissive: colorHex,
      emissiveIntensity: 0.45,
      roughness: 0.25,
      metalness: 0.7,
    });
    const whiteMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.3,
      metalness: 0.2,
    });
    this.disposables.push(mat, whiteMat);

    if (type === 'magnet') {
      const geo = new THREE.TorusGeometry(0.32, 0.1, 8, 16, Math.PI);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.z = Math.PI;
      g.add(mesh);
      this.disposables.push(geo);
    } else if (type === 'super_jump') {
      // Magic Shoes! Twin floating sneaker shapes with small side wings
      const soleGeo = new THREE.BoxGeometry(0.24, 0.14, 0.48);
      const upperGeo = new THREE.BoxGeometry(0.22, 0.2, 0.28);
      const wingGeo = new THREE.BoxGeometry(0.18, 0.12, 0.04);
      [-0.17, 0.17].forEach((sx) => {
        const sole = new THREE.Mesh(soleGeo, whiteMat);
        sole.position.set(sx, -0.06, 0);
        const upper = new THREE.Mesh(upperGeo, mat);
        upper.position.set(sx, 0.08, -0.06);
        const wing = new THREE.Mesh(wingGeo, whiteMat);
        wing.position.set(sx + (sx < 0 ? -0.16 : 0.16), 0.12, 0);
        g.add(sole, upper, wing);
      });
      this.disposables.push(soleGeo, upperGeo, wingGeo);
    } else if (type === 'jetpack') {
      // Twin Jetpack Cylinders
      const tankGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.54, 10);
      [-0.16, 0.16].forEach((tx) => {
        const tank = new THREE.Mesh(tankGeo, mat);
        tank.position.set(tx, 0, 0);
        g.add(tank);
      });
      this.disposables.push(tankGeo);
    } else if (type === 'chai') {
      // Score Multiplier 2x Star
      const starGeo = new THREE.OctahedronGeometry(0.36, 0);
      const star = new THREE.Mesh(starGeo, mat);
      star.scale.set(1, 1.3, 0.5);
      g.add(star);
      this.disposables.push(starGeo);
    } else if (type === 'shield') {
      const octGeo = new THREE.OctahedronGeometry(0.38, 1);
      const oct = new THREE.Mesh(octGeo, mat);
      g.add(oct);
      this.disposables.push(octGeo);
    } else {
      const boxGeo = new THREE.DodecahedronGeometry(0.34, 0);
      const box = new THREE.Mesh(boxGeo, mat);
      g.add(box);
      this.disposables.push(boxGeo);
    }
    return g;
  }

  public spawnObstacle(type: ObstacleType, lane: number, zPos: number): boolean {
    const slot =
      this.obstacles.find((o) => !o.active && o.type === type) ??
      this.obstacles.find((o) => !o.active);
    if (!slot) return false;
    slot.active = true;
    slot.lane = lane;
    slot.scoredAvoid = false;
    slot.group.position.set(LANE_X[lane], 0, zPos);
    slot.group.visible = true;
    return true;
  }

  public spawnCoinLine(lane: number, startZ: number, count: number, yHeight = 1.05, arc = false): void {
    let spawned = 0;
    for (const coin of this.coins) {
      if (coin.active) continue;
      coin.active = true;
      coin.lane = lane;
      const t = count > 1 ? spawned / (count - 1) : 0;
      const y = arc ? yHeight + Math.sin(t * Math.PI) * 2.1 : yHeight;
      coin.baseY = y;
      coin.mesh.position.set(LANE_X[lane], y, startZ - spawned * 2.4);
      coin.mesh.visible = true;
      spawned++;
      if (spawned >= count) break;
    }
  }

  public spawnPowerUp(type: PowerUpType, lane: number, zPos: number, yPos = 1.3): void {
    const slot =
      this.powerUps.find((p) => !p.active && p.type === type) ??
      this.powerUps.find((p) => !p.active);
    if (!slot) return;
    slot.active = true;
    slot.group.position.set(LANE_X[lane], yPos, zPos);
    slot.group.visible = true;
  }

  public spawnRandomWingCollectible(lane: number, zPos: number, yPos = 1.45): void {
    const inactive = this.wingCollectibles.filter((w) => !w.active);
    if (inactive.length === 0) return;
    const pick = inactive[Math.floor(Math.random() * inactive.length)];
    pick.active = true;
    pick.group.position.set(LANE_X[lane], yPos, zPos);
    pick.group.visible = true;
  }

  public resetAll(): void {
    for (const o of this.obstacles) {
      o.active = false;
      o.group.visible = false;
    }
    for (const c of this.coins) {
      c.active = false;
      c.mesh.visible = false;
    }
    for (const p of this.powerUps) {
      p.active = false;
      p.group.visible = false;
    }
    for (const w of this.wingCollectibles) {
      w.active = false;
      w.group.visible = false;
    }
  }

  public dispose(): void {
    for (const d of this.disposables) d.dispose();
  }
}
