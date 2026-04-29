import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAnimatedSensor, SensorType } from 'react-native-reanimated';
import { WebView } from 'react-native-webview';

/**
 * Full-screen neural network particle background.
 * Three.js WebGL scene rendered in a WebView.
 * Device tilt via reanimated useAnimatedSensor → WebView bridge.
 */
export function NeuralBackground() {
  const webRef = useRef<WebView>(null);
  const sensor = useAnimatedSensor(SensorType.ROTATION, { interval: 32 });

  useEffect(() => {
    const id = setInterval(() => {
      const { pitch, roll } = sensor.sensor.value;
      // Convert radians → degrees-like values matching the WebView's expected range
      const gamma = roll * (180 / Math.PI);
      const beta = pitch * (180 / Math.PI);
      webRef.current?.injectJavaScript(
        `window._setTilt&&window._setTilt(${gamma},${beta});true;`
      );
    }, 32);
    return () => clearInterval(id);
  }, [sensor]);

  return (
    <View style={styles.container} pointerEvents="none">
      <WebView
        ref={webRef}
        source={{ html: NEURAL_HTML }}
        style={styles.webview}
        scrollEnabled={false}
        overScrollMode="never"
        bounces={false}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        originWhitelist={['*']}
        allowsProtectedMedia={false}
        androidLayerType="hardware"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  webview: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
});

const NEURAL_HTML = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
* { margin: 0; padding: 0; }
html, body { width: 100vw; height: 100vh; overflow: hidden; background: #1A1A1A; }
canvas { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; }
</style>
</head>
<body>
<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/"
  }
}
</script>
<script type="module">
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// Simplex 3D
const F3=1/3,G3=1/6;
const g3=[[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]];
const pm=new Uint8Array(512);
const pp=[151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180];
for(let i=0;i<256;i++){pm[i]=pm[i+256]=pp[i];}
function snoise(x,y,z){const s=(x+y+z)*F3;let i=Math.floor(x+s),j=Math.floor(y+s),k=Math.floor(z+s);const t=(i+j+k)*G3,x0=x-(i-t),y0=y-(j-t),z0=z-(k-t);let i1,j1,k1,i2,j2,k2;if(x0>=y0){if(y0>=z0){i1=1;j1=0;k1=0;i2=1;j2=1;k2=0;}else if(x0>=z0){i1=1;j1=0;k1=0;i2=1;j2=0;k2=1;}else{i1=0;j1=0;k1=1;i2=1;j2=0;k2=1;}}else{if(y0<z0){i1=0;j1=0;k1=1;i2=0;j2=1;k2=1;}else if(x0<z0){i1=0;j1=1;k1=0;i2=0;j2=1;k2=1;}else{i1=0;j1=1;k1=0;i2=1;j2=1;k2=0;}}const x1=x0-i1+G3,y1=y0-j1+G3,z1=z0-k1+G3,x2=x0-i2+2*G3,y2=y0-j2+2*G3,z2=z0-k2+2*G3,x3=x0-1+3*G3,y3=y0-1+3*G3,z3=z0-1+3*G3;i&=255;j&=255;k&=255;const gi0=pm[i+pm[j+pm[k]]]%12,gi1=pm[i+i1+pm[j+j1+pm[k+k1]]]%12,gi2=pm[i+i2+pm[j+j2+pm[k+k2]]]%12,gi3=pm[i+1+pm[j+1+pm[k+1]]]%12;let n0=0,n1=0,n2=0,n3=0,t0=0.6-x0*x0-y0*y0-z0*z0,t1=0.6-x1*x1-y1*y1-z1*z1,t2=0.6-x2*x2-y2*y2-z2*z2,t3=0.6-x3*x3-y3*y3-z3*z3;if(t0>0){t0*=t0;n0=t0*t0*(g3[gi0][0]*x0+g3[gi0][1]*y0+g3[gi0][2]*z0);}if(t1>0){t1*=t1;n1=t1*t1*(g3[gi1][0]*x1+g3[gi1][1]*y1+g3[gi1][2]*z1);}if(t2>0){t2*=t2;n2=t2*t2*(g3[gi2][0]*x2+g3[gi2][1]*y2+g3[gi2][2]*z2);}if(t3>0){t3*=t3;n3=t3*t3*(g3[gi3][0]*x3+g3[gi3][1]*y3+g3[gi3][2]*z3);}return 32*(n0+n1+n2+n3);}

