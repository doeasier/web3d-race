self.onmessage = async function(e) {
	try {
		const { instances, pv, count } = e.data;
		const texW = Math.ceil(Math.sqrt(count));
		const texH = texW;
		// Attempt to create offscreen canvas
		let off;
		try { off = new OffscreenCanvas(texW, texH); } catch (err) { postMessage({ error: 'no-offscreen-canvas' }); return; }
		const gl = off.getContext('webgl2');
		if (!gl) { postMessage({ error: 'no-webgl2' }); return; }

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
		}
		gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
		// create fbo
		const fbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);
		const outTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,outTex);
		if (useFloat) gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,texW,texH,0,gl.RGBA,gl.FLOAT,null); else gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,texW,texH,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
		gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, outTex,0);
		if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) { postMessage({ error: 'fbo' }); return; }
		function compile(type, src){ const s=gl.createShader(type); gl.shaderSource(s,src); gl.compileShader(s); if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
		const vs = '#version300 es\nlayout(location=0) in vec2 a; void main(){gl_Position=vec4(a,0,1);}';
		const fsFloat = '#version300 es\nprecision highp float; uniform sampler2D uPos; uniform mat4 uPV; uniform float uW; uniform float uH; out vec4 o; void main(){ ivec2 pix=ivec2(int(gl_FragCoord.x)-1,int(gl_FragCoord.y)-1); vec2 uv=(vec2(pix)+0.5)/vec2(uW,uH); vec4 p=texture(uPos,uv); vec4 clip=uPV*vec4(p.xyz,1.0); bool vis=false; if(clip.w!=0.0){ if(abs(clip.x)<=clip.w && abs(clip.y)<=clip.w && clip.z>=-clip.w && clip.z<=clip.w) vis=true; } o=vec4(vis?1.0:0.0,0,0,1); }';
		const fsByte = '#version300 es\nprecision highp float; uniform sampler2D uPos; uniform mat4 uPV; uniform float uW; uniform float uH; out vec4 o; void main(){ ivec2 pix=ivec2(int(gl_FragCoord.x)-1,int(gl_FragCoord.y)-1); vec2 uv=(vec2(pix)+0.5)/vec2(uW,uH); vec4 e=texture(uPos,uv); vec3 p=e.rgb; vec4 clip=uPV*vec4(p,1.0); bool vis=false; if(clip.w!=0.0){ if(abs(clip.x)<=clip.w && abs(clip.y)<=clip.w && clip.z>=-clip.w && clip.z<=clip.w) vis=true; } o=vec4(vis?1.0:0.0,0,0,1); }';
		let prog = gl.createProgram(); try{ const s1=compile(gl.VERTEX_SHADER,vs); const s2=compile(gl.FRAGMENT_SHADER,useFloat?fsFloat:fsByte); gl.attachShader(prog,s1); gl.attachShader(prog,s2); gl.linkProgram(prog); if(!gl.getProgramParameter(prog,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog)); } catch(err){ postMessage({ error: err.message }); return; }
		const vao = gl.createVertexArray(); gl.bindVertexArray(vao); const vb=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,vb); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
		gl.useProgram(prog); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,posTex); gl.uniform1i(gl.getUniformLocation(prog,'uPos'),0);
		gl.uniformMatrix4fv(gl.getUniformLocation(prog,'uPV'), false, new Float32Array(pv)); gl.uniform1f(gl.getUniformLocation(prog,'uW'), texW); gl.uniform1f(gl.getUniformLocation(prog,'uH'), texH);
		gl.bindFramebuffer(gl.FRAMEBUFFER,fbo); gl.drawBuffers([gl.COLOR_ATTACHMENT0]); gl.clearColor(0,0,0,1); gl.clear(gl.COLOR_BUFFER_BIT); gl.bindVertexArray(vao); gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
		let buf; if(useFloat){ try { buf = new Float32Array(texW*texH*4); gl.readPixels(0,0,texW,texH,gl.RGBA,gl.FLOAT,buf); } catch(e) { postMessage({ error: 'readPixels-float-failed' }); return; } } else { buf=new Uint8Array(texW*texH*4); gl.readPixels(0,0,texW,texH,gl.RGBA,gl.UNSIGNED_BYTE,buf); }
		const vis = [];
		for(let i=0;i<count;i++){ if(useFloat){ if(buf[i*4]>0.5) vis.push(i); } else { if(buf[i*4]>0) vis.push(i); } }
		postMessage({ visible: vis });
	} catch (e) {
		postMessage({ error: e && e.message ? e.message : String(e) });
	}
};
