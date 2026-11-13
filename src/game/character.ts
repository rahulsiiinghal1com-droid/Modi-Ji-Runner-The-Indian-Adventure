import * as THREE from 'three';
import { CharacterId, OUTFIT_CATALOG, OutfitId, WING_CATALOG, WingId } from './types';

export interface CharacterAnimState {
  isGrounded: boolean;
  isSliding: boolean;
  isFlying: boolean;
  isJetpack: boolean;
  hasShield: boolean;
  hasMagicShoes: boolean;
  showWings: boolean;
  isCrashed: boolean;
  speedRatio: number;
  laneTilt: number; // -1 to 1
  showcaseMode: 'none' | 'menu' | 'shop_characters' | 'shop_outfits' | 'shop_wings';
}

function createFeatherGeometry(length: number, width: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(width * 0.55, length * 0.35, width * 0.42, length * 0.82);
  shape.quadraticCurveTo(width * 0.12, length * 1.02, 0, length);
  shape.quadraticCurveTo(-width * 0.12, length * 1.02, -width * 0.42, length * 0.82);
  shape.quadraticCurveTo(-width * 0.55, length * 0.35, 0, 0);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.04,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.015,
    bevelSegments: 2,
    curveSegments: 8,
  });
  geo.center();
  geo.translate(0, length * 0.48, 0);
  return geo;
}

export class ModiRunnerCharacter {
  public readonly root = new THREE.Group();
  private readonly bodyPivot = new THREE.Group();
  private readonly torso = new THREE.Group();
  private readonly head = new THREE.Group();
  private readonly leftArm = new THREE.Group();
  private readonly rightArm = new THREE.Group();
  private readonly leftLeg = new THREE.Group();
  private readonly rightLeg = new THREE.Group();

  // Character-specific groups (Modi Ji vs Gandhi Ji)
  private readonly modiClothesGroup = new THREE.Group();
  private readonly modiHeadDetails = new THREE.Group();
  private readonly gandhiClothesGroup = new THREE.Group();
  private readonly gandhiHeadDetails = new THREE.Group();
  private readonly gandhiStick = new THREE.Group();

  // Wings (hidden by default unless Wing power-up collected or previewed in Wing Shop)
  private readonly wingsRoot = new THREE.Group();
  private readonly leftWing = new THREE.Group();
  private readonly rightWing = new THREE.Group();
  private readonly leftFeathers: THREE.Mesh[] = [];
  private readonly rightFeathers: THREE.Mesh[] = [];
  private wingPrimaryMat: THREE.MeshPhysicalMaterial;
  private wingSecondaryMat: THREE.MeshPhysicalMaterial;
  private wingCoreMat: THREE.MeshStandardMaterial;

  // Outfit materials & accessories
  private kurtaMat: THREE.MeshStandardMaterial;
  private jacketMat: THREE.MeshStandardMaterial;
  private churidarMat: THREE.MeshStandardMaterial;
  private accentMat: THREE.MeshStandardMaterial;
  private skinMat: THREE.MeshStandardMaterial;
  private capeMesh: THREE.Mesh;
  private spacePack: THREE.Group;

  // Power-up visuals on character
  private shieldSphere: THREE.Mesh;
  private jetpackGroup: THREE.Group;
  private jetFlameL: THREE.Mesh;
  private jetFlameR: THREE.Mesh;
  private magicShoeGlowL: THREE.Mesh;
  private magicShoeGlowR: THREE.Mesh;

  private currentCharacter: CharacterId = 'modi';
  private currentWingId: WingId = 'golden';
  private runCycle = 0;
  private wingCycle = 0;
  private stepTriggered = false;
  private readonly disposables: Array<{ dispose: () => void }> = [];

