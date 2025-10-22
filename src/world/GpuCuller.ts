import * as THREE from 'three';
import { RoadObjectDesc } from './RoadsideSpawner';
import WebGpuCuller from './WebGpuCuller';

export class GpuCuller {
  private gl: WebGL2RenderingContext | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private worker: Worker | null = null;

  constructor() {
    if (typeof window === 'undefined') return;
    try {
      // try to set up an inline worker using Blob to run OffscreenCanvas-based culling
      if (typeof Worker !== 'undefined') {
        try {
          // Prefer external worker file to avoid SES/CSP rejecting Blob/inline eval.
          try {
            this.worker = new Worker('/gpu_culler_worker.js');
            this.worker.onerror = (ev) => {
              console.warn('GpuCuller worker error (external), disabling worker:', ev.message || ev);
              try { this.worker?.terminate(); } catch (e) {}
              this.worker = null;
            };
          } catch (externalErr) {
            // external worker load failed (maybe not served); fall back to inline worker
            const workerCode = `
          self.onmessage = async function(e) {
            try {
              const { instances, pv, count } = e.data;
               const texW = Math.ceil(Math.sqrt(count));
               const texH = texW;
               const off = new OffscreenCanvas(texW, texH);
               const gl = off.getContext('webgl2');
               if (!gl) { self.postMessage({ error: 'no-webgl2' }); return; }
               const useFloat = !!gl.getExtension('EXT_color_buffer_float');
               // create pos texture
               const posTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, posTex);
               if (useFloat) {
                 const f32 = new Float32Array(texW*texH*4);
                 for (let i=0;i<count;i++){ f32[i*4+0]=instances[i*3+0]; f32[i*4+1]=instances[i*3+1]; f32[i*4+2]=instances[i*3+2]; f32[i*4+3]=1.0; }
                 gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,texW,texH,0,gl.RGBA,gl.FLOAT,f32);
               } else {
                 // compute ranges
                 let minX=Infinity,minY=Infinity,minZ=Infinity,maxX=-Infinity,maxY=-Infinity,maxZ=-Infinity;
                 for (let i=0;i<count;i++){ const x=instances[i*3+0], y=instances[i*3+1], z=instances[i*3+2]; if(x<minX)minX=x; if(y<minY)minY=y; if(z<minZ)minZ=z; if(x>maxX)maxX=x; if(y>maxY)maxY=y; if(z>maxZ)maxZ=z; }
                 const pad=1e-3; minX-=pad;minY-=pad;minZ-=pad;maxX+=pad;maxY+=pad;maxZ+=pad; const rangeX=Math.max(1e-6,maxX-minX), rangeY=Math.max(1e-6,maxY-minY), rangeZ=Math.max(1e-6,maxZ-minZ);
                 const u8 = new Uint8Array(texW*texH*4);
                 for (let i=0;i<count;i++){ const x=(instances[i*3+0]-minX)/rangeX; const y=(instances[i*3+1]-minY)/rangeY; const z=(instances[i*3+2]-minZ)/rangeZ; u8[i*4+0]=Math.floor(Math.max(0,Math.min(1,x))*255); u8[i*4+1]=Math.floor(Math.max(0,Math.min(1,y))*255); u8[i*4+2]=Math.floor(Math.max(0,Math.min(1,z))*255); u8[i*4+3]=255; }
                 gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,texW,texH,0,gl.RGBA,gl.UNSIGNED_BYTE,u8);
                 // store ranges as uniforms via copying to shared memory in message? For PoC we skip exact decode ranges and assume local relative positions.
               }
               gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
               // create fbo
               const fbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);
               const outTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,outTex);
               if (useFloat) gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,texW,texH,0,gl.RGBA,gl.FLOAT,null); else gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,texW,texH,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
               gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
               gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, outTex, 0);
               if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) { self.postMessage({ error: 'fbo' }); return; }
               // compile minimal shaders
               function compile(type, src){ const s=gl.createShader(type); gl.shaderSource(s,src); gl.compileShader(s); if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
               const vs = '#version 300 es\nlayout(location=0) in vec2 a; void main(){gl_Position=vec4(a,0,1);}';
               const fsFloat = '#version 300 es\nprecision highp float; uniform sampler2D uPos; uniform mat4 uPV; uniform float uW; uniform float uH; out vec4 o; void main(){ ivec2 pix=ivec2(int(gl_FragCoord.x)-1,int(gl_FragCoord.y)-1); vec2 uv=(vec2(pix)+0.5)/vec2(uW,uH); vec4 p=texture(uPos,uv); vec4 clip=uPV*vec4(p.xyz,1.0); bool vis=false; if(clip.w!=0.0){ if(abs(clip.x)<=clip.w && abs(clip.y)<=clip.w && clip.z>=-clip.w && clip.z<=clip.w) vis=true; } o=vec4(vis?1.0:0.0,0,0,1); }';
               const fsByte = '#version 300 es\nprecision highp float; uniform sampler2D uPos; uniform mat4 uPV; uniform float uW; uniform float uH; out vec4 o; void main(){ ivec2 pix=ivec2(int(gl_FragCoord.x)-1,int(gl_FragCoord.y)-1); vec2 uv=(vec2(pix)+0.5)/vec2(uW,uH); vec4 e=texture(uPos,uv); vec3 p=e.rgb; vec4 clip=uPV*vec4(p,1.0); bool vis=false; if(clip.w!=0.0){ if(abs(clip.x)<=clip.w && abs(clip.y)<=clip.w && clip.z>=-clip.w && clip.z<=clip.w) vis=true; } o=vec4(vis?1.0:0.0,0,0,1); }';
               let prog = gl.createProgram(); try{ const s1=compile(gl.VERTEX_SHADER,vs); const s2=compile(gl.FRAGMENT_SHADER,useFloat?fsFloat:fsByte); gl.attachShader(prog,s1); gl.attachShader(prog,s2); gl.linkProgram(prog); if(!gl.getProgramParameter(prog,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog)); } catch(err){ self.postMessage({ error: err.message }); return; }
               const vao = gl.createVertexArray(); gl.bindVertexArray(vao); const vb=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,vb); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
               gl.useProgram(prog); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,posTex); gl.uniform1i(gl.getUniformLocation(prog,'uPos'),0);
               gl.uniformMatrix4fv(gl.getUniformLocation(prog,'uPV'), false, new Float32Array(pv)); gl.uniform1f(gl.getUniformLocation(prog,'uW'), texW); gl.uniform1f(gl.getUniformLocation(prog,'uH'), texH);
               gl.bindFramebuffer(gl.FRAMEBUFFER,fbo); gl.drawBuffers([gl.COLOR_ATTACHMENT0]); gl.clearColor(0,0,0,1); gl.clear(gl.COLOR_BUFFER_BIT); gl.bindVertexArray(vao); gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
               let buf; if(useFloat){ buf = new Float32Array(texW*texH*4); gl.readPixels(0,0,texW,texH,gl.RGBA,gl.FLOAT,buf);} else { buf=new Uint8Array(texW*texH*4); gl.readPixels(0,0,texW,texH,gl.RGBA,gl.UNSIGNED_BYTE,buf);} const vis = []; for(let i=0;i<count;i++){ if(useFloat){ if(buf[i*4]>0.5) vis.push(i); } else { if(buf[i*4]>0) vis.push(i); } }
               self.postMessage({ visible: vis });
             } catch (e) { self.postMessage({ error: e.message }); }
           };
          `;
            const blob = new Blob([workerCode], { type: 'application/javascript' });
            try {
              this.worker = new Worker(URL.createObjectURL(blob));
              this.worker.onerror = (ev) => {
                console.warn('GpuCuller worker error (inline), disabling worker:', ev.message || ev);
                try { this.worker?.terminate(); } catch (e) {}
                this.worker = null;
              };
            } catch (e) {
              // Unable to create Worker (CSP/SES). Fall back to sync path.
              console.warn('GpuCuller: inline worker creation failed, falling back to sync cull', e);
              this.worker = null;
            }
          }
        } catch (e) {
          // building worker code or Blob may throw under SES/CSP - ignore and fall back
          console.warn('GpuCuller: cannot initialize worker, falling back to sync cull', e);
          this.worker = null;
        }
      }
      // also set up a small canvas-based gl fallback for sync cull
      this.canvas = document.createElement('canvas'); this.canvas.width = 1; this.canvas.height = 1; this.gl = this.canvas.getContext('webgl2') as any;
    } catch (e) {
      this.canvas = null; this.gl = null; this.worker = null;
    }
  }

