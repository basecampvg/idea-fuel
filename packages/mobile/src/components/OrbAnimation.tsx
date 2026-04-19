import React, { useRef, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

export type OrbState = null | 'listening' | 'talking';

interface OrbAnimationProps {
  state: OrbState;
}

/**
 * React Bits orb animation rendered inside a WebView.
 * Uses OGL-style WebGL shader with simplex noise for organic motion.
 * Alpha is computed naturally by the shader (extractAlpha) — no mask needed.
 */
export function OrbAnimation({ state }: OrbAnimationProps) {
  const webViewRef = useRef<WebView>(null);
  const prevState = useRef<OrbState>(undefined as any);

  useEffect(() => {
    if (prevState.current !== state) {
      prevState.current = state;
      const val = state === null ? 'null' : `"${state}"`;
      webViewRef.current?.injectJavaScript(
        `window.setOrbState && window.setOrbState(${val}); true;`
      );
    }
  }, [state]);

  return (
    <View style={styles.container} pointerEvents="none">
      <WebView
        ref={webViewRef}
        source={{ html: ORB_HTML }}
        style={styles.webview}
        scrollEnabled={false}
        overScrollMode="never"
        bounces={false}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        originWhitelist={['*']}
      />
    </View>
  );
}

const ORB_VIEWPORT = 400;

const styles = StyleSheet.create({
  container: {
    width: ORB_VIEWPORT,
    height: ORB_VIEWPORT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webview: {
    width: ORB_VIEWPORT,
    height: ORB_VIEWPORT,
    backgroundColor: 'transparent',
  },
});

const ORB_HTML = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
* { margin: 0; padding: 0; }
html, body { width: 100%; height: 100%; overflow: hidden; background: transparent; }
canvas { display: block; width: 100%; height: 100%; }
</style>
</head>
<body>
<canvas id="c"></canvas>
<script>
// React Bits orb — pure WebGL port of reactbits.dev/backgrounds/orb
// Original by David Haz, adapted for RN WebView with agent state control

const canvas = document.getElementById('c');
const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: true });

let agentState = 'listening';
let hoverTarget = 0;
let hoverCurrent = 0;

window.setOrbState = function(state) {
  agentState = state;
};

function resize() {
  const dpr = window.devicePixelRatio || 2;
  canvas.width = canvas.clientWidth * dpr;
  canvas.height = canvas.clientHeight * dpr;
  gl.viewport(0, 0, canvas.width, canvas.height);
}
resize();
window.addEventListener('resize', resize);

