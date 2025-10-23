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
import WebGpuCuller from './world/WebGpuCuller';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight,0.1,1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio ||1);
document.body.appendChild(renderer.domElement);

const light = new THREE.DirectionalLight(0xffffff,1);
light.position.set(5,10,7.5);
scene.add(light);
const amb = new THREE.AmbientLight(0x606060);
scene.add(amb);

const gltfLoader = new GLTFLoaderWrapper();
const resources = new ResourceManager();
const engineFactory = new EngineFactory(resources);

// Helper: fit a loaded glTF model to vehicle dimensions
function fitModelToVehicle(obj: THREE.Object3D, target = { length:4, width:1.8, height:0.8 }) {
 // compute bounding box
 const box = new THREE.Box3().setFromObject(obj);
 const size = new THREE.Vector3();
 box.getSize(size);
 if (size.x ===0 || size.y ===0 || size.z ===0) return;

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

 // place bottom of model on ground at y =0.25 (vehicle half height)
 const box3 = new THREE.Box3().setFromObject(obj);
 const min = box3.min;
 const oy = min.y;
 obj.position.y += (0.25 - oy);
}

// Helper: create a canvas texture with stripe for car
function createCarTexture(): HTMLCanvasElement {
 const size =512;
 const cvs = document.createElement('canvas');
 cvs.width = size;
 cvs.height = size;
 const ctx = cvs.getContext('2d')!;

 // base color
 ctx.fillStyle = '#ff3333';
 ctx.fillRect(0,0, size, size);

 // darker bottom
 const grad = ctx.createLinearGradient(0,0,0, size);
 grad.addColorStop(0, 'rgba(255,255,255,0.08)');
 grad.addColorStop(1, 'rgba(0,0,0,0.12)');
 ctx.fillStyle = grad;
 ctx.fillRect(0,0, size, size);

 // racing stripe
 ctx.fillStyle = '#ffffff';
 ctx.fillRect(size *0.45,0, size *0.1, size);

 // subtle scratches/noise
 ctx.globalAlpha =0.05;
 for (let i =0; i <2000; i++) {
 ctx.fillStyle = 'black';
 const x = Math.random() * size;
 const y = Math.random() * size;
 ctx.fillRect(x, y,1,1);
 }
 ctx.globalAlpha =1;
 return cvs;
}

// Helper: asphalt road texture tile
function createRoadTexture(): HTMLCanvasElement {
 const w =512;
 const h =512;
 const cvs = document.createElement('canvas');
 cvs.width = w;
 cvs.height = h;
 const ctx = cvs.getContext('2d')!;

 // base gray
 ctx.fillStyle = '#3a3a3a';
 ctx.fillRect(0,0, w, h);

 // noise
 ctx.fillStyle = 'rgba(0,0,0,0.12)';
 for (let i =0; i <3000; i++) {
 const x = Math.random() * w;
 const y = Math.random() * h;
 const s = Math.random() *2;
 ctx.fillRect(x, y, s, s);
 }

 // lane divider (center)
 ctx.strokeStyle = '#dddd77';
 ctx.lineWidth =6;
 ctx.setLineDash([40,30]);
 ctx.beginPath();
 ctx.moveTo(w /2,0);
 ctx.lineTo(w /2, h);
 ctx.stroke();
 ctx.setLineDash([]);

 return cvs;
}

