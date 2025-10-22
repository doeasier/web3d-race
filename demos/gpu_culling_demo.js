(function(){
  const canvas = document.getElementById('glcanvas');
  const countSelect = document.getElementById('countSelect');
  const runCpu = document.getElementById('runCpu');
  const runGpu = document.getElementById('runGpu');
  const cpuResult = document.getElementById('cpuResult');
  const gpuResult = document.getElementById('gpuResult');
  const info = document.getElementById('info');

  canvas.width = Math.max(800, window.innerWidth - 100);
  canvas.height = Math.max(400, window.innerHeight * 0.6);

  function generateInstances(count) {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i*3+0] = (Math.random()-0.5) * 1000;
      arr[i*3+1] = (Math.random()) * 30;
      arr[i*3+2] = Math.random() * 2000;
    }
    return arr;
  }

  function cpuBaseline(inst) {
    const cam = { projectionMatrix: mat4_perspective(60, canvas.width / canvas.height, 0.1, 2000), matrixWorldInverse: mat4_lookAtInverse([0,50,-200],[0,0,400]) };
    const fr = buildFrustum(cam.projectionMatrix, cam.matrixWorldInverse);
    const t0 = performance.now();
    let vis=0;
    for (let i=0;i<inst.length/3;i++){
      const x = inst[i*3], y = inst[i*3+1], z = inst[i*3+2];
      if (pointInFrustum(x,y,z,fr)) vis++;
    }
    const t1 = performance.now();
    return {vis, time: t1-t0};
  }

  async function runGpuPoCDetailed(inst) {
    const gl = canvas.getContext('webgl2');
    if (!gl) { return { success:false, reason:'WebGL2 not supported' }; }
    const ext = gl.getExtension('EXT_color_buffer_float');
    const useFloat = !!ext;
    const count = inst.length/3;
    const texW = Math.ceil(Math.sqrt(count)); const texH = texW;

    const times = { upload: 0, compile: 0, draw: 0, readback: 0, total: 0 };
    const tTotal0 = performance.now();

    // upload
    const tUpload0 = performance.now();
    const posTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, posTex);
    if (useFloat) {
      const data = new Float32Array(texW*texH*4);
      for (let i=0;i<count;i++){ data[i*4+0]=inst[i*3]; data[i*4+1]=inst[i*3+1]; data[i*4+2]=inst[i*3+2]; data[i*4+3]=1; }
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,texW,texH,0,gl.RGBA,gl.FLOAT,data);
    } else {
      const u8 = new Uint8Array(texW*texH*4);
      let minX=Infinity,minY=Infinity,minZ=Infinity,maxX=-Infinity,maxY=-Infinity,maxZ=-Infinity;
      for (let i=0;i<count;i++){ const x=inst[i*3],y=inst[i*3+1],z=inst[i*3+2]; if (x<minX)minX=x; if(y<minY)minY=y; if(z<minZ)minZ=z; if(x>maxX)maxX=x; if(y>maxY)maxY=y; if(z>maxZ)maxZ=z; }
      const rangeX=Math.max(1e-6,maxX-minX), rangeY=Math.max(1e-6,maxY-minY), rangeZ=Math.max(1e-6,maxZ-minZ);
      for (let i=0;i<count;i++){ const x=(inst[i*3]-minX)/rangeX; const y=(inst[i*3+1]-minY)/rangeY; const z=(inst[i*3+2]-minZ)/rangeZ; u8[i*4+0]=Math.floor(x*255); u8[i*4+1]=Math.floor(y*255); u8[i*4+2]=Math.floor(z*255); u8[i*4+3]=255; }
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,texW,texH,0,gl.RGBA,gl.UNSIGNED_BYTE,u8);
      gl._poc_range = { minX, minY, minZ, rangeX, rangeY, rangeZ };
    }
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
    const tUpload1 = performance.now(); times.upload = tUpload1 - tUpload0;

    // prepare FBO
    const fbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);
    const outTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,outTex);
    if (useFloat) gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,texW,texH,0,gl.RGBA,gl.FLOAT,null); else gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,texW,texH,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,outTex,0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) return { success:false, reason:'FBO incomplete' };

    // compile shaders
    const tCompile0 = performance.now();
    function compile(type, src){ const s=gl.createShader(type); gl.shaderSource(s,src); gl.compileShader(s); if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
    const vs = `#version 300 es\nlayout(location=0) in vec2 a; void main(){ gl_Position=vec4(a,0,1);} `;
    const fsFloat = `#version 300 es\nprecision highp float; uniform sampler2D uPos; uniform mat4 uPV; uniform float uW; uniform float uH; out vec4 o; void main(){ ivec2 pix = ivec2(int(gl_FragCoord.x)-1,int(gl_FragCoord.y)-1); vec2 uv=(vec2(pix)+0.5)/vec2(uW,uH); vec4 p = texture(uPos,uv); vec4 clip = uPV * vec4(p.xyz,1.0); bool vis=false; if(clip.w!=0.0){ if(abs(clip.x)<=clip.w && abs(clip.y)<=clip.w && clip.z>=-clip.w && clip.z<=clip.w) vis=true; } o=vec4(vis?1.0:0.0,0,0,1); }`;
    const fsByte = `#version 300 es\nprecision highp float; uniform sampler2D uPos; uniform mat4 uPV; uniform float uW; uniform float uH; uniform vec3 uMin; uniform vec3 uRange; out vec4 o; void main(){ ivec2 pix = ivec2(int(gl_FragCoord.x)-1,int(gl_FragCoord.y)-1); vec2 uv=(vec2(pix)+0.5)/vec2(uW,uH); vec4 enc=texture(uPos,uv); vec3 p = enc.rgb * uRange + uMin; vec4 clip = uPV * vec4(p,1.0); bool vis=false; if(clip.w!=0.0){ if(abs(clip.x)<=clip.w && abs(clip.y)<=clip.w && clip.z>=-clip.w && clip.z<=clip.w) vis=true; } o=vec4(vis?1.0:0.0,0,0,1); }`;
    let prog = gl.createProgram(); try{ const s1=compile(gl.VERTEX_SHADER,vs); const s2=compile(gl.FRAGMENT_SHADER, useFloat?fsFloat:fsByte); gl.attachShader(prog,s1); gl.attachShader(prog,s2); gl.linkProgram(prog); if(!gl.getProgramParameter(prog,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog)); } catch(e){ return { success:false, reason: 'shader error '+e.message } }
    const tCompile1 = performance.now(); times.compile = tCompile1 - tCompile0;

    const vao = gl.createVertexArray(); gl.bindVertexArray(vao); const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,vb); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);

    gl.viewport(0,0,texW,texH); gl.useProgram(prog); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,posTex); gl.uniform1i(gl.getUniformLocation(prog,'uPos'),0);
    const pv = mat4_mul(mat4_perspective(60, canvas.width / canvas.height, 0.1, 2000), mat4_lookAtInverse([0,50,-200],[0,0,400]));
    gl.uniformMatrix4fv(gl.getUniformLocation(prog,'uPV'), false, pv);
    gl.uniform1f(gl.getUniformLocation(prog,'uW'), texW); gl.uniform1f(gl.getUniformLocation(prog,'uH'), texH);
    if(!useFloat){ const r=gl._poc_range; gl.uniform3f(gl.getUniformLocation(prog,'uMin'), r.minX, r.minY, r.minZ); gl.uniform3f(gl.getUniformLocation(prog,'uRange'), r.rangeX, r.rangeY, r.rangeZ); }

    const tDraw0 = performance.now(); gl.bindFramebuffer(gl.FRAMEBUFFER,fbo); gl.drawBuffers([gl.COLOR_ATTACHMENT0]); gl.clearColor(0,0,0,1); gl.clear(gl.COLOR_BUFFER_BIT); gl.bindVertexArray(vao); gl.drawArrays(gl.TRIANGLE_STRIP,0,4); const tDraw1 = performance.now(); times.draw = tDraw1 - tDraw0;

    // read back
    const tRead0 = performance.now();
    let buf; if(useFloat){ buf = new Float32Array(texW*texH*4); gl.readPixels(0,0,texW,texH,gl.RGBA,gl.FLOAT,buf); } else { buf = new Uint8Array(texW*texH*4); gl.readPixels(0,0,texW,texH,gl.RGBA,gl.UNSIGNED_BYTE,buf); }
    const tRead1 = performance.now(); times.readback = tRead1 - tRead0;

    const tTotal1 = performance.now(); times.total = tTotal1 - tTotal0;

    let vis=0; for(let i=0;i<count;i++){ if(useFloat){ if(buf[i*4]>0.5) vis++; } else { if(buf[i*4]>0) vis++; } }

    return { success:true, visible:vis, useFloat, count, times };
  }

  // prewarm: run a small dummy pass to trigger shader compilation and program warmup
  async function prewarmGpu() {
    const small = generateInstances(4);
    // run once without measuring
    try {
      await runGpuPoCDetailed(small);
      return { success: true };
    } catch (e) {
      return { success: false, reason: e.message };
    }
  }

  // expose for automation
  window.runGpuPoCCount = async function(count) {
    const inst = generateInstances(count);
    return await runGpuPoCDetailed(inst);
  };
  window.runCpuBaselineCount = async function(count) {
    const inst = generateInstances(count);
    const r = cpuBaseline(inst);
    return { success:true, visible:r.vis, time:r.time, count };
  };
  window.runGpuPoCPrewarm = async function() { return await prewarmGpu(); };

  runCpu.addEventListener('click',async ()=>{
    const c = parseInt(countSelect.value,10);
    cpuResult.textContent = 'CPU: running...';
    setTimeout(async ()=>{ const r=cpuBaseline(generateInstances(c)); cpuResult.textContent = `CPU: ${r.vis} visible, ${r.time.toFixed(2)} ms`; info.textContent='Info: CPU baseline done'; }, 10);
  });

  runGpu.addEventListener('click',async ()=>{
    const c = parseInt(countSelect.value,10);
    gpuResult.textContent = 'GPU: running...';
    setTimeout(async ()=>{ const r = await window.runGpuPoCCount(c); if (!r.success) gpuResult.textContent = 'GPU: failed: '+r.reason; else gpuResult.textContent = `GPU: ${r.visible} visible, ${r.times.total.toFixed(2)} ms`; info.textContent='Info: GPU PoC done'; }, 10);
  });

  function mat4_perspective(fov, aspect, n, f){ const t = Math.tan(fov*Math.PI/180/2); const h = n*t; const w = h*aspect; const out = new Float32Array(16); const a = 1/(Math.tan(fov*Math.PI/180/2)); out[0]=a/aspect; out[5]=a; out[10]=-(f+n)/(f-n); out[11]=-1; out[14]=-(2*f*n)/(f-n); out[15]=0; return out; }
  function mat4_lookAtInverse(eye,target){ // returns viewMatrixInverse (camera world matrix inverse = camera.worldMatrixInverse)
    // simple: build camera matrix from eye looking at target
    const z = normalize3([target[0]-eye[0], target[1]-eye[1], target[2]-eye[2]]);
    const up = [0,1,0];
    const x = normalize3(cross(up,z));
    const y = cross(z,x);
    const out = new Float32Array(16);
    out[0]=x[0]; out[4]=x[1]; out[8]=x[2]; out[12]=eye[0];
    out[1]=y[0]; out[5]=y[1]; out[9]=y[2]; out[13]=eye[1];
    out[2]=z[0]; out[6]=z[1]; out[10]=z[2]; out[14]=eye[2];
    out[3]=0; out[7]=0; out[11]=0; out[15]=1; return out; }
  function mat4_mul(a,b){ const out = new Float32Array(16); for(let i=0;i<4;i++){ for(let j=0;j<4;j++){ let s=0; for(let k=0;k<4;k++){ s+=a[i*4+k]*b[k*4+j]; } out[i*4+j]=s; } } return out; }
  function normalize3(v){ const l=Math.hypot(v[0],v[1],v[2]); return [v[0]/l, v[1]/l, v[2]/l]; }
  function cross(a,b){ return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]; }
  function buildFrustum(proj, viewInv){ // returns planes as [A,B,C,D]*6; using combined proj*viewInv
    const m = mat4_mul(proj, viewInv);
    // extract planes
    const planes = [];
    const me = m;
    planes.push([me[3]-me[0], me[7]-me[4], me[11]-me[8], me[15]-me[12]]); // left
    planes.push([me[3]+me[0], me[7]+me[4], me[11]+me[8], me[15]+me[12]]); // right
    planes.push([me[3]+me[1], me[7]+me[5], me[11]+me[9], me[15]+me[13]]); // bottom
    planes.push([me[3]-me[1], me[7]-me[5], me[11]-me[9], me[15]-me[13]]); // top
    planes.push([me[3]-me[2], me[7]-me[6], me[11]-me[10], me[15]-me[14]]); // near
    planes.push([me[3]+me[2], me[7]+me[6], me[11]+me[10], me[15]+me[14]]); // far
    // normalize
    for(let i=0;i<6;i++){ const p=planes[i]; const l=Math.hypot(p[0],p[1],p[2]); planes[i]=[p[0]/l,p[1]/l,p[2]/l,p[3]/l]; }
    return planes;
  }
  function pointInFrustum(x,y,z,planes){ for(let i=0;i<6;i++){ const p=planes[i]; if (p[0]*x+p[1]*y+p[2]*z+p[3] < 0) return false; } return true; }

  info.textContent='Info: ready';
})();