  isSupported() { return !!this.gl || !!this.worker || (!!WebGpuCuller && typeof (WebGpuCuller as any).requestCull === 'function'); }

  async isWebGpuSupported() {
    if (!WebGpuCuller) return false;
    try { return await (WebGpuCuller as any).init(65536); } catch (e) { return false; }
  }

  // async cull using worker if available; resolves to Set<number> or null
  cullAsync(instances: RoadObjectDesc[], camera: THREE.Camera): Promise<Set<number> | null> {
    if ((WebGpuCuller as any) && (WebGpuCuller as any).isSupported && (WebGpuCuller as any).isSupported()) {
      try {
        // try WebGPU path: pack positions into Float32Array
        const arr = new Float32Array(instances.length * 4);
        for (let i = 0; i < instances.length; i++) {
          arr[i*4+0] = instances[i].lateral ?? 0;
          arr[i*4+1] = instances[i].y ?? 0;
          arr[i*4+2] = instances[i].z;
          arr[i*4+3] = 1.0;
        }
        const pv = new Float32Array(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).elements);
        return (WebGpuCuller as any).requestCull(arr, pv, instances.length).then((visIndices:Array<number>) => new Set<number>(visIndices)).catch(()=>{
          // fall back to other paths
          return this._fallbackCullAsync(instances, camera);
        });
      } catch (e) {
        return this._fallbackCullAsync(instances, camera);
      }
    }
    return this._fallbackCullAsync(instances, camera);
  }

  private _fallbackCullAsync(instances: RoadObjectDesc[], camera: THREE.Camera): Promise<Set<number> | null> {
    if (this.worker) {
      return new Promise((resolve) => {
        const arr = new Float32Array(instances.length * 3);
        for (let i = 0; i < instances.length; i++) {
          arr[i*3+0] = instances[i].lateral ?? 0;
          arr[i*3+1] = instances[i].y ?? 0;
          arr[i*3+2] = instances[i].z;
        }
        const pv = new Float32Array(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).elements);
        const onmsg = (ev: MessageEvent) => {
          const d = ev.data;
          if (d && d.visible) {
            const s = new Set<number>(d.visible);
            resolve(s);
          } else {
            resolve(null);
          }
          this.worker!.removeEventListener('message', onmsg);
        };
        this.worker.addEventListener('message', onmsg);
        try {
          this.worker.postMessage({ instances: arr, pv: pv, count: instances.length }, [arr.buffer, pv.buffer]);
        } catch (e) {
          // worker.postMessage failed (security/CSP); disable worker and fallback to sync
          console.warn('GpuCuller: worker.postMessage failed, disabling worker and falling back to sync cull', e);
          try { this.worker.terminate(); } catch (_) {}
          this.worker = null;
          resolve(this.cull(instances, camera));
        }
       });
     }
    // fallback to sync cull
    return Promise.resolve(this.cull(instances, camera));
  }

  // existing synchronous cull (kept for fallback)
  cull(instances: RoadObjectDesc[], camera: THREE.Camera): Set<number> | null {
    if (!this.gl || !this.canvas) return null;
    const gl = this.gl;
    const count = instances.length;
    if (count === 0) return new Set<number>();

    const texW = Math.ceil(Math.sqrt(count));
    const texH = texW;
    this.canvas.width = texW; this.canvas.height = texH;
    gl.viewport(0, 0, texW, texH);
    const useFloat = !!gl.getExtension('EXT_color_buffer_float');
    const posFloat = new Float32Array(texW * texH * 4);
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (let i = 0; i < count; i++) {
      const p = instances[i];
      const x = (p.lateral ?? 0);
      const y = (p.y ?? 0);
      const z = p.z;
      if (x < minX) minX = x; if (y < minY) minY = y; if (z < minZ) minZ = z;
      if (x > maxX) maxX = x; if (y > maxY) maxY = y; if (z > maxZ) maxZ = z;
      posFloat[i*4+0] = x; posFloat[i*4+1] = y; posFloat[i*4+2] = z; posFloat[i*4+3] = 1.0;
    }
    const pad = 1e-3; minX -= pad; minY -= pad; minZ -= pad; maxX += pad; maxY += pad; maxZ += pad;
    const rangeX = Math.max(1e-6, maxX - minX); const rangeY = Math.max(1e-6, maxY - minY); const rangeZ = Math.max(1e-6, maxZ - minZ);
    const posTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, posTex);
    if (useFloat) { gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,texW,texH,0,gl.RGBA,gl.FLOAT,posFloat); }
    else { const u8 = new Uint8Array(texW*texH*4); for (let i=0;i<count;i++){ const x=(posFloat[i*4+0]-minX)/rangeX; const y=(posFloat[i*4+1]-minY)/rangeY; const z=(posFloat[i*4+2]-minZ)/rangeZ; u8[i*4+0]=Math.floor(Math.max(0,Math.min(1,x))*255); u8[i*4+1]=Math.floor(Math.max(0,Math.min(1,y))*255); u8[i*4+2]=Math.floor(Math.max(0,Math.min(1,z))*255); u8[i*4+3]=255; } gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,texW,texH,0,gl.RGBA,gl.UNSIGNED_BYTE,u8); }
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
    const fbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);
    const outTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,outTex);
    if (useFloat) gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,texW,texH,0,gl.RGBA,gl.FLOAT,null); else gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,texW,texH,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, outTex, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) return null;
    function compile(type, src){ const s=gl.createShader(type); gl.shaderSource(s,src); gl.compileShader(s); if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
    const vert = `#version 300 es\nlayout(location=0) in vec2 aPos; void main(){ gl_Position=vec4(aPos,0,1); }`;
    const fragFloat = `#version 300 es\nprecision highp float; uniform sampler2D uPos; uniform mat4 uPV; uniform float uW; uniform float uH; out vec4 o; void main(){ ivec2 pix=ivec2(int(gl_FragCoord.x)-1,int(gl_FragCoord.y)-1); vec2 uv=(vec2(pix)+0.5)/vec2(uW,uH); vec4 p=texture(uPos,uv); vec4 clip=uPV*vec4(p.xyz,1.0); bool vis=false; if(clip.w!=0.0){ if(abs(clip.x)<=clip.w && abs(clip.y)<=clip.w && clip.z>=-clip.w && clip.z<=clip.w) vis=true; } o=vec4(vis?1.0:0.0,0,0,1); }`;
    const fragByte = `#version 300 es\nprecision highp float; uniform sampler2D uPos; uniform mat4 uPV; uniform float uW; uniform float uH; uniform vec3 uMin; uniform vec3 uRange; out vec4 o; void main(){ ivec2 pix=ivec2(int(gl_FragCoord.x)-1,int(gl_FragCoord.y)-1); vec2 uv=(vec2(pix)+0.5)/vec2(uW,uH); vec4 e=texture(uPos,uv); vec3 p=e.rgb*uRange+uMin; vec4 clip=uPV*vec4(p,1.0); bool vis=false; if(clip.w!=0.0){ if(abs(clip.x)<=clip.w && abs(clip.y)<=clip.w && clip.z>=-clip.w && clip.z<=clip.w) vis=true; } o=vec4(vis?1.0:0.0,0,0,1); }`;
    let prog = gl.createProgram(); try{ const s1=compile(gl.VERTEX_SHADER,vert); const s2=compile(gl.FRAGMENT_SHADER,useFloat?fragFloat:fragByte); gl.attachShader(prog,s1); gl.attachShader(prog,s2); gl.linkProgram(prog); if(!gl.getProgramParameter(prog,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog)); } catch(e){ return null; }
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao); const vb=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,vb); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
    gl.useProgram(prog); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,posTex); gl.uniform1i(gl.getUniformLocation(prog,'uPos'),0);
    const pv = new THREE.Matrix4(); pv.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    gl.uniformMatrix4fv(gl.getUniformLocation(prog,'uPV'), false, new Float32Array(pv.elements)); gl.uniform1f(gl.getUniformLocation(prog,'uW'), texW); gl.uniform1f(gl.getUniformLocation(prog,'uH'), texH);
    if (!useFloat) { gl.uniform3f(gl.getUniformLocation(prog,'uMin'), minX, minY, minZ); gl.uniform3f(gl.getUniformLocation(prog,'uRange'), rangeX, rangeY, rangeZ); }
    gl.bindFramebuffer(gl.FRAMEBUFFER,fbo); gl.drawBuffers([gl.COLOR_ATTACHMENT0]); gl.clearColor(0,0,0,1); gl.clear(gl.COLOR_BUFFER_BIT); gl.bindVertexArray(vao); gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    let buf; if(useFloat){ buf=new Float32Array(texW*texH*4); gl.readPixels(0,0,texW,texH,gl.RGBA,gl.FLOAT,buf); } else { buf=new Uint8Array(texW*texH*4); gl.readPixels(0,0,texW,texH,gl.RGBA,gl.UNSIGNED_BYTE,buf); }
    const visSet = new Set<number>(); for(let i=0;i<count;i++){ if(useFloat){ if(buf[i*4]>0.5) visSet.add(i); } else { if(buf[i*4]>0) visSet.add(i); } }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.deleteTexture(posTex); gl.deleteTexture(outTex); gl.deleteProgram(prog); gl.deleteBuffer(vb); gl.deleteVertexArray(vao);
    return visSet;
  }
}

export default new GpuCuller();