const CFG = {
  nodeCount: 2000,
  field: { x: 50, y: 35, z: 60 },
  connectionsPerNode: 3,
  maxEdgeDist: 10,
  bloomStrength: 1.6,
  bloomRadius: 0.7,
  bloomThreshold: 0.2,
  pulseSpeed: 0.3,
  pulseAmount: 0.4,
  driftSpeed: 0.04,
  driftAmount: 0.25,
  parallaxStrength: 2.5,
};

const BRAND = { r: 0.89, g: 0.17, b: 0.10 };
const clock = new THREE.Clock();
let nodes = [], edges = [];

// Parallax
let tiltX = 0, tiltY = 0;
let tiltTX = 0, tiltTY = 0;

// Tilt values pushed from React Native (reanimated useAnimatedSensor)
window._setTilt = function(gamma, beta) {
  tiltTX = Math.max(-1, Math.min(1, gamma / 30)) * CFG.parallaxStrength;
  tiltTY = Math.max(-1, Math.min(1, (beta - 50) / 30)) * CFG.parallaxStrength;
};

// Sizing helper — WebView can report 0 initially
function getSize() {
  const w = Math.max(document.documentElement.clientWidth, window.innerWidth || 0, 1);
  const h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0, 1);
  return { w, h };
}

const { w: W, h: H } = getSize();

const scene = new THREE.Scene();
scene.background = new THREE.Color('#1A1A1A');

const camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 300);
camera.position.set(0, 0, 40);

const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(W, H);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 2, 2));
renderer.toneMapping = THREE.NoToneMapping;
document.body.appendChild(renderer.domElement);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(
  new THREE.Vector2(W, H),
  CFG.bloomStrength, CFG.bloomRadius, CFG.bloomThreshold
));

function resize() {
  const { w, h } = getSize();
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
}
window.addEventListener('resize', resize);
// Re-check size after WebView fully lays out
setTimeout(resize, 100);
setTimeout(resize, 500);