// Helper: simple sky gradient canvas as texture
function createSkyTexture(): HTMLCanvasElement {
 const w =512;
 const h =256;
 const cvs = document.createElement('canvas');
 cvs.width = w;
 cvs.height = h;
 const ctx = cvs.getContext('2d')!;
 const g = ctx.createLinearGradient(0,0,0, h);
 g.addColorStop(0, '#87ceeb'); // light sky blue
 g.addColorStop(1, '#e0f7ff');
 ctx.fillStyle = g;
 ctx.fillRect(0,0, w, h);
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
 road.repeat.set(1,8);
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
 textures.road.repeat.set(1,8);
 textures.road.needsUpdate = true;
 } catch (e) { }

 // Skybox as large sphere with inside-out material
 const skyGeo = new THREE.SphereGeometry(400,16,12);
 const skyMat = new THREE.MeshBasicMaterial({ map: textures.sky, side: THREE.BackSide });
 const sky = new THREE.Mesh(skyGeo, skyMat);
 scene.add(sky);

 // road (single mesh kept only for material reference)
 const roadWidth =6;
 const roadLength =1000;
 const roadGeo = new THREE.PlaneGeometry(roadWidth, roadLength,1,1);
 const roadMat = new THREE.MeshStandardMaterial({ map: textures.road });
 const road = new THREE.Mesh(roadGeo, roadMat);
 road.rotation.x = -Math.PI /2;
 road.position.y =0.001; // slightly above ground
 road.position.z =0;

 // wider ground around road
 const groundGeo = new THREE.PlaneGeometry(200,200);
 const groundMat = new THREE.MeshStandardMaterial({ color:0x2b7a2b });
 const ground = new THREE.Mesh(groundGeo, groundMat);
 ground.rotation.x = -Math.PI /2;
 ground.position.y = -0.01;
 ground.position.z =0;
 scene.add(ground);

 // placeholder car mesh (will be replaced by GLTF if available)
 const placeholderCarGeo = new THREE.BoxGeometry(1.8,0.5,4);
 const placeholderCarMat = new THREE.MeshStandardMaterial({ map: textures.car, metalness:0.2, roughness:0.4 });
 carMesh = new THREE.Mesh(placeholderCarGeo, placeholderCarMat);
 carMesh.position.y =0.25;
 carMesh.position.z =0;
 scene.add(carMesh);

 camera.position.set(0,4, -8);
 camera.lookAt(new THREE.Vector3(0,0,0));

 // road configuration grouped (ensure declared before use)
 const roadConfig = {
 segmentLength:50,
 numSegments:12,
 textureRepeatY:8,
 scrollFactor:0.2,
 roadOffset:0,
 // example control points (x,z) for a natural spline path ?? editable at runtime via UI below
 controlPoints: [
 { x:0, z:0 },
 { x:6, z:120 },
 { x: -4, z:260 },
 { x:0, z:400 },
 { x:8, z:560 }
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
 if (ok) {
 console.log('WebGPU culler initialized');
 webgpuStatus.textContent = 'WebGPU: available (click details)';
 try {
 const adapter = (WebGpuCuller as any).adapter;
 const device = (WebGpuCuller as any).device;
 const features = adapter ? Array.from((adapter as any).features || []) : [];
 const limits = adapter ? (adapter as any).limits || {} : {};
 const info: any = {};
 info.adapter = adapter ? (adapter as any).info || null : null;
 info.features = features;
 info.limits = limits;
 info.device = !!device;
 webgpuContent.textContent = JSON.stringify(info, null,2);
 } catch (e) {
 console.warn('Failed to read WebGPU adapter details', e);
 }
 } else {
 console.log('WebGPU not available');
 webgpuStatus.textContent = 'WebGPU: not available';
 }
 } catch (e) {
 console.warn('WebGPU prewarm failed', e);
 webgpuStatus.textContent = 'WebGPU: error';
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
 hud.innerHTML = 'Speed:0.0 m/s';
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

 // loading status and validation warnings area
 const loadStatus = document.createElement('div');
 loadStatus.style.marginTop = '8px';
 loadStatus.style.fontSize = '12px';
 loadStatus.style.color = 'white';
 loadStatus.textContent = 'Level: idle';

 const warningsContainer = document.createElement('div');
 warningsContainer.style.marginTop = '6px';
 warningsContainer.style.fontSize = '12px';
 warningsContainer.style.color = '#ffd966'; // yellow-ish for warnings
 warningsContainer.style.maxWidth = '320px';
 warningsContainer.style.overflowY = 'auto';
 warningsContainer.style.maxHeight = '200px';
 warningsContainer.innerHTML = '';

 // show details button to open modal
const showDetailsBtn = document.createElement('button');
showDetailsBtn.textContent = 'Show details';
showDetailsBtn.style.marginLeft = '8px';

// create modal overlay for warnings/errors
const modalOverlay = document.createElement('div');
modalOverlay.style.position = 'fixed';
modalOverlay.style.left = '0';
modalOverlay.style.top = '0';
modalOverlay.style.width = '100%';
modalOverlay.style.height = '100%';
modalOverlay.style.background = 'rgba(0,0,0,0.6)';
modalOverlay.style.display = 'none';
modalOverlay.style.alignItems = 'center';
modalOverlay.style.justifyContent = 'center';
modalOverlay.style.zIndex = '9999';

const modalPanel = document.createElement('div');
modalPanel.style.background = '#222';
modalPanel.style.color = 'white';
modalPanel.style.padding = '16px';
modalPanel.style.borderRadius = '8px';
modalPanel.style.maxWidth = '720px';
modalPanel.style.maxHeight = '70%';
modalPanel.style.overflowY = 'auto';
modalPanel.style.boxShadow = '08px32px rgba(0,0,0,0.6)'

const modalTitle = document.createElement('div');
modalTitle.style.fontWeight = 'bold';
modalTitle.style.marginBottom = '8px';
modalTitle.textContent = 'Level load details';

const modalContent = document.createElement('div');
modalContent.style.fontSize = '13px';
modalContent.style.lineHeight = '1.4';

const modalControls = document.createElement('div');
modalControls.style.marginTop = '12px';
modalControls.style.textAlign = 'right';

const clearWarningsBtn = document.createElement('button');
clearWarningsBtn.textContent = 'Clear warnings';
clearWarningsBtn.style.marginRight = '8px';

const closeModalBtn = document.createElement('button');
closeModalBtn.textContent = 'Close';

modalControls.appendChild(clearWarningsBtn);
modalControls.appendChild(closeModalBtn);
modalPanel.appendChild(modalTitle);
modalPanel.appendChild(modalContent);
modalPanel.appendChild(modalControls);
modalOverlay.appendChild(modalPanel);
document.body.appendChild(modalOverlay);

// local storage key for persisted warnings/errors
const WARNINGS_STORAGE_KEY = 'levelLoadWarnings';

function saveWarningsToStorage(warns: string[] | undefined, errs: string[] | undefined) {
 try {
 const payload = { warnings: warns || [], errors: errs || [], updated: Date.now() };
 localStorage.setItem(WARNINGS_STORAGE_KEY, JSON.stringify(payload));
 } catch (e) { /* ignore storage errors */ }
}

function loadWarningsFromStorage() {
 try {
 const raw = localStorage.getItem(WARNINGS_STORAGE_KEY);
 if (!raw) return null;
 return JSON.parse(raw);
 } catch (e) { return null; }
}

function clearStoredWarnings() {
 try { localStorage.removeItem(WARNINGS_STORAGE_KEY); } catch (e) {}
}

// hook up show details and modal controls
showDetailsBtn.onclick = () => { modalOverlay.style.display = 'flex'; };
closeModalBtn.onclick = () => { modalOverlay.style.display = 'none'; };
clearWarningsBtn.onclick = () => {
 warningsContainer.innerHTML = '';
 modalContent.innerHTML = '';
 modalOverlay.style.display = 'none';
 loadStatus.textContent = 'Level: idle';
 loadStatus.style.color = 'white';
 clearStoredWarnings();
};

// On startup, load any persisted warnings/errors and show compact UI
const persisted = loadWarningsFromStorage();
if (persisted && ((persisted.warnings && persisted.warnings.length) || (persisted.errors && persisted.errors.length))) {
 if (persisted.warnings && persisted.warnings.length) {
 warningsContainer.innerHTML = '<b>Saved warnings:</b><br/>' + persisted.warnings.map((w: string) => `<div>- ${w}</div>`).join('');
 modalContent.innerHTML = '<b>Saved warnings:</b><br/>' + persisted.warnings.map((w: string) => `<div>- ${w}</div>`).join('');
 }
 if (persisted.errors && persisted.errors.length) {
 warningsContainer.innerHTML += '<div style="color:#ff6b6b"><b>Saved errors:</b></div>' + persisted.errors.map((e: string) => `<div style="color:#ff6b6b">- ${e}</div>`).join('');
 modalContent.innerHTML += '<div style="color:#ff6b6b"><b>Saved errors:</b></div>' + persisted.errors.map((e: string) => `<div style="color:#ff6b6b">- ${e}</div>`).join('');
 }
 loadStatus.textContent = 'Level: idle (saved warnings)';
 loadStatus.style.color = '#ffd966';
 }

async function loadLevel(idx: number) {
 try {
 const lvlUrl = levels[Math.max(0, Math.min(idx, levels.length -1))].sceneUrl;
 // UI: show loading status
 loadStatus.textContent = `Level: loading ${lvlUrl}...`;
 loadStatus.style.color = 'white';
 warningsContainer.innerHTML = '';
 modalContent.innerHTML = '';

 const ctx = { scene, vehicle, carMeshRef: { value: carMesh }, gltfLoader, assetLoader, spawner };
 const res = await engineFactory.loadAndApplyLevel(lvlUrl, ctx);
 console.log('Loaded level result', res);

 // update UI and persist warnings/errors
 if (res.warnings && res.warnings.length) {
 warningsContainer.innerHTML = '<b>Warnings:</b><br/>' + res.warnings.map(w => `<div>- ${w}</div>`).join('');
 modalContent.innerHTML = '<b>Warnings:</b><br/>' + res.warnings.map(w => `<div>- ${w}</div>`).join('');
 } else {
 warningsContainer.innerHTML = '';
 modalContent.innerHTML = '';
 }

 if (res.errors && res.errors.length) {
 warningsContainer.innerHTML += '<div style="color:#ff6b6b"><b>Errors:</b></div>' + res.errors.map(e => `<div style="color:#ff6b6b">- ${e}</div>`).join('');
 modalContent.innerHTML += '<div style="color:#ff6b6b"><b>Errors:</b></div>' + res.errors.map(e => `<div style="color:#ff6b6b">- ${e}</div>`).join('');
 }

 // persist to storage if any warnings/errors
 if ((res.warnings && res.warnings.length) || (res.errors && res.errors.length)) {
 saveWarningsToStorage(res.warnings, res.errors);
 }

 if (res.partial) {
 loadStatus.textContent = `Level: loaded (partial, see warnings)`;
 loadStatus.style.color = '#ffd966';
 // auto-open modal for warnings/errors so user notices
 modalOverlay.style.display = 'flex';
 } else {
 loadStatus.textContent = `Level: loaded`;
 loadStatus.style.color = 'lightgreen';
 }

 // if engineFactory replaced carMeshRef, update local reference
 if (ctx.carMeshRef && ctx.carMeshRef.value) {
 carMesh = ctx.carMeshRef.value;
 // ensure fit
 try { fitModelToVehicle(carMesh as any); } catch (e) {}
 }
 } catch (e) {
 console.error('Failed to load level', e);
 loadStatus.textContent = `Level: failed to load`;
 loadStatus.style.color = '#ff6b6b';
 warningsContainer.innerHTML = `<div style="color:#ff6b6b">${e?.message ?? String(e)}</div>`;
 modalContent.innerHTML = warningsContainer.innerHTML;
 saveWarningsToStorage([], [e?.message ?? String(e)]);
 modalOverlay.style.display = 'flex';
 }
}

// Load available tracks from assets/tracks (simple fetch on JSON files)
async function loadTracks() {
 const list = ['desert_run.json', 'canyon_circuit.json'];
 // find or create select element by id to be robust against ordering
 let select: HTMLSelectElement | null = document.getElementById('trackSelect') as HTMLSelectElement | null;
 if (!select) {
 select = document.createElement('select');
 select.id = 'trackSelect';
 // append near end of UI
 try { ui.appendChild(select); } catch (e) { document.body.appendChild(select); }
 }
 for (const name of list) {
 try {
 const res = await fetch(`/assets/tracks/${name}`);
 if (!res.ok) continue;
 const j = await res.json();
 const opt = document.createElement('option');
 opt.value = name;
 opt.text = `${j.name} (${j.recommendedMode || 'mixed'})`;
 select.appendChild(opt);
 } catch (e) { }
 }
 // default select first
 if (select.options.length >0) select.selectedIndex =0;

 // attach onchange handler directly to this select so it's always wired
 select.onchange = async () => {
 const file = select!.value;
 try {
 const res = await fetch(`/assets/tracks/${file}`);
 const j = await res.json();
 if (j.controlPoints) {
 roadManager.applyControlPoints(j.controlPoints,500);
 }
 // load baked scenery if specified in track file
 try {
 if (j.bakedSceneryUrl && spawner && typeof (spawner as any).loadBakedFromUrl === 'function') {
 try { await (spawner as any).loadBakedFromUrl(j.bakedSceneryUrl, resources); console.log('Loaded baked scenery from track', j.bakedSceneryUrl); } catch (e) { console.warn('Failed to load baked scenery from track', e); }
 }
 } catch (e) { }
 // display average bank in degrees
 try {
 const cps = j.controlPoints || [];
 if (cps.length >0) {
 const avg = cps.reduce((s: any, p: any) => s + (p.bank ||0),0) / cps.length;
 bankLabel.textContent = `Avg bank: ${avg.toFixed(2)}бу`;
 } else {
 bankLabel.textContent = 'Avg bank:0бу';
 }
 } catch (e) { }
 // reset vehicle to start position if provided
 if (j.startPositions && j.startPositions[0]) {
 const sp = j.startPositions[0];
 try { vehicle.reset({ position: { x: sp.position[0], y: sp.position[1], z: sp.position[2] }, rotation: { x:0, y: sp.rotation[1] ||0, z:0 } }); } catch (e) { }
 }
 } catch (e) { console.warn('Failed to load track', e); }
 };
}
loadTracks();

window.addEventListener('resize', () => {
 camera.aspect = window.innerWidth / window.innerHeight;
 camera.updateProjectionMatrix();
 renderer.setSize(window.innerWidth, window.innerHeight);
});
})();

// end of file