  constructor() {
    this.root.add(this.bodyPivot);

    // Materials
    this.skinMat = new THREE.MeshStandardMaterial({
      color: 0xe6a87c,
      roughness: 0.65,
      metalness: 0.02,
    });
    const hairMat = new THREE.MeshStandardMaterial({
      color: 0xf4f6f8,
      roughness: 0.72,
      metalness: 0.05,
    });
    const eyeDarkMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.2,
      metalness: 0.1,
    });
    const eyeWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.25,
    });
    const glassesRimMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.25,
      metalness: 0.85,
    });
    const glassesLensMat = new THREE.MeshPhysicalMaterial({
      color: 0xe0f2fe,
      roughness: 0.08,
      metalness: 0.1,
      transparent: true,
      opacity: 0.35,
    });
    const shoeMat = new THREE.MeshStandardMaterial({
      color: 0x3b2314,
      roughness: 0.55,
      metalness: 0.1,
    });
    const dhotiMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.82,
      metalness: 0.02,
    });
    const stickMat = new THREE.MeshStandardMaterial({
      color: 0x7c4a24,
      roughness: 0.72,
      metalness: 0.05,
    });

    this.kurtaMat = new THREE.MeshStandardMaterial({
      color: 0xfaf7f0,
      roughness: 0.75,
      metalness: 0.05,
    });
    this.jacketMat = new THREE.MeshStandardMaterial({
      color: 0xff6b1a,
      roughness: 0.52,
      metalness: 0.15,
    });
    this.churidarMat = new THREE.MeshStandardMaterial({
      color: 0xf1ede4,
      roughness: 0.78,
      metalness: 0.02,
    });
    this.accentMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.3,
      metalness: 0.65,
    });

    this.wingPrimaryMat = new THREE.MeshPhysicalMaterial({
      color: 0xffc107,
      emissive: 0xff8f00,
      emissiveIntensity: 0.35,
      roughness: 0.22,
      metalness: 0.82,
      clearcoat: 0.6,
    });
    this.wingSecondaryMat = new THREE.MeshPhysicalMaterial({
      color: 0xffe082,
      emissive: 0xffb300,
      emissiveIntensity: 0.28,
      roughness: 0.28,
      metalness: 0.72,
      clearcoat: 0.5,
    });
    this.wingCoreMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.25,
      metalness: 0.9,
      emissive: 0xd97706,
      emissiveIntensity: 0.3,
    });

    const magicShoeMat = new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      transparent: true,
      opacity: 0.7,
    });

    this.disposables.push(
      this.skinMat,
      hairMat,
      eyeDarkMat,
      eyeWhiteMat,
      glassesRimMat,
      glassesLensMat,
      shoeMat,
      dhotiMat,
      stickMat,
      this.kurtaMat,
      this.jacketMat,
      this.churidarMat,
      this.accentMat,
      this.wingPrimaryMat,
      this.wingSecondaryMat,
      this.wingCoreMat,
      magicShoeMat
    );

    // --- LEGS ---
    const shoeGlowGeo = new THREE.SphereGeometry(0.24, 10, 10);
    this.disposables.push(shoeGlowGeo);

    const buildLeg = (side: -1 | 1, group: THREE.Group): THREE.Mesh => {
      group.position.set(side * 0.2, 0.85, 0);

      const thighGeo = new THREE.CapsuleGeometry(0.145, 0.28, 6, 12);
      const thigh = new THREE.Mesh(thighGeo, this.churidarMat);
      thigh.position.y = -0.22;
      thigh.castShadow = true;
      group.add(thigh);

      const shinGeo = new THREE.CylinderGeometry(0.115, 0.09, 0.36, 12);
      const shin = new THREE.Mesh(shinGeo, this.churidarMat);
      shin.position.y = -0.54;
      shin.castShadow = true;
      group.add(shin);

      const shoeGeo = new THREE.BoxGeometry(0.2, 0.13, 0.36);
      const shoe = new THREE.Mesh(shoeGeo, shoeMat);
      shoe.position.set(0, -0.77, 0.07);
      shoe.castShadow = true;
      group.add(shoe);

      const toeGeo = new THREE.ConeGeometry(0.08, 0.14, 8);
      const toe = new THREE.Mesh(toeGeo, this.accentMat);
      toe.rotation.x = Math.PI * 0.35;
      toe.position.set(0, -0.75, 0.26);
      group.add(toe);

      const magicGlow = new THREE.Mesh(shoeGlowGeo, magicShoeMat);
      magicGlow.scale.set(1.0, 0.65, 1.6);
      magicGlow.position.set(0, -0.76, 0.08);
      magicGlow.visible = false;
      group.add(magicGlow);

      this.disposables.push(thighGeo, shinGeo, shoeGeo, toeGeo);
      this.bodyPivot.add(group);
      return magicGlow;
    };
    this.magicShoeGlowL = buildLeg(-1, this.leftLeg);
    this.magicShoeGlowR = buildLeg(1, this.rightLeg);

    // --- TORSO ---
    this.torso.position.set(0, 0.88, 0);
    this.bodyPivot.add(this.torso);

    // 1. MODI JI CLOTHES
    this.torso.add(this.modiClothesGroup);
    const hemGeo = new THREE.CylinderGeometry(0.32, 0.39, 0.42, 16);
    const hem = new THREE.Mesh(hemGeo, this.kurtaMat);
    hem.position.y = 0.12;
    hem.castShadow = true;
    this.modiClothesGroup.add(hem);

    const chestGeo = new THREE.CylinderGeometry(0.35, 0.33, 0.62, 16);
    const chest = new THREE.Mesh(chestGeo, this.kurtaMat);
    chest.position.y = 0.48;
    chest.castShadow = true;
    this.modiClothesGroup.add(chest);

    const jacketGeo = new THREE.CylinderGeometry(
      0.37,
      0.355,
      0.58,
      16,
      1,
      false,
      -Math.PI * 0.82,
      Math.PI * 1.64
    );
    const jacket = new THREE.Mesh(jacketGeo, this.jacketMat);
    jacket.position.set(0, 0.48, -0.01);
    jacket.rotation.y = Math.PI;
    jacket.castShadow = true;
    this.modiClothesGroup.add(jacket);

    const collarGeo = new THREE.TorusGeometry(0.18, 0.055, 8, 18);
    const collar = new THREE.Mesh(collarGeo, this.jacketMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, 0.78, 0);
    this.modiClothesGroup.add(collar);

    const pocketGeo = new THREE.BoxGeometry(0.13, 0.09, 0.04);
    const pocket = new THREE.Mesh(pocketGeo, this.jacketMat);
    pocket.position.set(-0.16, 0.57, 0.34);
    this.modiClothesGroup.add(pocket);

    const sqGeo = new THREE.ConeGeometry(0.055, 0.08, 4);
    const sq = new THREE.Mesh(sqGeo, this.accentMat);
    sq.position.set(-0.16, 0.63, 0.35);
    this.modiClothesGroup.add(sq);

    const btnGeo = new THREE.SphereGeometry(0.025, 8, 8);
    for (let i = 0; i < 4; i++) {
      const btn = new THREE.Mesh(btnGeo, this.accentMat);
      btn.position.set(0, 0.66 - i * 0.12, 0.355);
      this.modiClothesGroup.add(btn);
    }

    const capeGeo = new THREE.PlaneGeometry(0.75, 1.05, 4, 4);
    const capeMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      roughness: 0.6,
      side: THREE.DoubleSide,
    });
    this.capeMesh = new THREE.Mesh(capeGeo, capeMat);
    this.capeMesh.position.set(0, 0.25, -0.38);
    this.capeMesh.rotation.x = 0.22;
    this.capeMesh.visible = false;
    this.modiClothesGroup.add(this.capeMesh);

    this.spacePack = new THREE.Group();
    const packBoxGeo = new THREE.BoxGeometry(0.42, 0.44, 0.2);
    const packBox = new THREE.Mesh(packBoxGeo, this.jacketMat);
    packBox.position.set(0, 0.5, -0.38);
    this.spacePack.add(packBox);
    this.spacePack.visible = false;
    this.modiClothesGroup.add(this.spacePack);

    // 2. GANDHI JI CLOTHES (Thin elderly chest + White Dhoti + Khadi Shawl)
    this.torso.add(this.gandhiClothesGroup);
    const gChestGeo = new THREE.CylinderGeometry(0.28, 0.27, 0.64, 14);
    const gChest = new THREE.Mesh(gChestGeo, this.skinMat);
    gChest.position.y = 0.48;
    gChest.castShadow = true;
    this.gandhiClothesGroup.add(gChest);

    // White Khadi shawl draped across shoulder and back
    const shawlGeo = new THREE.CylinderGeometry(0.305, 0.305, 0.56, 14, 1, false, -0.6, Math.PI * 1.45);
    const shawl = new THREE.Mesh(shawlGeo, dhotiMat);
    shawl.position.set(0, 0.5, -0.02);
    shawl.rotation.z = 0.22;
    shawl.castShadow = true;
    this.gandhiClothesGroup.add(shawl);

    // White Dhoti waist & skirt wrap
    const dhotiWaistGeo = new THREE.CylinderGeometry(0.305, 0.34, 0.48, 16);
    const dhotiWaist = new THREE.Mesh(dhotiWaistGeo, dhotiMat);
    dhotiWaist.position.y = 0.08;
    dhotiWaist.castShadow = true;
    this.gandhiClothesGroup.add(dhotiWaist);
    this.gandhiClothesGroup.visible = false;

    this.disposables.push(
      hemGeo,
      chestGeo,
      jacketGeo,
      collarGeo,
      pocketGeo,
      sqGeo,
      btnGeo,
      capeGeo,
      capeMat,
      packBoxGeo,
      gChestGeo,
      shawlGeo,
      dhotiWaistGeo
    );

    // --- ARMS ---
    const buildArm = (side: -1 | 1, group: THREE.Group) => {
      group.position.set(side * 0.42, 0.72, 0);

      const sleeveGeo = new THREE.CapsuleGeometry(0.105, 0.32, 6, 10);
      const sleeve = new THREE.Mesh(sleeveGeo, this.kurtaMat);
      sleeve.position.y = -0.22;
      sleeve.castShadow = true;
      group.add(sleeve);

      const cuffGeo = new THREE.CylinderGeometry(0.1, 0.105, 0.06, 10);
      const cuff = new THREE.Mesh(cuffGeo, this.accentMat);
      cuff.position.y = -0.39;
      group.add(cuff);

      const handGeo = new THREE.SphereGeometry(0.09, 10, 10);
      const hand = new THREE.Mesh(handGeo, this.skinMat);
      hand.position.y = -0.47;
      group.add(hand);

      this.disposables.push(sleeveGeo, cuffGeo, handGeo);
      this.torso.add(group);
    };
    buildArm(-1, this.leftArm);
    buildArm(1, this.rightArm);

    // Gandhi Ji's wooden walking stick (Lathi) in right hand (local -X is right when facing +Z)
    const stickShaftGeo = new THREE.CylinderGeometry(0.025, 0.022, 1.35, 8);
    const stickShaft = new THREE.Mesh(stickShaftGeo, stickMat);
    stickShaft.position.set(0, -0.35, 0.18);
    stickShaft.rotation.x = 0.35;
    const stickHookGeo = new THREE.TorusGeometry(0.075, 0.024, 6, 12, Math.PI);
    const stickHook = new THREE.Mesh(stickHookGeo, stickMat);
    stickHook.position.set(0, 0.32, 0.4);
    stickHook.rotation.y = Math.PI / 2;
    this.gandhiStick.add(stickShaft, stickHook);
    this.gandhiStick.position.set(-0.02, -0.44, 0.04);
    this.gandhiStick.visible = false;
    this.leftArm.add(this.gandhiStick);
    this.disposables.push(stickShaftGeo, stickHookGeo);

    // --- HEAD ---
    this.head.position.set(0, 0.92, 0);
    this.torso.add(this.head);

    const neckGeo = new THREE.CylinderGeometry(0.13, 0.15, 0.16, 12);
    const neck = new THREE.Mesh(neckGeo, this.skinMat);
    neck.position.y = -0.02;
    this.head.add(neck);

    const craniumGeo = new THREE.SphereGeometry(0.32, 22, 20);
    const cranium = new THREE.Mesh(craniumGeo, this.skinMat);
    cranium.scale.set(0.96, 1.08, 0.96);
    cranium.position.y = 0.24;
    cranium.castShadow = true;
    this.head.add(cranium);

    const earGeo = new THREE.SphereGeometry(0.07, 10, 10);
    const earL = new THREE.Mesh(earGeo, this.skinMat);
    earL.scale.set(0.55, 1.15, 0.8);
    earL.position.set(-0.31, 0.23, -0.02);
    const earR = earL.clone();
    earR.position.x = 0.31;
    this.head.add(earL, earR);

    // Shared Cartoon Eyes + Nose + Smile + Iconic Round Glasses
    const noseGeo = new THREE.SphereGeometry(0.052, 10, 10);
    const nose = new THREE.Mesh(noseGeo, this.skinMat);
    nose.scale.set(0.9, 1.15, 1.2);
    nose.position.set(0, 0.21, 0.31);
    this.head.add(nose);

    const scleraGeo = new THREE.SphereGeometry(0.052, 12, 12);
    const pupilGeo = new THREE.SphereGeometry(0.03, 10, 10);
    const catchGeo = new THREE.SphereGeometry(0.011, 8, 8);
    [-1, 1].forEach((side) => {
      const eyeX = side * 0.115;
      const sclera = new THREE.Mesh(scleraGeo, eyeWhiteMat);
      sclera.position.set(eyeX, 0.28, 0.27);
      const pupil = new THREE.Mesh(pupilGeo, eyeDarkMat);
      pupil.position.set(eyeX, 0.28, 0.302);
      const catchlight = new THREE.Mesh(catchGeo, eyeWhiteMat);
      catchlight.position.set(eyeX + 0.012, 0.295, 0.324);
      this.head.add(sclera, pupil, catchlight);
    });

    const browGeo = new THREE.CapsuleGeometry(0.022, 0.09, 4, 8);
    [-1, 1].forEach((side) => {
      const brow = new THREE.Mesh(browGeo, hairMat);
      brow.rotation.z = Math.PI / 2 - side * 0.1;
      brow.position.set(side * 0.12, 0.365, 0.28);
      this.head.add(brow);
    });

    const mustacheGeo = new THREE.CapsuleGeometry(0.042, 0.16, 4, 8);
    const mustache = new THREE.Mesh(mustacheGeo, hairMat);
    mustache.rotation.z = Math.PI / 2;
    mustache.position.set(0, 0.14, 0.305);
    this.head.add(mustache);

    const smileGeo = new THREE.TorusGeometry(0.055, 0.014, 6, 12, Math.PI);
    const smileMat = new THREE.MeshBasicMaterial({ color: 0x7c2d12 });
    const smile = new THREE.Mesh(smileGeo, smileMat);
    smile.rotation.z = Math.PI;
    smile.position.set(0, 0.095, 0.305);
    this.head.add(smile);

    // Round Wire-Rim Spectacles (shared signature detail for both Modi Ji and Gandhi Ji!)
    const rimGeo = new THREE.TorusGeometry(0.088, 0.011, 8, 22);
    const lensGeo = new THREE.CircleGeometry(0.084, 20);
    const bridgeGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.07, 6);
    const templeGeo = new THREE.CylinderGeometry(0.007, 0.007, 0.3, 6);

    const rimL = new THREE.Mesh(rimGeo, glassesRimMat);
    rimL.position.set(-0.115, 0.28, 0.335);
    const rimR = new THREE.Mesh(rimGeo, glassesRimMat);
    rimR.position.set(0.115, 0.28, 0.335);
    const lensL = new THREE.Mesh(lensGeo, glassesLensMat);
    lensL.position.set(-0.115, 0.28, 0.332);
    const lensR = new THREE.Mesh(lensGeo, glassesLensMat);
    lensR.position.set(0.115, 0.28, 0.332);
    const bridge = new THREE.Mesh(bridgeGeo, glassesRimMat);
    bridge.rotation.z = Math.PI / 2;
    bridge.position.set(0, 0.29, 0.335);
    const templeL = new THREE.Mesh(templeGeo, glassesRimMat);
    templeL.rotation.x = Math.PI / 2;
    templeL.position.set(-0.205, 0.285, 0.19);
    const templeR = templeL.clone();
    templeR.position.x = 0.205;
    this.head.add(rimL, rimR, lensL, lensR, bridge, templeL, templeR);

    // Modi Ji Hair & Full Beard
    this.head.add(this.modiHeadDetails);
    const hairBackGeo = new THREE.SphereGeometry(0.33, 18, 16, 0, Math.PI * 2, 0, Math.PI * 0.56);
    const hairBack = new THREE.Mesh(hairBackGeo, hairMat);
    hairBack.position.set(0, 0.27, -0.02);
    hairBack.rotation.x = -0.22;
    this.modiHeadDetails.add(hairBack);

    const hairSweepGeo = new THREE.BoxGeometry(0.46, 0.13, 0.24);
    const hairSweep = new THREE.Mesh(hairSweepGeo, hairMat);
    hairSweep.position.set(0.02, 0.51, 0.11);
    hairSweep.rotation.z = -0.08;
    this.modiHeadDetails.add(hairSweep);

    const beardMainGeo = new THREE.SphereGeometry(
      0.295,
      18,
      14,
      0,
      Math.PI * 2,
      Math.PI * 0.45,
      Math.PI * 0.55
    );
    const beardMain = new THREE.Mesh(beardMainGeo, hairMat);
    beardMain.position.set(0, 0.17, 0.04);
    beardMain.scale.set(1.0, 1.18, 1.02);
    this.modiHeadDetails.add(beardMain);

    const chinBeardGeo = new THREE.ConeGeometry(0.22, 0.24, 14);
    const chinBeard = new THREE.Mesh(chinBeardGeo, hairMat);
    chinBeard.rotation.x = Math.PI;
    chinBeard.position.set(0, -0.03, 0.15);
    this.modiHeadDetails.add(chinBeard);

    // Gandhi Ji Bald Head with thin lower-back white hair rim
    this.head.add(this.gandhiHeadDetails);
    const gandhiFringeGeo = new THREE.TorusGeometry(0.275, 0.045, 8, 18, Math.PI * 1.15);
    const gandhiFringe = new THREE.Mesh(gandhiFringeGeo, hairMat);
    gandhiFringe.rotation.x = Math.PI / 2;
    gandhiFringe.rotation.z = -Math.PI * 0.08;
    gandhiFringe.position.set(0, 0.23, -0.06);
    this.gandhiHeadDetails.add(gandhiFringe);
    this.gandhiHeadDetails.visible = false;

    this.disposables.push(
      neckGeo,
      craniumGeo,
      earGeo,
      noseGeo,
      scleraGeo,
      pupilGeo,
      catchGeo,
      browGeo,
      mustacheGeo,
      smileGeo,
      smileMat,
      rimGeo,
      lensGeo,
      bridgeGeo,
      templeGeo,
      hairBackGeo,
      hairSweepGeo,
      beardMainGeo,
      chinBeardGeo,
      gandhiFringeGeo
    );

    // --- WINGS ON BACK (VISIBLE ONLY WHEN COLLECTED OR IN WINGS SHOP) ---
    this.wingsRoot.position.set(0, 0.62, -0.34);
    this.wingsRoot.visible = false; // NEVER visible by default!
    this.torso.add(this.wingsRoot);

    const wingHubGeo = new THREE.OctahedronGeometry(0.14, 1);
    const wingHub = new THREE.Mesh(wingHubGeo, this.wingCoreMat);
    this.wingsRoot.add(wingHub);
    this.disposables.push(wingHubGeo);

    const primaryFeatherGeo = createFeatherGeometry(1.15, 0.26);
    const secondaryFeatherGeo = createFeatherGeometry(0.75, 0.22);
    this.disposables.push(primaryFeatherGeo, secondaryFeatherGeo);

    const buildWing = (side: -1 | 1, wingGroup: THREE.Group, store: THREE.Mesh[]) => {
      wingGroup.position.set(side * 0.12, 0.02, 0);

      const sparGeo = new THREE.CapsuleGeometry(0.045, 0.55, 4, 8);
      const spar = new THREE.Mesh(sparGeo, this.wingCoreMat);
      spar.rotation.z = -side * 1.15;
      spar.position.set(side * 0.28, 0.16, 0);
      wingGroup.add(spar);
      this.disposables.push(sparGeo);

      for (let i = 0; i < 6; i++) {
        const feather = new THREE.Mesh(primaryFeatherGeo, this.wingPrimaryMat);
        const t = i / 5;
        feather.position.set(side * (0.14 + t * 0.42), 0.12 - t * 0.08, -0.02 - i * 0.008);
        feather.rotation.z = -side * (0.35 + t * 0.95);
        feather.rotation.y = side * 0.15;
        const scale = 1.12 - t * 0.28;
        feather.scale.set(scale, scale, 1);
        feather.castShadow = true;
        wingGroup.add(feather);
        store.push(feather);
      }

      for (let i = 0; i < 5; i++) {
        const feather = new THREE.Mesh(secondaryFeatherGeo, this.wingSecondaryMat);
        const t = i / 4;
        feather.position.set(side * (0.12 + t * 0.34), -0.02 - t * 0.05, 0.03);
        feather.rotation.z = -side * (0.55 + t * 0.9);
        const scale = 0.95 - t * 0.22;
        feather.scale.set(scale, scale, 1);
        wingGroup.add(feather);
        store.push(feather);
      }

      this.wingsRoot.add(wingGroup);
    };

    buildWing(-1, this.leftWing, this.leftFeathers);
    buildWing(1, this.rightWing, this.rightFeathers);

    // --- POWER-UP OVERLAYS ---
    const shieldGeo = new THREE.SphereGeometry(1.18, 24, 18);
    const shieldMat = new THREE.MeshPhysicalMaterial({
      color: 0x06b6d4,
      emissive: 0x0891b2,
      emissiveIntensity: 0.4,
      roughness: 0.1,
      metalness: 0.1,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    });
    this.shieldSphere = new THREE.Mesh(shieldGeo, shieldMat);
    this.shieldSphere.position.set(0, 1.1, 0);
    this.shieldSphere.visible = false;
    this.bodyPivot.add(this.shieldSphere);

    this.jetpackGroup = new THREE.Group();
    this.jetpackGroup.position.set(0, 0.48, -0.4);
    const tankGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.52, 12);
    const tankMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      roughness: 0.3,
      metalness: 0.7,
    });
    const flameGeo = new THREE.ConeGeometry(0.09, 0.45, 10);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
    [-1, 1].forEach((side) => {
      const tank = new THREE.Mesh(tankGeo, tankMat);
      tank.position.set(side * 0.16, 0, 0);
      this.jetpackGroup.add(tank);
    });
    this.jetFlameL = new THREE.Mesh(flameGeo, flameMat);
    this.jetFlameL.rotation.x = Math.PI;
    this.jetFlameL.position.set(-0.16, -0.42, 0);
    this.jetFlameR = this.jetFlameL.clone();
    this.jetFlameR.position.x = 0.16;
    this.jetpackGroup.add(this.jetFlameL, this.jetFlameR);
    this.jetpackGroup.visible = false;
    this.torso.add(this.jetpackGroup);

    this.disposables.push(shieldGeo, shieldMat, tankGeo, tankMat, flameGeo, flameMat);
  }

  public applyCharacter(characterId: CharacterId): void {
    this.currentCharacter = characterId;
    const isGandhi = characterId === 'gandhi';
    this.modiClothesGroup.visible = !isGandhi;
    this.modiHeadDetails.visible = !isGandhi;
    this.gandhiClothesGroup.visible = isGandhi;
    this.gandhiHeadDetails.visible = isGandhi;
    this.gandhiStick.visible = isGandhi;

    // Gandhi Ji has slender elderly proportions + bare arms/white dhoti legs
    if (isGandhi) {
      this.torso.scale.set(0.86, 0.96, 0.86);
      this.churidarMat.color.setHex(0xe6a87c); // bare slender lower legs below dhoti
      this.kurtaMat.color.setHex(0xe6a87c); // bare slender arms
      this.accentMat.color.setHex(0xf8fafc); // dhoti/sandal accent
    } else {
      this.torso.scale.set(1, 1, 1);
    }
  }

  public applyOutfit(outfitId: OutfitId): void {
    if (this.currentCharacter === 'gandhi') return;
    const def = OUTFIT_CATALOG.find((o) => o.id === outfitId) ?? OUTFIT_CATALOG[0];
    this.kurtaMat.color.setHex(def.kurtaColor);
    this.jacketMat.color.setHex(def.jacketColor);
    this.churidarMat.color.setHex(def.churidarColor);
    this.accentMat.color.setHex(def.accentColor);
    this.jacketMat.metalness = outfitId === 'golden' ? 0.82 : outfitId === 'space' ? 0.55 : 0.15;
    this.jacketMat.roughness = outfitId === 'golden' ? 0.22 : 0.52;
    this.capeMesh.visible = Boolean(def.hasCape);
    this.spacePack.visible = Boolean(def.hasJetTrim);
  }

  public applyWingSkin(wingId: WingId): void {
    this.currentWingId = wingId;
    const def = WING_CATALOG.find((w) => w.id === wingId) ?? WING_CATALOG[0];
    this.wingPrimaryMat.color.setHex(def.primaryColor);
    this.wingPrimaryMat.emissive.setHex(def.emissiveColor);
    this.wingSecondaryMat.color.setHex(def.secondaryColor);
    this.wingSecondaryMat.emissive.setHex(def.emissiveColor);
    this.wingCoreMat.color.setHex(def.primaryColor);
    this.wingCoreMat.emissive.setHex(def.emissiveColor);

    if (wingId === 'diamond' || wingId === 'ice') {
      this.wingPrimaryMat.roughness = 0.08;
      this.wingPrimaryMat.metalness = 0.45;
      this.wingPrimaryMat.emissiveIntensity = 0.48;
    } else if (wingId === 'fire' || wingId === 'lightning' || wingId === 'cosmic') {
      this.wingPrimaryMat.emissiveIntensity = 0.72;
      this.wingSecondaryMat.emissiveIntensity = 0.6;
    } else {
      this.wingPrimaryMat.roughness = 0.22;
      this.wingPrimaryMat.metalness = 0.82;
      this.wingPrimaryMat.emissiveIntensity = 0.35;
    }
  }

  public update(delta: number, elapsed: number, state: CharacterAnimState): boolean {
    let footstepFired = false;

    // Wings are ONLY visible when collected as a power-up or in the Wings Shop preview!
    this.wingsRoot.visible = state.showWings;

    if (state.showWings && this.currentWingId === 'rainbow') {
      const hue = (elapsed * 0.28) % 1;
      this.wingPrimaryMat.color.setHSL(hue, 0.9, 0.58);
      this.wingPrimaryMat.emissive.setHSL((hue + 0.15) % 1, 0.85, 0.35);
      this.wingSecondaryMat.color.setHSL((hue + 0.35) % 1, 0.9, 0.65);
    }

    this.shieldSphere.visible = state.hasShield;
    if (state.hasShield) {
      this.shieldSphere.rotation.y += delta * 1.4;
      this.shieldSphere.scale.setScalar(1 + Math.sin(elapsed * 5) * 0.03);
    }

    this.jetpackGroup.visible = state.isJetpack;
    if (state.isJetpack) {
      const fScale = 0.85 + Math.sin(elapsed * 38) * 0.35;
      this.jetFlameL.scale.set(1, fScale, 1);
      this.jetFlameR.scale.set(1, fScale, 1);
    }

    this.magicShoeGlowL.visible = state.hasMagicShoes;
    this.magicShoeGlowR.visible = state.hasMagicShoes;

    // Menu / Shop Showcase Turntable
    if (state.showcaseMode !== 'none') {
      this.root.rotation.y = 0; // Face camera in Menu/Outfit/Character showcase
      this.bodyPivot.position.y = Math.sin(elapsed * 2.4) * 0.035;
      if (state.showcaseMode === 'shop_characters') {
        this.bodyPivot.rotation.set(0, elapsed * 0.9, 0); // Rotating 3D preview!
      } else if (state.showcaseMode === 'shop_wings') {
        this.bodyPivot.rotation.set(0, Math.PI + Math.sin(elapsed * 0.9) * 0.45, 0); // Back view for wings
      } else {
        this.bodyPivot.rotation.set(0, 0.28 * Math.sin(elapsed * 0.7), 0);
      }
      this.bodyPivot.scale.set(1, 1, 1);
      this.torso.rotation.x = 0.04;
      this.leftLeg.rotation.x = 0;
      this.rightLeg.rotation.x = 0;
      this.leftArm.rotation.x = -0.15 + Math.sin(elapsed * 2) * 0.08;
      this.rightArm.rotation.x = -0.15 - Math.sin(elapsed * 2) * 0.08;
      this.leftArm.rotation.z = -0.14;
      this.rightArm.rotation.z = 0.14;

      if (state.showWings) {
        const flap = Math.sin(elapsed * 3.2) * 0.22;
        this.leftWing.rotation.y = -0.35 + flap;
        this.rightWing.rotation.y = 0.35 - flap;
        this.leftWing.rotation.z = 0.08;
        this.rightWing.rotation.z = -0.08;
      }
      return false;
    }

    // --- ACTIVE GAMEPLAY ORIENTATION ---
    // Rotate character root by PI so local +Z (face/toes) points toward -Z (down the road away from camera!)
    // Back of head, shoulders, kurta/dhoti face +Z toward the third-person chase camera!
    this.root.rotation.y = Math.PI;
    this.bodyPivot.rotation.y = 0;

    if (state.isCrashed) {
      this.bodyPivot.rotation.x = THREE.MathUtils.damp(this.bodyPivot.rotation.x, -0.5, 10, delta);
      this.leftArm.rotation.x = -1.2;
      this.rightArm.rotation.x = -1.2;
      return false;
    }

    const animSpeed = 9.5 + state.speedRatio * 5.5;
    this.runCycle += delta * animSpeed;
    this.wingCycle += delta * (state.isFlying ? 14.5 : 5.2);

    if (state.isFlying || state.isJetpack) {
      this.bodyPivot.rotation.x = THREE.MathUtils.damp(this.bodyPivot.rotation.x, 0.42, 8, delta);
      this.bodyPivot.rotation.z = THREE.MathUtils.damp(
        this.bodyPivot.rotation.z,
        state.laneTilt * 0.32,
        10,
        delta
      );
      this.bodyPivot.position.y = Math.sin(elapsed * 5) * 0.08;
      this.bodyPivot.scale.set(1, 1, 1);

      this.leftLeg.rotation.x = 0.25 + Math.sin(elapsed * 4) * 0.08;
      this.rightLeg.rotation.x = 0.35 - Math.sin(elapsed * 4) * 0.08;
      this.leftArm.rotation.x = -2.3;
      this.rightArm.rotation.x = -2.3;
      this.leftArm.rotation.z = -0.22;
      this.rightArm.rotation.z = 0.22;
      this.head.rotation.x = -0.32;

      if (state.showWings) {
        const bigFlap = Math.sin(this.wingCycle) * 0.55;
        this.leftWing.rotation.y = -0.18 + bigFlap;
        this.rightWing.rotation.y = 0.18 - bigFlap;
        this.leftWing.rotation.z = 0.15 + Math.cos(this.wingCycle) * 0.18;
        this.rightWing.rotation.z = -0.15 - Math.cos(this.wingCycle) * 0.18;
        this.wingsRoot.scale.setScalar(1.22);
      }
    } else if (state.isSliding) {
      this.bodyPivot.rotation.x = THREE.MathUtils.damp(this.bodyPivot.rotation.x, -0.78, 14, delta);
      this.bodyPivot.position.y = THREE.MathUtils.damp(this.bodyPivot.position.y, -0.42, 14, delta);
      this.bodyPivot.scale.y = THREE.MathUtils.damp(this.bodyPivot.scale.y, 0.72, 14, delta);
      this.head.rotation.x = 0.55;
      this.leftLeg.rotation.x = 0.7;
      this.rightLeg.rotation.x = -0.3;
      this.leftArm.rotation.x = 0.5;
      this.rightArm.rotation.x = 0.5;
    } else {
      this.bodyPivot.rotation.x = THREE.MathUtils.damp(
        this.bodyPivot.rotation.x,
        state.isGrounded ? 0.14 : -0.08,
        12,
        delta
      );
      // Lean smoothly into left/right lane switches when rotated away from camera
      this.bodyPivot.rotation.z = THREE.MathUtils.damp(
        this.bodyPivot.rotation.z,
        state.laneTilt * 0.24,
        12,
        delta
      );
      this.bodyPivot.scale.y = THREE.MathUtils.damp(this.bodyPivot.scale.y, 1, 14, delta);
      this.head.rotation.x = -0.08;

      if (state.isGrounded) {
        const s = Math.sin(this.runCycle);
        const c = Math.cos(this.runCycle);
        this.bodyPivot.position.y = Math.abs(c) * 0.085;
        this.leftLeg.rotation.x = s * 0.92;
        this.rightLeg.rotation.x = -s * 0.92;
        this.leftArm.rotation.x = -s * 0.85;
        this.rightArm.rotation.x = s * 0.85;
        this.leftArm.rotation.z = -0.15;
        this.rightArm.rotation.z = 0.15;

        if (Math.abs(s) > 0.94 && !this.stepTriggered) {
          this.stepTriggered = true;
          footstepFired = true;
        } else if (Math.abs(s) < 0.5) {
          this.stepTriggered = false;
        }
      } else {
        this.bodyPivot.position.y = THREE.MathUtils.damp(this.bodyPivot.position.y, 0, 10, delta);
        this.leftLeg.rotation.x = 0.55;
        this.rightLeg.rotation.x = -0.42;
        this.leftArm.rotation.x = -0.95;
        this.rightArm.rotation.x = -0.95;
      }
    }

    if (this.capeMesh.visible) {
      this.capeMesh.rotation.x = 0.35 + Math.sin(elapsed * 11) * 0.14;
    }

    return footstepFired;
  }

  public dispose(): void {
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}
