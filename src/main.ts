// @ts-nocheck
import * as THREE from 'three';
import { VehicleControllerFast } from './gameplay/VehicleControllerFast';
import { FakePhysicsWorld } from './gameplay/FakePhysicsWorld';
import { RapierPhysicsWorldImpl } from './gameplay/RapierPhysicsWorldImpl';
import { VehicleControllerPrecise } from './gameplay/VehicleControllerPrecise';
import { InputManager } from './core/InputManager';
import { ResourceManager } from './core/ResourceManager';
import { GLTFLoaderWrapper } from './core/GLTFLoaderWrapper';
import { RoadManager } from './world/RoadManager';
import { AnimationController, VehicleStateSimple } from './gameplay/AnimationController';
import { VehicleProfile, DefaultCityCar } from './gameplay/VehicleProfile';
import { AssetLoader } from './core/AssetLoader';
import { InstanceRenderer } from './world/InstanceRenderer';
import GpuCuller from './world/GpuCuller';
import { RoadsideSpawner } from './world/RoadsideSpawner';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio || 1);
document.body.appendChild(renderer.domElement);

const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 10, 7.5);
scene.add(light);
const amb = new THREE.AmbientLight(0x606060);
scene.add(amb);

const gltfLoader = new GLTFLoaderWrapper();
const resources = new ResourceManager();

// Helper: fit a loaded glTF model to vehicle dimensions
function fitModelToVehicle(obj: THREE.Object3D, target = { length: 4, width: 1.8, height: 0.8 }) {
  // compute bounding box
  const box = new THREE.Box3().setFromObject(obj);
  const size = new THREE.Vector3();
  box.getSize(size);
  if (size.x === 0 || size.y === 0 || size.z === 0) return;

  // determine scale factor to match desired length (z) and width (x)
  const scaleX = target.width / size.x;
  const scaleZ = target.length / size.z;
  const scale = Math.min(scaleX, scaleZ);
  obj.scale.setScalar(scale);

  // recompute bbox after scale
  const box2 = new THREE.Box3().setFromObject(obj);
  const size2 = new THREE.Vector3(); box2.getSize(size2);

  // rotate so the longest axis aligns with Z (forward)
  const dims = [{k:'x',v:size2.x},{k:'y',v:size2.y},{k:'z',v:size2.z}];
  dims.sort((a,b)=>b.v-a.v);
  // if longest axis is X, rotate -90 deg around Y
  if (dims[0].k === 'x') {
    obj.rotateY(-Math.PI/2);
  } else if (dims[0].k === 'y') {
    // unlikely, but rotate so Y isn't forward
    // do nothing
  }

  // place bottom of model on ground at y = 0.25 (vehicle half height)
  const box3 = new THREE.Box3().setFromObject(obj);
  const min = box3.min;
  const oy = min.y;
  obj.position.y += (0.25 - oy);
}

// Helper: create a canvas texture with stripe for car
function createCarTexture(): HTMLCanvasElement {
  const size = 512;
  const cvs = document.createElement('canvas');
  cvs.width = size;
  cvs.height = size;
  const ctx = cvs.getContext('2d')!;

  // base color
  ctx.fillStyle = '#ff3333';
  ctx.fillRect(0, 0, size, size);

  // darker bottom
  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, 'rgba(255,255,255,0.08)');
  grad.addColorStop(1, 'rgba(0,0,0,0.12)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // racing stripe
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(size * 0.45, 0, size * 0.1, size);

  // subtle scratches/noise
  ctx.globalAlpha = 0.05;
  for (let i = 0; i < 2000; i++) {
    ctx.fillStyle = 'black';
    const x = Math.random() * size;
    const y = Math.random() * size;
    ctx.fillRect(x, y, 1, 1);
  }
  ctx.globalAlpha = 1;
  return cvs;
}

// Helper: asphalt road texture tile
function createRoadTexture(): HTMLCanvasElement {
  const w = 512;
  const h = 512;
  const cvs = document.createElement('canvas');
  cvs.width = w;
  cvs.height = h;
  const ctx = cvs.getContext('2d')!;

  // base gray
  ctx.fillStyle = '#3a3a3a';
  ctx.fillRect(0, 0, w, h);

  // noise
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  for (let i = 0; i < 3000; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const s = Math.random() * 2;
    ctx.fillRect(x, y, s, s);
  }

  // lane divider (center)
  ctx.strokeStyle = '#dddd77';
  ctx.lineWidth = 6;
  ctx.setLineDash([40, 30]);
  ctx.beginPath();
  ctx.moveTo(w / 2, 0);
  ctx.lineTo(w / 2, h);
  ctx.stroke();
  ctx.setLineDash([]);

  return cvs;
}

