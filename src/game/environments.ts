import * as THREE from 'three';
import { ProceduralTextures } from './textures';
import { QualityLevel, TimeOfDayMode } from './types';

export type ZoneId = 'rajpath' | 'red_fort' | 'parliament';

interface RoadChunk {
  group: THREE.Group;
  zStart: number;
  zoneGroup: Record<ZoneId, THREE.Group>;
  flags: THREE.Mesh[];
  lampBulbs: THREE.MeshStandardMaterial[];
}

const CHUNK_LENGTH = 48;
const NUM_CHUNKS = 5;

const ZONE_NAMES: Record<ZoneId, string> = {
  rajpath: 'New Delhi · India Gate',
  red_fort: 'Old Delhi · Red Fort Bazaar',
  parliament: 'Sansad Marg · Metro Avenue',
};

const TIME_PALETTES = {
  day: {
    sky: new THREE.Color(0x7cc4fa),
    fog: new THREE.Color(0xbce0fd),
    sunColor: new THREE.Color(0xfff4d6),
    sunIntensity: 1.65,
    hemiSky: new THREE.Color(0x8fd3ff),
    hemiGround: new THREE.Color(0x8b6b4a),
    hemiIntensity: 0.72,
    lampGlow: 0.05,
  },
  sunset: {
    sky: new THREE.Color(0xf97316),
    fog: new THREE.Color(0xfdba74),
    sunColor: new THREE.Color(0xff9e44),
    sunIntensity: 1.35,
    hemiSky: new THREE.Color(0xfb923c),
    hemiGround: new THREE.Color(0x4c2838),
    hemiIntensity: 0.62,
    lampGlow: 0.55,
  },
  night: {
    sky: new THREE.Color(0x0b1224),
    fog: new THREE.Color(0x131d38),
    sunColor: new THREE.Color(0x93c5fd),
    sunIntensity: 0.65,
    hemiSky: new THREE.Color(0x3b4d7a),
    hemiGround: new THREE.Color(0x1a1e2e),
    hemiIntensity: 0.45,
    lampGlow: 1.45,
  },
};

export class EnvironmentManager {
  public readonly root = new THREE.Group();
  private readonly chunks: RoadChunk[] = [];
  private readonly sharedGeometries: THREE.BufferGeometry[] = [];
  private readonly sharedMaterials: THREE.Material[] = [];

  private currentZone: ZoneId = 'rajpath';
  private activeSky = new THREE.Color(0x7cc4fa);
  private activeFog = new THREE.Color(0xbce0fd);
  private activeSun = new THREE.Color(0xfff4d6);
  private activeHemiSky = new THREE.Color(0x8fd3ff);
  private activeHemiGround = new THREE.Color(0x8b6b4a);

  private readonly dirLight: THREE.DirectionalLight;
  private readonly hemiLight: THREE.HemisphereLight;
  private readonly scene: THREE.Scene;