// Nodes
function createNodes(count) {
  nodes = [];
  const pos = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const x = (Math.random()-0.5) * CFG.field.x * 2;
    const y = (Math.random()-0.5) * CFG.field.y * 2;
    const z = (Math.random()-0.5) * CFG.field.z * 2;
    pos[i*3]=x; pos[i*3+1]=y; pos[i*3+2]=z;
    const depth = (z + CFG.field.z) / (CFG.field.z * 2);
    const d2 = depth * depth;
    const brightness = 0.15 + d2 * 0.7;
    colors[i*3]   = BRAND.r * brightness;
    colors[i*3+1] = BRAND.g * brightness * 0.7;
    colors[i*3+2] = BRAND.b * brightness * 0.6;
    sizes[i] = (0.8 + d2 * 2.0) * (0.7 + Math.random() * 0.6);
    const phase = Math.random() * 1000;
    phases[i] = phase;
    nodes.push({
      index: i, position: new THREE.Vector3(x,y,z),
      basePosition: new THREE.Vector3(x,y,z), depth: d2, phase,
    });
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 2, 2) },
      uTime: { value: 0 },
      uPulseSpeed: { value: CFG.pulseSpeed },
      uPulseAmount: { value: CFG.pulseAmount },
    },
    vertexShader: \`
      attribute float size;
      attribute vec3 color;
      attribute float aPhase;
      uniform float uPixelRatio;
      uniform float uTime;
      uniform float uPulseSpeed;
      uniform float uPulseAmount;
      varying vec3 vColor;
      varying float vPulse;
      void main() {
        float pulse = sin(uTime * uPulseSpeed + aPhase) * 0.5 + 0.5;
        vPulse = pulse;
        vColor = color;
        float sizeScale = 1.0 + pulse * uPulseAmount * 0.5;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = max(size * sizeScale * uPixelRatio * (60.0 / -mv.z), 0.5);
        gl_Position = projectionMatrix * mv;
      }
    \`,
    fragmentShader: \`
      varying vec3 vColor;
      varying float vPulse;
      uniform float uPulseAmount;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        float a = 1.0 - smoothstep(0.0, 0.5, d);
        a = a * a;
        float brightBoost = 1.0 + vPulse * uPulseAmount;
        gl_FragColor = vec4(vColor * brightBoost, a * 0.85);
      }
    \`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });

  return { mesh: new THREE.Points(geo, mat), geo, mat };
}

let nodeSystem = createNodes(CFG.nodeCount);
scene.add(nodeSystem.mesh);

// Edges
function createEdges() {
  edges = [];
  const edgeSet = new Set();
  for (const node of nodes) {
    const dists = nodes
      .filter(n => n.index !== node.index)
      .map(n => ({ node: n, dist: node.position.distanceTo(n.position) }))
      .filter(d => d.dist < CFG.maxEdgeDist)
      .sort((a,b) => a.dist-b.dist)
      .slice(0, CFG.connectionsPerNode);
    for (const { node: nb } of dists) {
      const key = Math.min(node.index, nb.index)+'-'+Math.max(node.index, nb.index);
      if (edgeSet.has(key)) continue;
      edgeSet.add(key);
      edges.push({ from: node, to: nb });
    }
  }
  const pos = new Float32Array(edges.length * 6);
  const colors = new Float32Array(edges.length * 6);
  for (let i = 0; i < edges.length; i++) {
    const e = edges[i];
    pos[i*6]=e.from.position.x; pos[i*6+1]=e.from.position.y; pos[i*6+2]=e.from.position.z;
    pos[i*6+3]=e.to.position.x; pos[i*6+4]=e.to.position.y; pos[i*6+5]=e.to.position.z;
    const avgD = (e.from.depth + e.to.depth) / 2;
    const c = avgD * 0.22;
    colors[i*6]=c*BRAND.r; colors[i*6+1]=c*BRAND.g*0.6; colors[i*6+2]=c*BRAND.b*0.5;
    colors[i*6+3]=c*BRAND.r; colors[i*6+4]=c*BRAND.g*0.6; colors[i*6+5]=c*BRAND.b*0.5;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const baseColors = new Float32Array(colors);
  const mat = new THREE.LineBasicMaterial({
    vertexColors: true, transparent: true, opacity: 0.65,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  return { mesh: new THREE.LineSegments(geo, mat), geo, baseColors };
}

let edgeSystem = createEdges();
scene.add(edgeSystem.mesh);

// Render loop
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.getElapsedTime();

  // Parallax from device tilt (lerped)
  tiltX += (tiltTX - tiltX) * 0.03;
  tiltY += (tiltTY - tiltY) * 0.03;
  camera.position.x = tiltX;
  camera.position.y = tiltY;
  camera.lookAt(0, 0, 0);

  // Node drift
  const nPos = nodeSystem.geo.getAttribute('position');
  const driftT = t * CFG.driftSpeed;
  for (const node of nodes) {
    const p = node.phase;
    node.position.x = node.basePosition.x + snoise(p*0.1, driftT, 0) * CFG.driftAmount;
    node.position.y = node.basePosition.y + snoise(0, p*0.1, driftT) * CFG.driftAmount;
    node.position.z = node.basePosition.z + snoise(driftT, 0, p*0.1) * CFG.driftAmount * 0.3;
    nPos.array[node.index*3]   = node.position.x;
    nPos.array[node.index*3+1] = node.position.y;
    nPos.array[node.index*3+2] = node.position.z;
  }
  nPos.needsUpdate = true;

  // Edge positions + noise flicker
  const ePos = edgeSystem.geo.getAttribute('position');
  const eCol = edgeSystem.geo.getAttribute('color');
  const bc = edgeSystem.baseColors;
  for (let i = 0; i < edges.length; i++) {
    const e = edges[i];
    ePos.array[i*6]=e.from.position.x; ePos.array[i*6+1]=e.from.position.y; ePos.array[i*6+2]=e.from.position.z;
    ePos.array[i*6+3]=e.to.position.x; ePos.array[i*6+4]=e.to.position.y; ePos.array[i*6+5]=e.to.position.z;
    const n = snoise(i * 0.3, t * 0.15, 0) * 0.5 + 0.5;
    const flicker = 0.7 + n * 0.6;
    eCol.array[i*6]=bc[i*6]*flicker; eCol.array[i*6+1]=bc[i*6+1]*flicker; eCol.array[i*6+2]=bc[i*6+2]*flicker;
    eCol.array[i*6+3]=bc[i*6+3]*flicker; eCol.array[i*6+4]=bc[i*6+4]*flicker; eCol.array[i*6+5]=bc[i*6+5]*flicker;
  }
  ePos.needsUpdate = true;
  eCol.needsUpdate = true;

  nodeSystem.mat.uniforms.uTime.value = t;
  composer.render();
}
animate();
</script>
</body>
</html>`;