// Helper: simple sky gradient canvas as texture
function createSkyTexture(): HTMLCanvasElement {
  const w = 512;
  const h = 256;
  const cvs = document.createElement('canvas');
  cvs.width = w;
  cvs.height = h;
  const ctx = cvs.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#87ceeb'); // light sky blue
  g.addColorStop(1, '#e0f7ff');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  return cvs;
}

// Try to load static textures if generated, otherwise fallback to canvas textures
async function loadOrCreateTextures() {
  const loader = new THREE.TextureLoader();
  try {
    const car = await loader.loadAsync('/assets/textures/car_texture.png');
    const road = await loader.loadAsync('/assets/textures/road_texture.png');
    const sky = await loader.loadAsync('/assets/textures/sky_texture.png');
    return { car: car as any, road: road as any, sky: sky as any };
  } catch (e) {
    // fall back to canvas
    const carCanvas = createCarTexture();
    const car = new THREE.CanvasTexture(carCanvas) as any;
    try { (car as any).encoding = (THREE as any).sRGBEncoding; } catch {}
    car.needsUpdate = true;

    const roadCanvas = createRoadTexture();
    const road = new THREE.CanvasTexture(roadCanvas) as any;
    road.wrapS = THREE.RepeatWrapping;
    road.wrapT = THREE.RepeatWrapping;
    road.repeat.set(1, 8);
    road.needsUpdate = true;

    const skyCanvas = createSkyTexture();
    const sky = new THREE.CanvasTexture(skyCanvas) as any;
    sky.needsUpdate = true;

    // expose canvases for export
    (car as any).image = carCanvas;
    (road as any).image = roadCanvas;
    (sky as any).image = skyCanvas;

    return { car, road, sky };
  }
}

// ensure carMesh visible to loadLevel/animate
let carMesh: any = null;
let carMixer: THREE.AnimationMixer | null = null; // kept for backward compat but prefer AnimationController
let animController: AnimationController | null = null;
let vehicle: any = null;

// physicsWorld and vehicle (physics backend selectable at runtime)
let physicsWorld: any = new RapierPhysicsWorldImpl();
// use default profile (can be swapped per-level or UI)
const profile: VehicleProfile = DefaultCityCar;
vehicle = new VehicleControllerFast(physicsWorld, { mass: profile.mass, wheelRadius: profile.wheelRadius, maxSteerAngle: profile.maxSteerAngle }, profile);

