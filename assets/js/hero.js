/* Face Skin & Body Bar — cinematic WebGL hero (Three.js)
   Full-bleed photo slideshow with a soft "liquid serum" transition between
   slides, a slow Ken-Burns drift and a gentle ripple that follows the cursor.
   Markup:
   <div class="cine" data-cine data-interval="6500">
     <div class="cine__fallback"><img ...><img ...></div>   (shown until WebGL is ready / if it fails)
     <canvas class="cine__canvas"></canvas>
   </div> */
import * as THREE from 'three';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

const vert = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`;
const frag = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uA, uB; uniform vec2 uResA, uResB, uRes;
uniform float uProgress, uTime, uZoomA, uZoomB, uHover; uniform vec2 uMouse;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float v=0., a=.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.03; a*=.5; } return v; }
vec2 cover(vec2 uv, vec2 img, float zoom){
  float rs = uRes.x/uRes.y, ri = img.x/img.y;
  vec2 s = rs < ri ? vec2(rs/ri, 1.) : vec2(1., ri/rs);
  return (uv - .5) * s / zoom + .5;
}
void main(){
  vec2 uv = vUv;
  vec2 asp = vec2(uRes.x/uRes.y, 1.);
  // cursor ripple
  vec2 d = (uv - uMouse) * asp; float dist = length(d);
  float ring = sin(dist*38. - uTime*2.6) * exp(-dist*7.) * .0045 * uHover;
  float lens = smoothstep(.32, .0, dist) * .012 * uHover;
  uv += normalize(d + 1e-5) * (ring - lens) / asp;
  // liquid transition
  float n = fbm(uv*3.2 + uTime*.05);
  float p = smoothstep(0., 1., uProgress);
  float edge = smoothstep(p - .18, p + .18, n * .65 + uv.x * .35 + .0) ;
  float mask = 1. - smoothstep(p*1.36 - .18, p*1.36, n*.62 + (1.-uv.y)*.2 + uv.x*.18);
  vec2 warp = vec2(n - .5, fbm(uv*2.1 - uTime*.04) - .5) * .09;
  vec2 ua = cover(uv + warp * p, uResA, uZoomA);
  vec2 ub = cover(uv - warp * (1. - p), uResB, uZoomB);
  vec4 a = texture2D(uA, ua), b = texture2D(uB, ub);
  // creamy glow on the transition front
  float front = smoothstep(.0, .5, mask) * smoothstep(1., .5, mask);
  vec4 col = mix(a, b, mask);
  col.rgb += vec3(.98,.93,.86) * front * .22 * sin(p*3.1416);
  gl_FragColor = col;
}`;

function init(root) {
  const canvas = root.querySelector('canvas');
  const imgs = [...root.querySelectorAll('.cine__fallback img')];
  if (!canvas || !imgs.length) return;
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' }); }
  catch (e) { return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace; // pass photo colours straight through
  const scene = new THREE.Scene(), cam = new THREE.Camera();
  const U = {
    uA: { value: null }, uB: { value: null }, uResA: { value: new THREE.Vector2(1, 1) }, uResB: { value: new THREE.Vector2(1, 1) },
    uRes: { value: new THREE.Vector2(1, 1) }, uProgress: { value: 0 }, uTime: { value: 0 }, uZoomA: { value: 1 }, uZoomB: { value: 1 },
    uHover: { value: 0 }, uMouse: { value: new THREE.Vector2(.5, .5) },
  };
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms: U })));

  const loader = new THREE.TextureLoader();
  const textures = [];
  const load = i => textures[i] || (textures[i] = new Promise(res => loader.load(imgs[i].currentSrc || imgs[i].src, t => {
    t.colorSpace = THREE.NoColorSpace; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false;
    res({ t, w: t.image.width, h: t.image.height });
  })));

  const dots = [...root.querySelectorAll('[data-cine-go]')];
  const count = root.querySelector('[data-cine-count]');
  const interval = +(root.dataset.interval || 6500);
  let cur = 0, next = 0, start = performance.now(), transStart = 0, transitioning = false, slideStart = performance.now();

  function resize() {
    const r = root.getBoundingClientRect();
    renderer.setSize(r.width, r.height, false); U.uRes.value.set(r.width, r.height);
  }
  new ResizeObserver(resize).observe(root); resize();

  const target = new THREE.Vector2(.5, .5); let hoverT = 0;
  root.addEventListener('pointermove', e => { const r = root.getBoundingClientRect(); target.set((e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height); hoverT = 1; });
  root.addEventListener('pointerleave', () => { hoverT = 0; });

  const setActive = i => { dots.forEach((d, k) => d.classList.toggle('is-active', k === i)); if (count) count.textContent = String(i + 1).padStart(2, '0'); root.dispatchEvent(new CustomEvent('cine:slide', { detail: i })); };
  async function go(i) {
    if (transitioning || i === cur || imgs.length < 2) return;
    const b = await load(i);
    U.uB.value = b.t; U.uResB.value.set(b.w, b.h);
    next = i; transitioning = true; transStart = performance.now(); setActive(i);
  }
  dots.forEach((d, i) => d.addEventListener('click', () => { go(i); }));

  let visible = true, raf = 0;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !raf) loop(); }).observe(root);

  function loop() {
    raf = 0; if (!visible) return;
    const now = performance.now(), t = (now - start) / 1000;
    U.uTime.value = t;
    U.uMouse.value.lerp(target, .08);
    U.uHover.value += (hoverT - U.uHover.value) * .05;
    const slideT = (now - slideStart) / 1000;
    U.uZoomA.value = 1.04 + Math.min(slideT, 12) * .006; // slow Ken-Burns
    if (transitioning) {
      const p = Math.min((now - transStart) / 1800, 1);
      U.uProgress.value = p; U.uZoomB.value = 1.04;
      if (p >= 1) {
        U.uA.value = U.uB.value; U.uResA.value.copy(U.uResB.value); U.uProgress.value = 0;
        cur = next; transitioning = false; slideStart = now; U.uZoomA.value = 1.04;
      }
    } else if (!reduce && imgs.length > 1 && now - slideStart > interval) go((cur + 1) % imgs.length);
    renderer.render(scene, cam);
    if (!reduce) raf = requestAnimationFrame(loop);
  }

  load(0).then(a => {
    U.uA.value = a.t; U.uResA.value.set(a.w, a.h); U.uB.value = a.t; U.uResB.value.set(a.w, a.h);
    setActive(0); root.classList.add('is-gl'); slideStart = performance.now(); loop();
    imgs.forEach((_, i) => i && setTimeout(() => load(i), 800 * i)); // preload the rest
  });
}

document.querySelectorAll('[data-cine]').forEach(init);