const vertSrc = \`
precision highp float;
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
\`;

const fragSrc = \`
precision highp float;

uniform float iTime;
uniform vec3 iResolution;
uniform float hue;
uniform float hover;
uniform float hoverIntensity;
uniform float uOpacity;
uniform float uTimeScale;
uniform vec3 bgColor;
varying vec2 vUv;

vec3 rgb2yiq(vec3 c) {
  float y = dot(c, vec3(0.299, 0.587, 0.114));
  float i = dot(c, vec3(0.596, -0.274, -0.322));
  float q = dot(c, vec3(0.211, -0.523, 0.312));
  return vec3(y, i, q);
}

vec3 yiq2rgb(vec3 c) {
  float r = c.x + 0.956 * c.y + 0.621 * c.z;
  float g = c.x - 0.272 * c.y - 0.647 * c.z;
  float b = c.x - 1.106 * c.y + 1.703 * c.z;
  return vec3(r, g, b);
}

vec3 adjustHue(vec3 color, float hueDeg) {
  float hueRad = hueDeg * 3.14159265 / 180.0;
  vec3 yiq = rgb2yiq(color);
  float cosA = cos(hueRad);
  float sinA = sin(hueRad);
  float i = yiq.y * cosA - yiq.z * sinA;
  float q = yiq.y * sinA + yiq.z * cosA;
  yiq.y = i;
  yiq.z = q;
  return yiq2rgb(yiq);
}

vec3 hash33(vec3 p3) {
  p3 = fract(p3 * vec3(0.1031, 0.11369, 0.13787));
  p3 += dot(p3, p3.yxz + 19.19);
  return -1.0 + 2.0 * fract(vec3(
    p3.x + p3.y,
    p3.x + p3.z,
    p3.y + p3.z
  ) * p3.zyx);
}

float snoise3(vec3 p) {
  const float K1 = 0.333333333;
  const float K2 = 0.166666667;
  vec3 i = floor(p + (p.x + p.y + p.z) * K1);
  vec3 d0 = p - (i - (i.x + i.y + i.z) * K2);
  vec3 e = step(vec3(0.0), d0 - d0.yzx);
  vec3 i1 = e * (1.0 - e.zxy);
  vec3 i2 = 1.0 - e.zxy * (1.0 - e);
  vec3 d1 = d0 - (i1 - K2);
  vec3 d2 = d0 - (i2 - K1);
  vec3 d3 = d0 - 0.5;
  vec4 h = max(0.6 - vec4(
    dot(d0, d0),
    dot(d1, d1),
    dot(d2, d2),
    dot(d3, d3)
  ), 0.0);
  vec4 n = h * h * h * h * vec4(
    dot(d0, hash33(i)),
    dot(d1, hash33(i + i1)),
    dot(d2, hash33(i + i2)),
    dot(d3, hash33(i + 1.0))
  );
  return dot(vec4(31.316), n);
}

vec4 extractAlpha(vec3 colorIn) {
  float a = max(max(colorIn.r, colorIn.g), colorIn.b);
  return vec4(colorIn.rgb / (a + 1e-5), a);
}

// IdeaFuel brand color variations of #E32B1A
const vec3 baseColor1 = vec3(0.890, 0.169, 0.102);  // #E32B1A brand primary
const vec3 baseColor2 = vec3(0.859, 0.302, 0.251);  // #DB4D40 brand end
const vec3 baseColor3 = vec3(0.400, 0.080, 0.040);  // deep ember
const float innerRadius = 0.6;
const float noiseScale = 0.65;

float light1(float intensity, float attenuation, float dist) {
  return intensity / (1.0 + dist * attenuation);
}
float light2(float intensity, float attenuation, float dist) {
  return intensity / (1.0 + dist * dist * attenuation);
}

vec4 draw(vec2 uv) {
  vec3 color1 = adjustHue(baseColor1, hue);
  vec3 color2 = adjustHue(baseColor2, hue);
  vec3 color3 = adjustHue(baseColor3, hue);

  float ang = atan(uv.y, uv.x);
  float len = length(uv);
  float invLen = len > 0.0 ? 1.0 / len : 0.0;

  float bgLuminance = dot(bgColor, vec3(0.299, 0.587, 0.114));

  float n0 = snoise3(vec3(uv * noiseScale, iTime * 0.5)) * 0.5 + 0.5;
  float r0 = mix(mix(innerRadius, 1.0, 0.4), mix(innerRadius, 1.0, 0.6), n0);
  float d0 = distance(uv, (r0 * invLen) * uv);
  float v0 = light1(1.0, 10.0, d0);

  v0 *= smoothstep(r0 * 1.05, r0, len);
  float innerFade = smoothstep(r0 * 0.8, r0 * 0.95, len);
  v0 *= mix(innerFade, 1.0, bgLuminance * 0.7);
  float cl = cos(ang + iTime * 2.0) * 0.5 + 0.5;

  float a = iTime * -1.0;
  vec2 pos = vec2(cos(a), sin(a)) * r0;
  float d = distance(uv, pos);
  float v1 = light2(1.5, 5.0, d);
  v1 *= light1(1.0, 50.0, d0);

  float v2 = smoothstep(1.0, mix(innerRadius, 1.0, n0 * 0.5), len);
  float v3 = smoothstep(innerRadius, mix(innerRadius, 1.0, 0.5), len);

  vec3 colBase = mix(color1, color2, cl);
  float fadeAmount = mix(1.0, 0.1, bgLuminance);

  vec3 darkCol = mix(color3, colBase, v0);
  darkCol = (darkCol + v1) * v2 * v3;
  darkCol = clamp(darkCol, 0.0, 1.0);

  vec3 lightCol = (colBase + v1) * mix(1.0, v2 * v3, fadeAmount);
  lightCol = mix(bgColor, lightCol, v0);
  lightCol = clamp(lightCol, 0.0, 1.0);

  vec3 finalCol = mix(darkCol, lightCol, bgLuminance);

  return extractAlpha(finalCol);
}

void main() {
  vec2 fragCoord = vUv * iResolution.xy;
  vec2 center = iResolution.xy * 0.5;
  float size = min(iResolution.x, iResolution.y);
  vec2 uv = (fragCoord - center) / size * 2.0;

  // Hover distortion
  uv.x += hover * hoverIntensity * 0.1 * sin(uv.y * 10.0 + iTime);
  uv.y += hover * hoverIntensity * 0.1 * sin(uv.x * 10.0 + iTime);

  vec4 col = draw(uv);
  col.a *= uOpacity;
  gl_FragColor = vec4(col.rgb * col.a, col.a);
}
\`;

function compileShader(type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error('Shader error:', gl.getShaderInfoLog(s));
  }
  return s;
}

const prog = gl.createProgram();
gl.attachShader(prog, compileShader(gl.VERTEX_SHADER, vertSrc));
gl.attachShader(prog, compileShader(gl.FRAGMENT_SHADER, fragSrc));
gl.linkProgram(prog);
gl.useProgram(prog);

// Fullscreen quad
const buf = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buf);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
const aPos = gl.getAttribLocation(prog, 'position');
gl.enableVertexAttribArray(aPos);
gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

// Uniforms
const uTime = gl.getUniformLocation(prog, 'iTime');
const uRes = gl.getUniformLocation(prog, 'iResolution');
const uHue = gl.getUniformLocation(prog, 'hue');
const uHover = gl.getUniformLocation(prog, 'hover');
const uHoverIntensity = gl.getUniformLocation(prog, 'hoverIntensity');
const uOpacity = gl.getUniformLocation(prog, 'uOpacity');
const uTimeScale = gl.getUniformLocation(prog, 'uTimeScale');
const uBgColor = gl.getUniformLocation(prog, 'bgColor');

// No hue shift — brand colors are baked into the shader
gl.uniform1f(uHue, 0.0);
gl.uniform3f(uBgColor, 0.102, 0.102, 0.102); // #1A1A1A

gl.enable(gl.BLEND);
gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

let lastTime = 0;
let opacity = 0;
let scaledTime = 0;
let currentTimeScale = 1.0;
let currentHoverIntensity = 0;

function frame(t) {
  requestAnimationFrame(frame);
  const dt = (t - lastTime) * 0.001;
  lastTime = t;

  // ── State-based animation controls ──
  // hover:          UV distortion amount (waviness of the orb surface)
  // hoverIntensity: strength of that distortion
  // timeScale:      how fast the orb animates (rotation, noise evolution)
  // opacity:        overall visibility

  let targetHover = 0;
  let targetHoverIntensity = 0;
  let targetTimeScale = 0.6;   // idle: slow drift
  let targetOpacity = 1.0;

  if (agentState === 'listening') {
    targetHover = 0.5;
    targetHoverIntensity = 0.2;
    targetTimeScale = 1.0;     // normal speed
  } else if (agentState === 'talking') {
    targetHover = 1.0;
    targetHoverIntensity = 0.6;
    targetTimeScale = 1.8;     // fast, energetic
  }

  // Smooth lerp all values
  hoverCurrent += (targetHover - hoverCurrent) * 0.08;
  currentHoverIntensity += (targetHoverIntensity - currentHoverIntensity) * 0.08;
  currentTimeScale += (targetTimeScale - currentTimeScale) * 0.06;

  // Fade in from 0 → 1 over ~1s
  opacity += (targetOpacity - opacity) * 0.04;

  // Accumulate scaled time so speed changes are smooth
  scaledTime += dt * currentTimeScale;

  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.uniform1f(uTime, scaledTime);
  gl.uniform3f(uRes, canvas.width, canvas.height, canvas.width / canvas.height);
  gl.uniform1f(uHover, hoverCurrent);
  gl.uniform1f(uHoverIntensity, currentHoverIntensity);
  gl.uniform1f(uOpacity, opacity);

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}
requestAnimationFrame(frame);
</script>
</body>
</html>`;