(async () => {
  const textures: any = await loadOrCreateTextures();

  // Ensure road texture wraps and repeats (for both file-loaded and canvas textures)
  try {
    textures.road.wrapS = THREE.RepeatWrapping;
    textures.road.wrapT = THREE.RepeatWrapping;
    textures.road.repeat.set(1, 8);
    textures.road.needsUpdate = true;
  } catch (e) { }

  // Skybox as large sphere with inside-out material
  const skyGeo = new THREE.SphereGeometry(400, 16, 12);
  const skyMat = new THREE.MeshBasicMaterial({ map: textures.sky, side: THREE.BackSide });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  scene.add(sky);

  // road (single mesh kept only for material reference)
  const roadWidth = 6;
  const roadLength = 1000;
  const roadGeo = new THREE.PlaneGeometry(roadWidth, roadLength, 1, 1);
  const roadMat = new THREE.MeshStandardMaterial({ map: textures.road });
  const road = new THREE.Mesh(roadGeo, roadMat);
  road.rotation.x = -Math.PI / 2;
  road.position.y = 0.001; // slightly above ground
  road.position.z = 0;

  // wider ground around road
  const groundGeo = new THREE.PlaneGeometry(200, 200);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x2b7a2b });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.01;
  ground.position.z = 0;
  scene.add(ground);

  // placeholder car mesh (will be replaced by GLTF if available)
  const placeholderCarGeo = new THREE.BoxGeometry(1.8, 0.5, 4);
  const placeholderCarMat = new THREE.MeshStandardMaterial({ map: textures.car, metalness: 0.2, roughness: 0.4 });
  carMesh = new THREE.Mesh(placeholderCarGeo, placeholderCarMat);
  carMesh.position.y = 0.25;
  carMesh.position.z = 0;
  scene.add(carMesh);

  camera.position.set(0, 4, -8);
  camera.lookAt(new THREE.Vector3(0, 0, 0));

  // road configuration grouped (ensure declared before use)
  const roadConfig = {
    segmentLength: 50,
    numSegments: 12,
    textureRepeatY: 8,
    scrollFactor: 0.2,
    roadOffset: 0,
    // example control points (x,z) for a natural spline path бк editable at runtime via UI below
    controlPoints: [
      { x: 0, z: 0 },
      { x: 6, z: 120 },
      { x: -4, z: 260 },
      { x: 0, z: 400 },
      { x: 8, z: 560 }
    ],
    closed: false
  } as any;

  // physicsWorld and vehicle already initialized outside IIFE; no-op here

  // create RoadManager and initialize with scene and road material
  let roadManager = new RoadManager(roadConfig, roadWidth);
  // create and inject a RoadsideSpawner (deterministic by seed)
  const spawner = new RoadsideSpawner(undefined, undefined, { seed:1337, segmentLength: roadConfig.segmentLength, numSegments: roadConfig.numSegments });
  roadManager.setSpawner(spawner);
  // create asset loader and optionally register impostor atlas metadata
  const assetLoader = new AssetLoader();
  // load atlas list from resources and register with assetLoader
  try {
    await (async () => {
      const rm = new ResourceManager();
      const ok = await rm.loadAtlasList('/assets/atlases/atlas_list.json');
      if (ok) {
        const info = rm.getAtlas('tree');
        if (info) assetLoader.registerImpostorAtlas('tree', info);
      }
    })();
  } catch (e) {}
  // create an InstanceRenderer and inject into RoadManager so it can use impostor atlas
  try {
    const envRenderer = new InstanceRenderer();
    envRenderer.init(scene, assetLoader as any, { near:30, mid:120, far:400 });
    roadManager.setEnvironmentRenderer(envRenderer);
  } catch (e) {
    // non-fatal if InstanceRenderer cannot be created in this environment
    console.warn('Failed to init InstanceRenderer', e);
  }

  // inject cameraRef to roadManager for GPU culling/frustum checks
  try { roadManager.setCameraRef(camera); } catch (e) {}

  // attempt WebGPU prewarm / support probe (non-blocking)
  try {
  (async () => {
  try {
  const ok = await GpuCuller.isWebGpuSupported();
  if (ok) console.log('WebGPU culler initialized'); else console.log('WebGPU not available');
  } catch (e) {
  console.warn('WebGPU prewarm failed', e);
  }
  })();
  } catch (e) {}

  roadManager.init(scene, roadMat as any);

  const input = new InputManager();

  // HUD
  const hud = document.createElement('div');
  hud.style.position = 'absolute';
  hud.style.left = '10px';
  hud.style.top = '10px';
  hud.style.color = 'white';
  hud.style.background = 'rgba(0,0,0,0.3)';
  hud.style.padding = '8px';
  hud.innerHTML = 'Speed: 0.0 m/s';
  document.body.appendChild(hud);

  // UI controls
  const ui = document.createElement('div');
  ui.style.position = 'absolute';
  ui.style.right = '10px';
  ui.style.top = '10px';
  ui.style.color = 'white';
  ui.style.background = 'rgba(0,0,0,0.3)';
  ui.style.padding = '8px';

  const startBtn = document.createElement('button');
  startBtn.textContent = 'Start';
  const pauseBtn = document.createElement('button');
  pauseBtn.textContent = 'Pause';
  const prevLevelBtn = document.createElement('button');
  prevLevelBtn.textContent = 'Prev Level';
  const nextLevelBtn = document.createElement('button');
  nextLevelBtn.textContent = 'Next Level';

  const modeSelect = document.createElement('select');
  const optFast = document.createElement('option'); optFast.value = 'fast'; optFast.text = 'Fast';
  const optPrecise = document.createElement('option'); optPrecise.value = 'precise'; optPrecise.text = 'Precise';
  modeSelect.appendChild(optFast); modeSelect.appendChild(optPrecise);

  const exportTexturesBtn = document.createElement('button');
  exportTexturesBtn.textContent = 'Export Textures';

  // toggle for InstanceRenderer usage
  const irLabel = document.createElement('label');
  irLabel.style.display = 'block';
  irLabel.style.marginTop = '8px';
  const irCheckbox = document.createElement('input');
  irCheckbox.type = 'checkbox';
  irCheckbox.checked = true;
  irCheckbox.onchange = () => { try { roadManager.setUseInstanceRenderer(irCheckbox.checked); } catch(e){} };
  irLabel.appendChild(irCheckbox);
  irLabel.appendChild(document.createTextNode(' Use InstanceRenderer'));

  ui.appendChild(startBtn); ui.appendChild(pauseBtn); ui.appendChild(prevLevelBtn); ui.appendChild(nextLevelBtn); ui.appendChild(modeSelect); ui.appendChild(exportTexturesBtn);
  ui.appendChild(irLabel);
  // --- Physics backend selector ---
  const physLabel = document.createElement('label');
  physLabel.style.display = 'block';
  physLabel.style.marginTop = '8px';
  physLabel.textContent = 'Physics backend:';
  const physSelect = document.createElement('select');
  const optFake = document.createElement('option'); optFake.value = 'fake'; optFake.text = 'FakePhysicsWorld';
  const optRapier = document.createElement('option'); optRapier.value = 'rapier'; optRapier.text = 'RapierPhysicsWorld';
  physSelect.appendChild(optFake); physSelect.appendChild(optRapier);
  physSelect.value = 'rapier';
  ui.appendChild(physLabel);
  ui.appendChild(physSelect);
  // physics status indicator
  const physStatus = document.createElement('div');
  physStatus.style.marginTop = '6px';
  physStatus.style.fontSize = '12px';
  physStatus.style.opacity = '0.9';
  physStatus.textContent = 'Physics: initializing...';
  ui.appendChild(physStatus);
  // Track selection
  const trackLabel = document.createElement('label');
  trackLabel.style.display = 'block';
  trackLabel.style.marginTop = '8px';
  trackLabel.textContent = 'Track:';
  const trackSelect = document.createElement('select');
  ui.appendChild(trackLabel);
  ui.appendChild(trackSelect);
  const bankLabel = document.createElement('div');
  bankLabel.style.fontSize = '12px';
  bankLabel.style.marginTop = '4px';
  bankLabel.textContent = 'Avg bank: 0бу';
  ui.appendChild(bankLabel);
  document.body.appendChild(ui);

  // switch physics backend at runtime
  function switchPhysics(mode: string) {
    // store previous state
    const prevState = (vehicle && typeof vehicle.getState === 'function') ? vehicle.getState() : null;
    try { if (vehicle && typeof vehicle.dispose === 'function') vehicle.dispose(); } catch (e) {}
    // create new physics world
    if (mode === 'rapier') {
      try { physicsWorld = new RapierPhysicsWorldImpl(); } catch (e) { console.warn('Failed to init Rapier, falling back to FakePhysicsWorld', e); physicsWorld = new FakePhysicsWorld(); }
    } else {
      physicsWorld = new FakePhysicsWorld();
    }
    // recreate vehicle with same profile and params
    vehicle = new VehicleControllerFast(physicsWorld, { mass: profile.mass, wheelRadius: profile.wheelRadius, maxSteerAngle: profile.maxSteerAngle }, profile);
    // inject new physics instance into roadManager so chunks/collision sync
    try { if ((roadManager as any).setPhysics) (roadManager as any).setPhysics(physicsWorld); else (roadManager as any).physics = physicsWorld; } catch (e) {}
    if (prevState && typeof vehicle.reset === 'function') {
      try { vehicle.reset({ position: { x: prevState.position.x, y: prevState.position.y, z: prevState.position.z }, rotation: { x: 0, y: prevState.rotation.y, z: 0 } }); } catch (e) {}
    }
    console.log('Switched physics to', mode);
  }

  physSelect.onchange = () => switchPhysics(physSelect.value);

  // runtime control
  let running = true;
  startBtn.onclick = () => { running = true; };
  pauseBtn.onclick = () => { running = false; };

  // initialize repeat on material via roadManager
  try { roadManager.setTextureRepeat(roadConfig.textureRepeatY); } catch (e) {}

  let last = performance.now();
  let worldZ = 0;
  function animate() {
    const now = performance.now();
    const dt = (now - last) / 1000;
    last = now;

    input.update(dt);
    const urlParams = new URLSearchParams(window.location.search);
    const physicsDebug = urlParams.get('debug') === 'physics';

    if (running) {
      const vi = input.getInput();
      if (typeof vehicle !== 'undefined' && vehicle) {
        try { vehicle.setInput(vi); } catch (e) {}
        try { if (typeof physicsWorld.clearAppliedFlags === 'function') physicsWorld.clearAppliedFlags(); } catch (e) {}
        try { vehicle.update(dt); } catch (e) {}
        try { physicsWorld.step(dt); } catch (e) {}
        try { if (typeof vehicle.postPhysicsSync === 'function') (vehicle as any).postPhysicsSync(dt); } catch (e) {}
      }

      if (physicsDebug) {
        try {
          console.groupCollapsed('PhysicsDebug');
          console.log('input', vi);
          console.log('vehicleState', vehicle ? vehicle.getState() : null);
          console.log('vehicle.input', vehicle ? vehicle.input : null);
          const backend = physicsWorld && physicsWorld.constructor && physicsWorld.constructor.name ? physicsWorld.constructor.name : 'unknown';
          const ready = physicsWorld && typeof physicsWorld.isReady === 'function' ? physicsWorld.isReady() : true;
          console.log('physics backend', backend, 'ready', ready);
          try {
            const phys: any = physicsWorld;
            if (phys && phys.bodies && vehicle && vehicle.bodyHandle != null) {
              const rec = phys.bodies.get(vehicle.bodyHandle);
              console.log('bodyRec', rec);
              try { const tf = phys.getBodyTransform(vehicle.bodyHandle); console.log('bodyTransform', tf); } catch (e) {}
            }
          } catch (e) {}
          console.groupEnd();
        } catch (e) { console.warn('physics debug failed', e); }
      }

      const s = (typeof vehicle !== 'undefined' && vehicle && typeof vehicle.getState === 'function') ? vehicle.getState() : { position: { x: 0, y: 0, z: 0 }, rotation: { x:0,y:0,z:0 }, speed: 0 };

      if ((carMesh as any).position) {
        (carMesh as any).position.x = s.position.x;
        (carMesh as any).position.y = Math.max(0.25, s.position.y);
        // use vehicle state z so forward motion is visible
        (carMesh as any).position.z = s.position.z;
        (carMesh as any).rotation.y = s.rotation.y;
      }

      const camTarget = new THREE.Vector3((carMesh as any).position.x, (carMesh as any).position.y + 1.5, (carMesh as any).position.z + 2);
      camera.position.lerp(new THREE.Vector3((carMesh as any).position.x, (carMesh as any).position.y + 4, (carMesh as any).position.z - 8), 0.08);
      camera.lookAt(camTarget);

      // update worldZ
      try {
        const physReady = physicsWorld && typeof physicsWorld.isReady === 'function' ? physicsWorld.isReady() : false;
        const hasGetter = vehicle && typeof (vehicle as any).getTravelledDistance === 'function';
        if (physReady && hasGetter) {
          const travelled = (vehicle as any).getTravelledDistance();
          if (typeof travelled === 'number' && !isNaN(travelled)) {
            worldZ = travelled;
          } else {
            worldZ += (s.speed || 0) * dt;
          }
        } else {
          worldZ += (s.speed || 0) * dt;
        }
      } catch (e) {}
      try { roadManager.update(worldZ, s.speed, dt); } catch (e) {}

      try {
        roadConfig.roadOffset -= (s.speed || 0) * dt * roadConfig.scrollFactor;
      } catch (e) {}

      try {
        if (typeof sky !== 'undefined' && sky.position) sky.position.copy(camera.position);
      } catch (e) { /* ignore */ }

      try {
        const vs: VehicleStateSimple = {
          speed: (typeof vehicle !== 'undefined' && vehicle && typeof vehicle.getState === 'function') ? vehicle.getState().speed : 0,
          throttle: (typeof vehicle !== 'undefined' && vehicle) ? vehicle.input?.throttle ?? 0 : 0,
          brakePressure: (typeof vehicle !== 'undefined' && vehicle) ? vehicle.brakePressure ?? 0 : 0,
          steer: (typeof vehicle !== 'undefined' && vehicle) ? vehicle.input?.steer ?? 0 : 0,
          rpm: (typeof vehicle !== 'undefined' && vehicle) ? vehicle.getState().rpm ?? 0 : 0
        };
        if (animController) animController.update(dt, vs);
      } catch (e) {}

      hud.innerHTML = `Speed: ${ (s.speed).toFixed(2) } m/s`;
      try {
        const backend = physicsWorld && physicsWorld.constructor && physicsWorld.constructor.name ? physicsWorld.constructor.name : (physSelect ? physSelect.value : 'unknown');
        const ready = physicsWorld && typeof physicsWorld.isReady === 'function' ? physicsWorld.isReady() : true;
        physStatus.textContent = `Physics: ${backend} ${ready ? '(ready)' : '(initializing)'}`;
        physStatus.style.color = ready ? 'lightgreen' : 'orange';
      } catch (e) { /* ignore UI update errors */ }
    }

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  animate();

  // load initial level just before first animate call (ensure vehicle exists)
  // simple level loader using predefined list
  const levels = [
    { id: 'city', sceneUrl: '/assets/levels/level_city.json' },
    { id: 'canyon', sceneUrl: '/assets/levels/level_canyon.json' }
  ];
  async function loadLevel(idx: number) {
    try {
      const lvl = await resources.loadJson(levels[Math.max(0, Math.min(idx, levels.length - 1))].sceneUrl);
      console.log('Loaded level', lvl);
      // position car at start if provided
      if (lvl.startPositions && lvl.startPositions[0]) {
        const sp = lvl.startPositions[0];
        try {
          if (vehicle && typeof vehicle.reset === 'function') {
            vehicle.reset({ position: { x: sp.position[0], y: sp.position[1], z: sp.position[2] }, rotation: { x: 0, y: sp.rotation[1] || 0, z: 0 } });
          }
        } catch (e) { console.warn('Failed to reset vehicle', e); }
      }
      // load model from profile
      const modelPath = profile.modelPath;
      if (modelPath) {
        try {
          const gltf = await gltfLoader.load(modelPath);
          if (carMesh) scene.remove(carMesh as any);
          if (carMixer) { try { carMixer.stopAllAction(); } catch(e) {} carMixer = null; }
          const model = (gltf.scene) ? gltf.scene : gltf;
          carMesh = model;
          fitModelToVehicle(carMesh as any);
          (carMesh as any).position.set(0, 0.25, 0);
          scene.add(carMesh as any);
          try { if (animController) { animController.dispose(); animController = null; } } catch (e) {}
          if (gltf.animations && gltf.animations.length > 0) {
            try { animController = new AnimationController(carMesh, gltf.animations, profile); } catch (e) { console.warn('Failed to create AnimationController', e); animController = null; }
          }
        } catch (e) { console.warn('Failed to load glTF car model', e); }
      }
    } catch (e) {
      console.error('Failed to load level', e);
    }
  }
  loadLevel(0);

  // Load available tracks from assets/tracks (simple fetch on JSON files)
  async function loadTracks() {
    const list = ['desert_run.json', 'canyon_circuit.json'];
    for (const name of list) {
      try {
        const res = await fetch(`/assets/tracks/${name}`);
        if (!res.ok) continue;
        const j = await res.json();
        const opt = document.createElement('option');
        opt.value = name;
        opt.text = `${j.name} (${j.recommendedMode || 'mixed'})`;
        trackSelect.appendChild(opt);
      } catch (e) { }
    }
    // default select first
    if (trackSelect.options.length > 0) trackSelect.selectedIndex = 0;
  }
  loadTracks();

  trackSelect.onchange = async () => {
    const file = trackSelect.value;
    try {
      const res = await fetch(`/assets/tracks/${file}`);
      const j = await res.json();
      if (j.controlPoints) {
        roadManager.applyControlPoints(j.controlPoints, 500);
      }
      // display average bank in degrees
      try {
        const cps = j.controlPoints || [];
        if (cps.length > 0) {
          const avg = cps.reduce((s:any,p:any)=>s + (p.bank || 0), 0) / cps.length;
          bankLabel.textContent = `Avg bank: ${avg.toFixed(2)}бу`;
        } else {
          bankLabel.textContent = 'Avg bank: 0бу';
        }
      } catch(e){}
      // reset vehicle to start position if provided
      if (j.startPositions && j.startPositions[0]) {
        const sp = j.startPositions[0];
        try { vehicle.reset({ position: { x: sp.position[0], y: sp.position[1], z: sp.position[2] }, rotation: { x: 0, y: sp.rotation[1] || 0, z: 0 } }); } catch (e) {}
      }
    } catch (e) { console.warn('Failed to load track', e); }
  };

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
})();


// end of file