  constructor(
    scene: THREE.Scene,
    textures: ProceduralTextures,
    dirLight: THREE.DirectionalLight,
    hemiLight: THREE.HemisphereLight
  ) {
    this.scene = scene;
    this.dirLight = dirLight;
    this.hemiLight = hemiLight;
    scene.add(this.root);

    // Shared materials
    const roadMat = new THREE.MeshStandardMaterial({
      map: textures.road,
      roughness: 0.88,
      metalness: 0.05,
    });
    const sideMat = new THREE.MeshStandardMaterial({
      map: textures.sidewalk,
      roughness: 0.85,
      metalness: 0.04,
    });
    const lawnMat = new THREE.MeshStandardMaterial({
      color: 0x3b7a3e,
      roughness: 0.94,
    });
    const sandstoneMat = new THREE.MeshStandardMaterial({
      map: textures.sandstone,
      roughness: 0.8,
      metalness: 0.05,
    });
    const redFortMat = new THREE.MeshStandardMaterial({
      map: textures.redFort,
      roughness: 0.82,
      metalness: 0.05,
    });
    const creamMarbleMat = new THREE.MeshStandardMaterial({
      color: 0xf4efe6,
      roughness: 0.55,
      metalness: 0.1,
    });
    const flagMat = new THREE.MeshStandardMaterial({
      map: textures.indianFlag,
      roughness: 0.65,
      side: THREE.DoubleSide,
    });
    const poleMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      roughness: 0.3,
      metalness: 0.8,
    });
    const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.9 });
    const treeLeafMat = new THREE.MeshStandardMaterial({ color: 0x2e6f40, roughness: 0.82 });
    const shopSignMats = [
      new THREE.MeshStandardMaterial({ map: textures.shopSignChai, roughness: 0.45 }),
      new THREE.MeshStandardMaterial({ map: textures.shopSignMithai, roughness: 0.45 }),
      new THREE.MeshStandardMaterial({ map: textures.shopSignBazaar, roughness: 0.45 }),
    ];
    const shopBodyMats = [
      new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.78 }),
      new THREE.MeshStandardMaterial({ color: 0xfecdd3, roughness: 0.78 }),
      new THREE.MeshStandardMaterial({ color: 0xd1fae5, roughness: 0.78 }),
    ];
    const awningMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.65 });
    const metroMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.6, metalness: 0.25 });

    this.sharedMaterials.push(
      roadMat,
      sideMat,
      lawnMat,
      sandstoneMat,
      redFortMat,
      creamMarbleMat,
      flagMat,
      poleMat,
      treeTrunkMat,
      treeLeafMat,
      awningMat,
      metroMat,
      ...shopSignMats,
      ...shopBodyMats
    );

    // Shared geometries
    const roadGeo = new THREE.PlaneGeometry(11.4, CHUNK_LENGTH);
    const sideGeo = new THREE.BoxGeometry(3.2, 0.28, CHUNK_LENGTH);
    const groundGeo = new THREE.PlaneGeometry(120, CHUNK_LENGTH);
    const poleGeo = new THREE.CylinderGeometry(0.06, 0.08, 6.2, 8);
    const flagGeo = new THREE.PlaneGeometry(1.7, 1.1, 6, 3);
    const lampArmGeo = new THREE.BoxGeometry(1.2, 0.08, 0.08);
    const bulbGeo = new THREE.SphereGeometry(0.18, 8, 8);
    const trunkGeo = new THREE.CylinderGeometry(0.22, 0.3, 2.2, 7);
    const canopyGeo = new THREE.DodecahedronGeometry(1.45, 1);

    this.sharedGeometries.push(
      roadGeo,
      sideGeo,
      groundGeo,
      poleGeo,
      flagGeo,
      lampArmGeo,
      bulbGeo,
      trunkGeo,
      canopyGeo
    );

    // Build reusable India Gate / Red Fort / Parliament chunk decorations
    for (let c = 0; c < NUM_CHUNKS; c++) {
      const group = new THREE.Group();
      const zStart = -c * CHUNK_LENGTH;
      group.position.z = zStart;

      // Ground & 3-lane road
      const ground = new THREE.Mesh(groundGeo, lawnMat);
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -0.02;
      ground.receiveShadow = true;
      group.add(ground);

      const road = new THREE.Mesh(roadGeo, roadMat);
      road.rotation.x = -Math.PI / 2;
      road.position.y = 0.01;
      road.receiveShadow = true;
      group.add(road);

      [-7.2, 7.2].forEach((sx) => {
        const sw = new THREE.Mesh(sideGeo, sideMat);
        sw.position.set(sx, 0.14, 0);
        sw.receiveShadow = true;
        group.add(sw);
      });

      const flags: THREE.Mesh[] = [];
      const lampBulbs: THREE.MeshStandardMaterial[] = [];

      // Streetlights & Indian Flags along sidewalks
      for (let zOff = -16; zOff <= 16; zOff += 16) {
        [-6.3, 6.3].forEach((lx) => {
          const lampPost = new THREE.Mesh(poleGeo, poleMat);
          lampPost.position.set(lx, 3.1, zOff);
          group.add(lampPost);

          const arm = new THREE.Mesh(lampArmGeo, poleMat);
          arm.position.set(lx + (lx < 0 ? 0.55 : -0.55), 6.05, zOff);
          group.add(arm);

          const bulbMat = new THREE.MeshStandardMaterial({
            color: 0xfef08a,
            emissive: 0xf59e0b,
            emissiveIntensity: 0.1,
            roughness: 0.2,
          });
          lampBulbs.push(bulbMat);
          this.sharedMaterials.push(bulbMat);
          const bulb = new THREE.Mesh(bulbGeo, bulbMat);
          bulb.position.set(lx + (lx < 0 ? 1.0 : -1.0), 5.9, zOff);
          group.add(bulb);
        });
      }

      // Indian Flag poles every chunk
      [-8.4, 8.4].forEach((fx) => {
        const fp = new THREE.Mesh(poleGeo, poleMat);
        fp.position.set(fx, 3.5, 0);
        fp.scale.y = 1.25;
        group.add(fp);

        const flag = new THREE.Mesh(flagGeo, flagMat);
        flag.position.set(fx + (fx < 0 ? 0.85 : -0.85), 6.9, 0);
        group.add(flag);
        flags.push(flag);
      });

      // Zone-specific groups (we toggle visibility cleanly without GC!)
      const rajpathGroup = new THREE.Group();
      const redFortGroup = new THREE.Group();
      const parliamentGroup = new THREE.Group();

      // --- ZONE 1: RAJPATH & INDIA GATE ---
      if (c % 2 === 0) {
        // Grand India Gate inspired arch spanning over the road!
        const gate = new THREE.Group();
        const pillarGeo = new THREE.BoxGeometry(2.6, 13.5, 3.2);
        const lintelGeo = new THREE.BoxGeometry(17.6, 3.4, 3.4);
        const domeGeo = new THREE.CylinderGeometry(2.8, 3.3, 1.8, 12);
        this.sharedGeometries.push(pillarGeo, lintelGeo, domeGeo);

        const pL = new THREE.Mesh(pillarGeo, sandstoneMat);
        pL.position.set(-7.5, 6.75, 0);
        pL.castShadow = true;
        const pR = new THREE.Mesh(pillarGeo, sandstoneMat);
        pR.position.set(7.5, 6.75, 0);
        pR.castShadow = true;
        const lintel = new THREE.Mesh(lintelGeo, sandstoneMat);
        lintel.position.set(0, 14.5, 0);
        lintel.castShadow = true;
        const crown = new THREE.Mesh(domeGeo, sandstoneMat);
        crown.position.set(0, 17.0, 0);
        gate.add(pL, pR, lintel, crown);
        rajpathGroup.add(gate);
      } else {
        // Heritage Delhi Trees + Road Signs
        [-11.5, 11.5].forEach((tx, idx) => {
          [-14, 2, 16].forEach((tz) => {
            const trunk = new THREE.Mesh(trunkGeo, treeTrunkMat);
            trunk.position.set(tx, 1.1, tz);
            const canopy = new THREE.Mesh(canopyGeo, treeLeafMat);
            canopy.position.set(tx, 3.1, tz);
            canopy.scale.setScalar(1 + (idx % 2) * 0.15);
            rajpathGroup.add(trunk, canopy);
          });
        });
      }

      // --- ZONE 2: RED FORT & INDIAN BAZAAR SHOPS ---
      const wallGeo = new THREE.BoxGeometry(3.2, 8.5, CHUNK_LENGTH * 0.92);
      const shopGeo = new THREE.BoxGeometry(4.4, 4.8, 10);
      const signGeo = new THREE.PlaneGeometry(4.2, 1.5);
      const awningGeo = new THREE.BoxGeometry(1.8, 0.22, 9.6);
      const chhatriGeo = new THREE.ConeGeometry(1.4, 1.6, 8);
      this.sharedGeometries.push(wallGeo, shopGeo, signGeo, awningGeo, chhatriGeo);

      [-11.5, 11.5].forEach((bx, sideIdx) => {
        const fortWall = new THREE.Mesh(wallGeo, redFortMat);
        fortWall.position.set(bx + (sideIdx === 0 ? -4.5 : 4.5), 4.25, 0);
        redFortGroup.add(fortWall);

        // Chhatri dome atop wall
        const chhatri = new THREE.Mesh(chhatriGeo, creamMarbleMat);
        chhatri.position.set(bx + (sideIdx === 0 ? -4.5 : 4.5), 9.4, 0);
        redFortGroup.add(chhatri);

        // 2 vibrant Indian Market shops per side
        [-12, 12].forEach((sz, sIdx) => {
          const shop = new THREE.Mesh(shopGeo, shopBodyMats[(sIdx + sideIdx) % shopBodyMats.length]);
          shop.position.set(bx, 2.4, sz);
          shop.castShadow = true;
          redFortGroup.add(shop);

          const awning = new THREE.Mesh(awningGeo, awningMat);
          awning.position.set(bx + (sideIdx === 0 ? 2.6 : -2.6), 3.3, sz);
          awning.rotation.z = sideIdx === 0 ? -0.35 : 0.35;
          redFortGroup.add(awning);

          const sign = new THREE.Mesh(signGeo, shopSignMats[(sIdx + sideIdx) % shopSignMats.length]);
          sign.position.set(bx + (sideIdx === 0 ? 2.25 : -2.25), 4.1, sz);
          sign.rotation.y = sideIdx === 0 ? Math.PI / 2 : -Math.PI / 2;
          redFortGroup.add(sign);
        });
      });

      // --- ZONE 3: PARLIAMENT & METRO CORRIDOR ---
      const parlBodyGeo = new THREE.CylinderGeometry(6.5, 6.8, 7.5, 18);
      const parlDomeGeo = new THREE.SphereGeometry(4.2, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
      const metroBeamGeo = new THREE.BoxGeometry(2.4, 1.5, CHUNK_LENGTH);
      const metroPillarGeo = new THREE.CylinderGeometry(0.6, 0.7, 9.2, 10);
      this.sharedGeometries.push(parlBodyGeo, parlDomeGeo, metroBeamGeo, metroPillarGeo);

      [-15, 15].forEach((px, idx) => {
        if (idx === 0) {
          const parl = new THREE.Mesh(parlBodyGeo, sandstoneMat);
          parl.position.set(px, 3.75, 0);
          const dome = new THREE.Mesh(parlDomeGeo, creamMarbleMat);
          dome.position.set(px, 7.5, 0);
          parliamentGroup.add(parl, dome);
        } else {
          const beam = new THREE.Mesh(metroBeamGeo, metroMat);
          beam.position.set(px - 2.5, 9.2, 0);
          const mPillar = new THREE.Mesh(metroPillarGeo, metroMat);
          mPillar.position.set(px - 2.5, 4.6, 0);
          parliamentGroup.add(beam, mPillar);
        }
      });

      group.add(rajpathGroup, redFortGroup, parliamentGroup);
      this.root.add(group);

      this.chunks.push({
        group,
        zStart,
        zoneGroup: {
          rajpath: rajpathGroup,
          red_fort: redFortGroup,
          parliament: parliamentGroup,
        },
        flags,
        lampBulbs,
      });
    }

    this.applyZoneVisibility('rajpath');
  }

  private applyZoneVisibility(zone: ZoneId): void {
    this.currentZone = zone;
    for (const chunk of this.chunks) {
      chunk.zoneGroup.rajpath.visible = zone === 'rajpath';
      chunk.zoneGroup.red_fort.visible = zone === 'red_fort';
      chunk.zoneGroup.parliament.visible = zone === 'parliament';
    }
  }

  public getZoneForDistance(distance: number): { id: ZoneId; label: string } {
    const idx = Math.floor(distance / 420) % 3;
    const id: ZoneId = idx === 0 ? 'rajpath' : idx === 1 ? 'red_fort' : 'parliament';
    return { id, label: ZONE_NAMES[id] };
  }

  public setQuality(quality: QualityLevel): void {
    // Adjust fog & far sight distance cleanly
    if (this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.near = quality === 'low' ? 28 : 42;
      this.scene.fog.far = quality === 'low' ? 92 : quality === 'medium' ? 128 : 155;
    }
  }

  public update(
    delta: number,
    elapsed: number,
    forwardSpeed: number,
    distance: number,
    timeMode: TimeOfDayMode
  ): { zoneLabel: string; timePhase: 'Day' | 'Sunset' | 'Night' } {
    // 1. Rotate Zone every 420m
    const zoneInfo = this.getZoneForDistance(distance);
    if (zoneInfo.id !== this.currentZone) {
      this.applyZoneVisibility(zoneInfo.id);
    }

    // 2. Scroll road chunks towards +Z (so runner runs towards -Z cleanly at z=0)
    const recycleZ = CHUNK_LENGTH;
    for (const chunk of this.chunks) {
      chunk.group.position.z += forwardSpeed * delta;
      if (chunk.group.position.z > recycleZ) {
        chunk.group.position.z -= NUM_CHUNKS * CHUNK_LENGTH;
      }

      // Gentle flag flutter
      for (let i = 0; i < chunk.flags.length; i++) {
        chunk.flags[i].rotation.y = Math.sin(elapsed * 5.2 + i + chunk.group.position.z * 0.1) * 0.14;
      }
    }

    // 3. Determine Day / Sunset / Night target palette
    let phase: 'Day' | 'Sunset' | 'Night' = 'Day';
    let target = TIME_PALETTES.day;
    if (timeMode === 'sunset') {
      phase = 'Sunset';
      target = TIME_PALETTES.sunset;
    } else if (timeMode === 'night') {
      phase = 'Night';
      target = TIME_PALETTES.night;
    } else if (timeMode === 'auto') {
      const cycle = Math.floor(distance / 320) % 3;
      if (cycle === 1) {
        phase = 'Sunset';
        target = TIME_PALETTES.sunset;
      } else if (cycle === 2) {
        phase = 'Night';
        target = TIME_PALETTES.night;
      }
    }

    const lerpAmt = Math.min(1, delta * 1.4);
    this.activeSky.lerp(target.sky, lerpAmt);
    this.activeFog.lerp(target.fog, lerpAmt);
    this.activeSun.lerp(target.sunColor, lerpAmt);
    this.activeHemiSky.lerp(target.hemiSky, lerpAmt);
    this.activeHemiGround.lerp(target.hemiGround, lerpAmt);

    if (this.scene.background instanceof THREE.Color) {
      this.scene.background.copy(this.activeSky);
    }
    if (this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.color.copy(this.activeFog);
    }
    this.dirLight.color.copy(this.activeSun);
    this.dirLight.intensity = THREE.MathUtils.lerp(this.dirLight.intensity, target.sunIntensity, lerpAmt);
    this.hemiLight.color.copy(this.activeHemiSky);
    this.hemiLight.groundColor.copy(this.activeHemiGround);
    this.hemiLight.intensity = THREE.MathUtils.lerp(
      this.hemiLight.intensity,
      target.hemiIntensity,
      lerpAmt
    );

    for (const chunk of this.chunks) {
      for (const b of chunk.lampBulbs) {
        b.emissiveIntensity = THREE.MathUtils.lerp(b.emissiveIntensity, target.lampGlow, lerpAmt);
      }
    }

    return { zoneLabel: zoneInfo.label, timePhase: phase };
  }

  public dispose(): void {
    for (const g of this.sharedGeometries) g.dispose();
    for (const m of this.sharedMaterials) m.dispose();
  }
}
