import * as THREE from 'three';

export interface ProceduralTextures {
  road: THREE.CanvasTexture;
  sidewalk: THREE.CanvasTexture;
  sandstone: THREE.CanvasTexture;
  redFort: THREE.CanvasTexture;
  indianFlag: THREE.CanvasTexture;
  shopSignChai: THREE.CanvasTexture;
  shopSignMithai: THREE.CanvasTexture;
  shopSignBazaar: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  particleGlow: THREE.CanvasTexture;
  dispose: () => void;
}

function finalizeTexture(
  canvas: HTMLCanvasElement,
  anisotropy: number,
  repeatX = 1,
  repeatY = 1
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.needsUpdate = true;
  return tex;
}

export function createProceduralTextures(renderer: THREE.WebGLRenderer): ProceduralTextures {
  const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy() || 1);

  // 1. 3-Lane Indian Boulevard Road Texture
  const roadCanvas = document.createElement('canvas');
  roadCanvas.width = 512;
  roadCanvas.height = 512;
  const rCtx = roadCanvas.getContext('2d')!;
  rCtx.fillStyle = '#2b303a';
  rCtx.fillRect(0, 0, 512, 512);
  // Subtle asphalt grain
  for (let i = 0; i < 3200; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const v = 35 + Math.floor(Math.random() * 26);
    rCtx.fillStyle = `rgb(${v},${v + 3},${v + 8})`;
    rCtx.fillRect(x, y, 2, 2);
  }
  // Yellow outer road edge lines
  rCtx.fillStyle = '#f59e0b';
  rCtx.fillRect(14, 0, 10, 512);
  rCtx.fillRect(488, 0, 10, 512);
  // Dashed lane dividers (separating 3 lanes)
  rCtx.fillStyle = '#f8fafc';
  for (let y = 16; y < 512; y += 96) {
    rCtx.fillRect(172, y, 10, 52);
    rCtx.fillRect(330, y, 10, 52);
  }
  const road = finalizeTexture(roadCanvas, maxAniso, 1, 2);

  // 2. Red-sandstone & cream patterned Delhi sidewalk curb
  const sideCanvas = document.createElement('canvas');
  sideCanvas.width = 256;
  sideCanvas.height = 256;
  const sCtx = sideCanvas.getContext('2d')!;
  sCtx.fillStyle = '#c88a65';
  sCtx.fillRect(0, 0, 256, 256);
  sCtx.strokeStyle = '#9b6244';
  sCtx.lineWidth = 4;
  for (let y = 0; y < 256; y += 64) {
    sCtx.beginPath();
    sCtx.moveTo(0, y);
    sCtx.lineTo(256, y);
    sCtx.stroke();
  }
  // Curb yellow/black alternating hazard edge
  for (let y = 0; y < 256; y += 64) {
    sCtx.fillStyle = (y / 64) % 2 === 0 ? '#f59e0b' : '#1e293b';
    sCtx.fillRect(0, y, 22, 64);
  }
  const sidewalk = finalizeTexture(sideCanvas, maxAniso, 1, 4);

  // 3. India Gate / Parliament Sandstone Masonry
  const sandCanvas = document.createElement('canvas');
  sandCanvas.width = 256;
  sandCanvas.height = 256;
  const sandCtx = sandCanvas.getContext('2d')!;
  sandCtx.fillStyle = '#e5b887';
  sandCtx.fillRect(0, 0, 256, 256);
  sandCtx.strokeStyle = '#c9935f';
  sandCtx.lineWidth = 2;
  for (let y = 0; y < 256; y += 32) {
    sandCtx.beginPath();
    sandCtx.moveTo(0, y);
    sandCtx.lineTo(256, y);
    sandCtx.stroke();
    const offset = (y / 32) % 2 === 0 ? 0 : 32;
    for (let x = offset; x < 256; x += 64) {
      sandCtx.beginPath();
      sandCtx.moveTo(x, y);
      sandCtx.lineTo(x, y + 32);
      sandCtx.stroke();
    }
  }
  const sandstone = finalizeTexture(sandCanvas, maxAniso, 2, 2);

  // 4. Red Fort Sandstone Brick
  const redCanvas = document.createElement('canvas');
  redCanvas.width = 256;
  redCanvas.height = 256;
  const redCtx = redCanvas.getContext('2d')!;
  redCtx.fillStyle = '#9e3b2b';
  redCtx.fillRect(0, 0, 256, 256);
  redCtx.strokeStyle = '#742419';
  redCtx.lineWidth = 2;
  for (let y = 0; y < 256; y += 24) {
    redCtx.beginPath();
    redCtx.moveTo(0, y);
    redCtx.lineTo(256, y);
    redCtx.stroke();
    const offset = (y / 24) % 2 === 0 ? 0 : 24;
    for (let x = offset; x < 256; x += 48) {
      redCtx.beginPath();
      redCtx.moveTo(x, y);
      redCtx.lineTo(x, y + 24);
      redCtx.stroke();
    }
  }
  const redFort = finalizeTexture(redCanvas, maxAniso, 3, 2);

  // 5. Indian Tricolor Flag with Ashoka Chakra
  const flagCanvas = document.createElement('canvas');
  flagCanvas.width = 256;
  flagCanvas.height = 170;
  const fCtx = flagCanvas.getContext('2d')!;
  fCtx.fillStyle = '#FF9933';
  fCtx.fillRect(0, 0, 256, 56);
  fCtx.fillStyle = '#FFFFFF';
  fCtx.fillRect(0, 56, 256, 58);
  fCtx.fillStyle = '#138808';
  fCtx.fillRect(0, 114, 256, 56);
  // Ashoka Chakra
  fCtx.strokeStyle = '#000080';
  fCtx.lineWidth = 3;
  fCtx.beginPath();
  fCtx.arc(128, 85, 22, 0, Math.PI * 2);
  fCtx.stroke();
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    fCtx.beginPath();
    fCtx.moveTo(128, 85);
    fCtx.lineTo(128 + Math.cos(a) * 21, 85 + Math.sin(a) * 21);
    fCtx.stroke();
  }
  const indianFlag = finalizeTexture(flagCanvas, maxAniso, 1, 1);

  // 6. Shop Signboards
  function makeSign(bg: string, border: string, title: string, sub: string): THREE.CanvasTexture {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 96;
    const g = c.getContext('2d')!;
    g.fillStyle = bg;
    g.fillRect(0, 0, 256, 96);
    g.strokeStyle = border;
    g.lineWidth = 6;
    g.strokeRect(4, 4, 248, 88);
    g.fillStyle = '#ffffff';
    g.font = 'bold 28px sans-serif';
    g.textAlign = 'center';
    g.fillText(title, 128, 46);
    g.fillStyle = border;
    g.font = 'bold 16px sans-serif';
    g.fillText(sub, 128, 74);
    return finalizeTexture(c, maxAniso, 1, 1);
  }

  const shopSignChai = makeSign('#b45309', '#fde68a', 'DELHI CHAI', 'MASALA & KULHAD');
  const shopSignMithai = makeSign('#be123c', '#fcd34d', 'SHAHI MITHAI', 'JALEBI & LADDU');
  const shopSignBazaar = makeSign('#047857', '#fef08a', 'NAMASTE BAZAAR', 'HANDICRAFTS');

  // 7. Radial Soft Contact Shadow
  const shCanvas = document.createElement('canvas');
  shCanvas.width = 128;
  shCanvas.height = 128;
  const shCtx = shCanvas.getContext('2d')!;
  const grad = shCtx.createRadialGradient(64, 64, 8, 64, 64, 60);
  grad.addColorStop(0, 'rgba(0,0,0,0.62)');
  grad.addColorStop(0.6, 'rgba(0,0,0,0.22)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  shCtx.fillStyle = grad;
  shCtx.fillRect(0, 0, 128, 128);
  const contactShadow = new THREE.CanvasTexture(shCanvas);
  contactShadow.colorSpace = THREE.SRGBColorSpace;

  // 8. Soft Glowing Particle Sprite
  const pCanvas = document.createElement('canvas');
  pCanvas.width = 64;
  pCanvas.height = 64;
  const pCtx = pCanvas.getContext('2d')!;
  const pGrad = pCtx.createRadialGradient(32, 32, 2, 32, 32, 30);
  pGrad.addColorStop(0, 'rgba(255,255,255,1)');
  pGrad.addColorStop(0.4, 'rgba(255,240,180,0.75)');
  pGrad.addColorStop(1, 'rgba(255,255,255,0)');
  pCtx.fillStyle = pGrad;
  pCtx.fillRect(0, 0, 64, 64);
  const particleGlow = new THREE.CanvasTexture(pCanvas);
  particleGlow.colorSpace = THREE.SRGBColorSpace;

  return {
    road,
    sidewalk,
    sandstone,
    redFort,
    indianFlag,
    shopSignChai,
    shopSignMithai,
    shopSignBazaar,
    contactShadow,
    particleGlow,
    dispose: () => {
      road.dispose();
      sidewalk.dispose();
      sandstone.dispose();
      redFort.dispose();
      indianFlag.dispose();
      shopSignChai.dispose();
      shopSignMithai.dispose();
      shopSignBazaar.dispose();
      contactShadow.dispose();
      particleGlow.dispose();
    },
  };
}
