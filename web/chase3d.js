/* ════════════════════════════════════════════════════════════════════
   PLATES — NIGHT CHASE · procedural Three.js scene (no model files)
   A rainy night street: wet asphalt with shader reflections, sodium
   streetlights with light cones, lit facades, oncoming headlights with
   trails, rain streaks — and one graphite saloon the camera tracks
   until its rear plate (51G-888.99, a repository sample) fills the
   lens. The car stays at the origin; the world flows past it.
   Scroll drives the camera (setProgress); time drives the world.
   window.PlatesChase3D.{init,start,stop,setProgress,getPlateQuad,…}
   ════════════════════════════════════════════════════════════════════ */
(function (global) {
  "use strict";
  var THREE = global.THREE;
  if (!THREE) return;

  var S = 16;              /* streetlight spacing (m) */
  var NSEG = 8;            /* lights per repeating segment */
  var L = S * NSEG;        /* segment length */
  var SPEED = 13;          /* our car, m/s (~47 km/h) */
  var CAR_X = 1.75;        /* right-hand lane (Vietnam drives on the right) */
  var LAMP_X = 5.1;        /* lamp heads overhang the road */
  var FOG = new THREE.Color(0x080a0f);
  var FOG_D = 0.021;
  var PLATE_W = 0.52, PLATE_H = 0.11; /* VN long plate, 520 × 110 mm */
  var PLATE_TEXT = "51G-888.99";

  var st = {
    ready: false, running: false, raf: 0, last: 0,
    p: 0, ps: 0, t: 0, travel: 0,
    dpr: 1, dprMax: 1.5, dprMin: 0.7, frameAcc: 0, frameN: 0, slowStreak: 0,
    mobile: false, force: false, cssW: 1, cssH: 1,
    quad: null, onFrame: null, firstFrame: false
  };
  var renderer, scene, camera, canvas;
  var carBodyGeometry = null;
  var car, wheels = [], plateMesh, plateCanvas, segs = [], traffic = [];
  var groundMat, rainMat, lampLights = [], roadUniforms, coneMat, bldMat;
  var tmpV = new THREE.Vector3();

  function rand(seed) { /* deterministic so every visit sees the same street */
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6d2b79f5) >>> 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ───────────────── textures (canvas) ───────────────── */
  function glowTexture() {
    var c = document.createElement("canvas"); c.width = c.height = 128;
    var g = c.getContext("2d");
    var r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, "rgba(255,255,255,1)");
    r.addColorStop(0.12, "rgba(255,255,255,0.75)");
    r.addColorStop(0.35, "rgba(255,255,255,0.18)");
    r.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = r; g.fillRect(0, 0, 128, 128);
    var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  function streakTexture(vertical) { /* soft line: anamorphic flare or light trail */
    var c = document.createElement("canvas"); c.width = 256; c.height = 32;
    var g = c.getContext("2d");
    var h = g.createLinearGradient(0, 0, 256, 0);
    if (vertical) { h.addColorStop(0, "rgba(255,255,255,1)"); h.addColorStop(1, "rgba(255,255,255,0)"); }
    else { h.addColorStop(0, "rgba(255,255,255,0)"); h.addColorStop(0.5, "rgba(255,255,255,1)"); h.addColorStop(1, "rgba(255,255,255,0)"); }
    g.fillStyle = h; g.fillRect(0, 0, 256, 32);
    var v = g.createLinearGradient(0, 0, 0, 32);
    v.addColorStop(0, "rgba(0,0,0,1)"); v.addColorStop(0.5, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,1)");
    g.globalCompositeOperation = "destination-out"; g.fillStyle = v; g.fillRect(0, 0, 256, 32);
    var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  function shadowTexture() {
    var c = document.createElement("canvas"); c.width = 64; c.height = 128;
    var g = c.getContext("2d");
    var r = g.createRadialGradient(32, 64, 4, 32, 64, 62);
    r.addColorStop(0, "rgba(0,0,0,0.92)"); r.addColorStop(0.6, "rgba(0,0,0,0.6)"); r.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = r; g.fillRect(0, 0, 64, 128);
    return new THREE.CanvasTexture(c);
  }
  /* The plate: white Vietnamese long plate, black border and glyphs.
     Drawn once; the DOM crop in the hero reuses this exact canvas. */
  function drawPlate(c) {
    c.width = 1040; c.height = 220;
    var g = c.getContext("2d");
    var bg = g.createLinearGradient(0, 0, 0, 220);
    bg.addColorStop(0, "#f4f3ee"); bg.addColorStop(1, "#d9d7d0");
    g.fillStyle = "#1a1a1a"; g.fillRect(0, 0, 1040, 220);
    g.fillStyle = bg; roundRect(g, 6, 6, 1028, 208, 18); g.fill();
    g.strokeStyle = "#151515"; g.lineWidth = 9; roundRect(g, 18, 18, 1004, 184, 12); g.stroke();
    g.fillStyle = "#121212";
    g.textAlign = "center"; g.textBaseline = "middle";
    g.font = "700 172px 'Bricolage Grotesque', 'Arial Narrow', Arial, sans-serif";
    var w = g.measureText(PLATE_TEXT).width;
    var sx = Math.min(1, 900 / w);
    g.save(); g.translate(520, 118); g.scale(sx * 0.98, 1); g.fillText(PLATE_TEXT, 0, 0); g.restore();
    /* road grime + rain beads, very light */
    var R = rand(51);
    for (var i = 0; i < 90; i++) {
      g.fillStyle = "rgba(60,55,45," + (R() * 0.06).toFixed(3) + ")";
      g.beginPath(); g.arc(R() * 1040, 150 + R() * 70, 2 + R() * 14, 0, 6.283); g.fill();
    }
    for (var j = 0; j < 40; j++) {
      g.fillStyle = "rgba(255,255,255," + (0.15 + R() * 0.25).toFixed(3) + ")";
      g.beginPath(); g.arc(R() * 1040, R() * 220, 1 + R() * 3, 0, 6.283); g.fill();
    }
    return c;
  }
  function roundRect(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }

  var FOG_GLSL = "float fogF = 1.0 - exp(-uFogD * uFogD * vDepth * vDepth);";
  var NOISE_GLSL = [
    "float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }",
    "float vnoise(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); f = f*f*(3.0-2.0*f);",
    "  return mix(mix(hash(i), hash(i+vec2(1.0,0.0)), f.x), mix(hash(i+vec2(0.0,1.0)), hash(i+vec2(1.0,1.0)), f.x), f.y); }"
  ].join("\n");

  /* ───────────────── ground: wet asphalt, all reflections faked ───────── */
  function buildGround() {
    roadUniforms = {
      uTravel: { value: 0 }, uTime: { value: 0 },
      uFog: { value: FOG }, uFogD: { value: FOG_D },
      uCar: { value: new THREE.Vector3(CAR_X, 2.3, 0) },
      uTraffic: { value: [0, 1, 2, 3, 4, 5].map(function () { return new THREE.Vector4(0, 0, 0, 0); }) }
    };
    groundMat = new THREE.ShaderMaterial({
      uniforms: roadUniforms,
      vertexShader: [
        "varying vec3 vW; varying float vDepth;",
        "void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz;",
        "  vec4 mv = viewMatrix * w; vDepth = -mv.z; gl_Position = projectionMatrix * mv; }"
      ].join("\n"),
      fragmentShader: [
        "uniform float uTravel; uniform float uTime; uniform vec3 uFog; uniform float uFogD;",
        "uniform vec3 uCar; uniform vec4 uTraffic[6];",
        "varying vec3 vW; varying float vDepth;",
        NOISE_GLSL,
        "void main(){",
        "  float x = vW.x; float z = vW.z; float zt = z - uTravel; float ax = abs(x);",
        "  float n = vnoise(vec2(x * 2.1, zt * 2.1)) * 0.55 + vnoise(vec2(x * 11.0, zt * 11.0)) * 0.45;",
        "  float road = step(ax, 7.4);",
        "  vec3 col = mix(vec3(0.03, 0.031, 0.034), vec3(0.016, 0.018, 0.021), road) * (0.75 + 0.5 * n);",
        "  float pud = smoothstep(0.42, 0.72, vnoise(vec2(x * 0.33 + 3.0, zt * 0.2)));",
        "  float wet = mix(0.4, 1.0, pud) * mix(0.45, 1.0, road);",
        /* curb + lane markings (centre solid, lane dashed, edge solid) */
        "  float curb = smoothstep(0.12, 0.0, abs(ax - 7.45));",
        "  col += vec3(0.05) * curb;",
        "  float dash = step(0.55, fract(zt / 6.0));",
        "  float mark = max(max(smoothstep(0.075, 0.04, abs(ax - 6.75)), smoothstep(0.06, 0.03, abs(x))),",
        "                   smoothstep(0.07, 0.035, abs(ax - 3.45)) * dash);",
        "  col = mix(col, vec3(0.30, 0.29, 0.27) * (0.75 + 0.25 * n), mark * (1.0 - pud * 0.55));",
        /* streetlight reflections: long streaks toward the camera */
        "  float dz = mod(zt + 8.0, 16.0) - 8.0;",
        "  float along = dz > 0.0 ? exp(-dz / 6.5) : exp(dz / 1.1);",
        "  float rip = 0.8 + 0.4 * vnoise(vec2(x * 7.0, zt * 1.6 + uTime * 2.4));",
        "  float lr = exp(-pow(x - 5.1, 2.0) / 0.28) + exp(-pow(x + 5.1, 2.0) / 0.28);",
        "  float pool = exp(-(pow(ax - 4.8, 2.0) * 0.07 + dz * dz * 0.028));",
        "  vec3 sodium = vec3(1.0, 0.56, 0.2);",
        "  col += sodium * (lr * along * wet * 1.25 * rip + pool * 0.16 * (0.6 + 0.4 * wet));",
        /* our car: tail-light streaks behind, headlight pool ahead */
        "  float rz = z - uCar.y;",
        "  if (rz > 0.0) { float tl = exp(-pow(x - uCar.x - 0.66, 2.0) / 0.01) + exp(-pow(x - uCar.x + 0.66, 2.0) / 0.01);",
        "    col += vec3(1.0, 0.05, 0.035) * tl * exp(-rz / 3.2) * wet * 1.4 * rip;",
        "    col += vec3(0.5, 0.02, 0.01) * exp(-pow(x - uCar.x, 2.0) / 0.5) * exp(-rz / 1.6) * 0.35; }",
        "  float fz = (uCar.y - 4.7) - z;",
        "  if (fz > 0.0) { float spread = 0.9 + fz * 0.17;",
        "    col += vec3(0.95, 0.9, 0.8) * exp(-pow((x - uCar.x) / spread, 2.0) * 1.4) * smoothstep(0.0, 2.5, fz) * exp(-fz / 16.0) * 0.32 * (0.5 + wet); }",
        /* other traffic: head (white) / tail (red) streaks */
        "  for (int i = 0; i < 6; i++) { vec4 tr = uTraffic[i]; if (tr.w <= 0.0) continue;",
        "    float d = z - tr.y; float tail = step(0.5, tr.z);",
        "    float a = d > 0.0 ? exp(-d / mix(5.5, 2.8, tail)) : exp(d / 0.7);",
        "    float s = exp(-pow(x - tr.x - 0.62, 2.0) / 0.018) + exp(-pow(x - tr.x + 0.62, 2.0) / 0.018);",
        "    col += mix(vec3(0.8, 0.88, 1.0), vec3(1.0, 0.06, 0.04), tail) * s * a * wet * tr.w * rip; }",
        "  " + FOG_GLSL,
        "  col = mix(col, uFog, fogF);",
        "  gl_FragColor = vec4(col, 1.0);",
        "  #include <tonemapping_fragment>",
        "  #include <colorspace_fragment>",
        "}"
      ].join("\n")
    });
    var g = new THREE.PlaneGeometry(64, 300, 1, 1);
    g.rotateX(-Math.PI / 2);
    var m = new THREE.Mesh(g, groundMat);
    m.position.z = -110;
    scene.add(m);
  }

  /* ───────────────── buildings: one merged geometry per segment ──────── */
  function buildingGeometry(R) {
    var pos = [], nor = [], loc = [], seed = [], idx = [];
    function addBox(cx, cz, w, h, d, s) {
      var b = new THREE.BoxGeometry(w, h, d);
      var bp = b.attributes.position, bn = b.attributes.normal, bi = b.index;
      var base = pos.length / 3;
      for (var i = 0; i < bp.count; i++) {
        var x = bp.getX(i), y = bp.getY(i), z = bp.getZ(i);
        pos.push(x + cx, y + h / 2, z + cz);
        nor.push(bn.getX(i), bn.getY(i), bn.getZ(i));
        loc.push(x + w / 2, y + h / 2, z + d / 2);
        seed.push(s);
      }
      for (var k = 0; k < bi.count; k++) idx.push(bi.getX(k) + base);
      b.dispose();
    }
    [-1, 1].forEach(function (side) {
      var z = 0;
      while (z > -L) {
        var w = 7 + R() * 10;
        var h = 9 + Math.pow(R(), 1.6) * 34;
        var d = 8 + R() * 8;
        addBox(side * (10.5 + d / 2 + R() * 1.5), z - w / 2, d, h, w, Math.floor(R() * 97));
        z -= w + 0.6 + R() * 1.5;
      }
    });
    var g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute("aLocal", new THREE.Float32BufferAttribute(loc, 3));
    g.setAttribute("aSeed", new THREE.Float32BufferAttribute(seed, 1));
    g.setIndex(idx);
    return g;
  }
  function buildingMaterial() {
    return new THREE.ShaderMaterial({
      uniforms: { uFog: { value: FOG }, uFogD: { value: FOG_D }, uTime: { value: 0 } },
      vertexShader: [
        "attribute vec3 aLocal; attribute float aSeed;",
        "varying vec3 vL; varying vec3 vN; varying float vSeed; varying float vDepth; varying float vY;",
        "void main(){ vL = aLocal; vN = normal; vSeed = aSeed;",
        "  vec4 w = modelMatrix * vec4(position, 1.0); vY = w.y; vec4 mv = viewMatrix * w; vDepth = -mv.z;",
        "  gl_Position = projectionMatrix * mv; }"
      ].join("\n"),
      fragmentShader: [
        "uniform vec3 uFog; uniform float uFogD; uniform float uTime;",
        "varying vec3 vL; varying vec3 vN; varying float vSeed; varying float vDepth; varying float vY;",
        "float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }",
        "void main(){",
        /* the seed is a varying: snap it, or interpolation error turns the hash into per-pixel noise */
        "  float seed = floor(vSeed + 0.5);",
        "  vec3 col = vec3(0.012, 0.013, 0.017);",
        "  if (abs(vN.y) < 0.5) {",
        "    vec2 uv = abs(vN.x) > 0.5 ? vec2(vL.z, vL.y) : vec2(vL.x, vL.y);",
        "    vec2 cell = floor(uv / vec2(2.3, 3.3)); vec2 f = fract(uv / vec2(2.3, 3.3));",
        "    float win = step(0.22, f.x) * step(f.x, 0.8) * step(0.28, f.y) * step(f.y, 0.8);",
        "    float fw = max(fwidth(uv.x / 2.3), fwidth(uv.y / 3.3));",
        "    float aa = smoothstep(0.1, 0.32, fw);",
        "    float h = hash(cell + seed * 17.0);",
        "    float lit = step(0.74, h) * step(4.0, vL.y);",
        "    vec3 warm = vec3(1.0, 0.62, 0.3); vec3 cool = vec3(0.45, 0.62, 0.85);",
        "    vec3 wc = mix(warm, cool, step(0.9, fract(h * 7.3)));",
        "    float inner = 0.75 + 0.25 * f.y;",
        "    vec3 pane = win * (lit * wc * (0.22 + 0.35 * fract(h * 13.1)) * inner + (1.0 - lit) * vec3(0.02, 0.022, 0.028));",
        "    vec3 avg = vec3(0.6, 0.42, 0.25) * 0.045 * step(4.0, vL.y);",
        "    col += mix(pane, avg, aa);",
        /* street level: an occasional lit shopfront band */
        "    float shop = step(vL.y, 3.2) * step(0.6, vL.y) * step(0.55, hash(vec2(floor(uv.x / 4.0), seed)));",
        "    col += shop * mix(vec3(1.0, 0.7, 0.35), vec3(0.3, 0.85, 0.8), step(0.8, hash(vec2(seed, 3.0)))) * 0.22;",
        "  }",
        "  " + FOG_GLSL,
        "  col = mix(col, uFog, fogF);",
        "  gl_FragColor = vec4(col, 1.0);",
        "  #include <tonemapping_fragment>",
        "  #include <colorspace_fragment>",
        "}"
      ].join("\n")
    });
  }

  /* ───────────────── one street segment (lights + buildings) ─────────── */
  function buildSegment(glowTex, mobile) {
    var seg = new THREE.Group();
    var poleMat = new THREE.MeshStandardMaterial({ color: 0x15171b, roughness: 0.6, metalness: 0.5 });
    var headMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 1.9, 0.8) });
    var poleG = new THREE.CylinderGeometry(0.07, 0.1, 7.6, 8);
    var armG = new THREE.BoxGeometry(2.6, 0.08, 0.1);
    var headG = new THREE.BoxGeometry(0.7, 0.1, 0.32);
    var coneG = new THREE.ConeGeometry(2.5, 7.1, 20, 1, true);
    coneG.translate(0, -3.55, 0);
    var glowMat = new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(1.0, 0.62, 0.28), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: true });
    for (var i = 0; i < NSEG; i++) {
      var z = -i * S;
      [-1, 1].forEach(function (side) {
        var pole = new THREE.Mesh(poleG, poleMat); pole.position.set(side * 7.75, 3.8, z); seg.add(pole);
        var arm = new THREE.Mesh(armG, poleMat); arm.position.set(side * 6.5, 7.55, z); seg.add(arm);
        var head = new THREE.Mesh(headG, headMat); head.position.set(side * LAMP_X, 7.45, z); seg.add(head);
        var glow = new THREE.Sprite(glowMat); glow.position.set(side * LAMP_X, 7.35, z); glow.scale.set(4.2, 4.2, 1); seg.add(glow);
        if (!mobile) {
          var cone = new THREE.Mesh(coneG, coneMat); cone.position.set(side * LAMP_X, 7.4, z); seg.add(cone);
        }
      });
    }
    var bld = new THREE.Mesh(buildingGeometry(rand(7)), bldMat);
    seg.add(bld);
    return seg;
  }
  function coneMaterial() {
    return new THREE.ShaderMaterial({
      uniforms: { uFog: { value: FOG }, uFogD: { value: FOG_D } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: [
        "varying float vH; varying float vEdge; varying float vDepth;",
        "void main(){ vH = clamp(-position.y / 7.1, 0.0, 1.0);",
        "  vec4 w = modelMatrix * vec4(position, 1.0); vec4 mv = viewMatrix * w; vDepth = -mv.z;",
        "  vec3 n = normalize(normalMatrix * normal); vec3 v = normalize(-mv.xyz);",
        "  vEdge = abs(dot(n, v)); gl_Position = projectionMatrix * mv; }"
      ].join("\n"),
      fragmentShader: [
        "uniform vec3 uFog; uniform float uFogD; varying float vH; varying float vEdge; varying float vDepth;",
        "void main(){ float a = (1.0 - vH) * (1.0 - vH) * pow(vEdge, 1.4) * 0.085;",
        "  " + FOG_GLSL,
        "  a *= 1.0 - fogF; gl_FragColor = vec4(vec3(1.0, 0.6, 0.26) * a, 1.0); }"
      ].join("\n")
    });
  }

  /* ───────────────── the car ───────────────── */
  function buildCar(glowTex, shadowTex) {
    var g = new THREE.Group();
    var shape = new THREE.Shape();
    var P = [[-2.3, 0.3], [-2.34, 0.6], [-2.22, 0.79], [-0.98, 0.93], [-0.28, 1.36], [0.92, 1.39],
             [1.82, 1.0], [2.26, 0.97], [2.3, 0.62], [2.27, 0.3]];
    shape.moveTo(P[0][0], P[0][1]);
    for (var i = 1; i < P.length; i++) shape.lineTo(P[i][0], P[i][1]);
    shape.closePath();
    var body = new THREE.ExtrudeGeometry(shape, { depth: 1.74, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.05, bevelSegments: 3, steps: 1, curveSegments: 4 });
    body.rotateY(-Math.PI / 2);
    body.translate(0.87, 0, 0);
    var bp = body.attributes.position;
    for (var k = 0; k < bp.count; k++) {
      var y = bp.getY(k);
      var tpr = 1 - 0.15 * THREE.MathUtils.smoothstep(y, 0.95, 1.38);
      bp.setX(k, bp.getX(k) * tpr);
    }
    body.computeVertexNormals();
    body.computeBoundingBox();
    carBodyGeometry = body;
    var rearZ = body.boundingBox.max.z;
    var paint = new THREE.MeshStandardMaterial({ color: 0x2e333b, metalness: 0.85, roughness: 0.28, envMapIntensity: 1.3 });
    var bodyMesh = new THREE.Mesh(body, paint);
    g.add(bodyMesh);

    var glass = new THREE.MeshStandardMaterial({ color: 0x030405, metalness: 0.95, roughness: 0.06, envMapIntensity: 1.6, side: THREE.DoubleSide });
    var rw = new THREE.Mesh(new THREE.PlaneGeometry(1.34, 0.8), glass);
    rw.position.set(0, 1.2 + 0.08, 1.37 + 0.04);
    rw.rotation.x = -1.134;
    g.add(rw);
    var side = new THREE.PlaneGeometry(2.0, 0.34);
    [-1, 1].forEach(function (s) {
      var sw = new THREE.Mesh(side, glass);
      sw.position.set(s * 0.82, 1.16, 0.2); sw.rotation.y = s * Math.PI / 2; sw.rotation.x = 0;
      g.add(sw);
    });

    var trim = new THREE.MeshStandardMaterial({ color: 0x070708, roughness: 0.7, metalness: 0.2 });
    var diff = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.16, 0.06), trim);
    diff.position.set(0, 0.36, rearZ - 0.02); g.add(diff);
    var recess = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.17, 0.02), trim);
    recess.position.set(0, 0.5, rearZ - 0.002); g.add(recess);
    var chrome = new THREE.MeshStandardMaterial({ color: 0x9a9da3, roughness: 0.18, metalness: 1.0 });
    var strip = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.012, 0.012), chrome);
    strip.position.set(0, 0.64, rearZ + 0.003); g.add(strip);
    /* tail lights: full-width bar + two clusters, all emissive; glows add the bloom */
    var red = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 0.07, 0.045) });
    var bar = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.016, 0.02), red);
    bar.position.set(0, 0.86, rearZ - 0.005); g.add(bar);
    [-1, 1].forEach(function (s) {
      var cl = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.06, 0.02), red);
      cl.position.set(s * 0.66, 0.84, rearZ - 0.01); g.add(cl);
      var gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(1.0, 0.08, 0.05), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      gl.position.set(s * 0.66, 0.84, rearZ + 0.06); gl.scale.set(1.1, 0.7, 1); g.add(gl);
    });
    var wide = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(0.5, 0.03, 0.02), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    wide.position.set(0, 0.84, rearZ + 0.1); wide.scale.set(3.2, 0.9, 1); g.add(wide);

    /* plate, lit by its own plate lamp (MeshBasic keeps it legible) */
    plateCanvas = drawPlate(document.createElement("canvas"));
    var ptex = new THREE.CanvasTexture(plateCanvas);
    ptex.colorSpace = THREE.SRGBColorSpace;
    ptex.anisotropy = 4;
    plateMesh = new THREE.Mesh(new THREE.PlaneGeometry(PLATE_W, PLATE_H), new THREE.MeshBasicMaterial({ map: ptex, color: new THREE.Color(0.92, 0.9, 0.86) }));
    plateMesh.position.set(0, 0.5, rearZ + 0.016);
    g.add(plateMesh);
    var lamp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(0.25, 0.24, 0.22), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    lamp.position.set(0, 0.58, rearZ + 0.03); lamp.scale.set(0.9, 0.25, 1); g.add(lamp);

    var tyre = new THREE.MeshStandardMaterial({ color: 0x0b0b0c, roughness: 0.85 });
    var wg = new THREE.CylinderGeometry(0.33, 0.33, 0.24, 22);
    wg.rotateZ(Math.PI / 2);
    [[-0.84, -1.45], [0.84, -1.45], [-0.84, 1.42], [0.84, 1.42]].forEach(function (p) {
      var w = new THREE.Mesh(wg, tyre); w.position.set(p[0], 0.33, p[1]); g.add(w); wheels.push(w);
    });
    var sh = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 5.4), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, color: 0x000000 }));
    sh.rotation.x = -Math.PI / 2; sh.position.y = 0.012; g.add(sh);
    g.position.x = CAR_X;
    g.userData.rearZ = rearZ;
    roadUniforms.uCar.value.set(CAR_X, rearZ, 0);
    return g;
  }

  /* ───────────────── traffic: headlights, tail lights, trails ───────── */
  function buildTraffic(glowTex, flareTex, trailTex, count) {
    var R = rand(99);
    var bodyMat = new THREE.MeshStandardMaterial({ color: 0x08090b, roughness: 0.35, metalness: 0.8 });
    var bodyG = carBodyGeometry;
    /* trail: flat strip, bright at the light (u = 0) fading behind it */
    var trailG = new THREE.PlaneGeometry(9, 0.14);
    trailG.rotateX(-Math.PI / 2); trailG.rotateY(Math.PI / 2);
    for (var i = 0; i < count; i++) {
      var oncoming = i % 3 !== 2;
      var grp = new THREE.Group();
      var b = new THREE.Mesh(bodyG, bodyMat); if (oncoming) b.rotation.y = Math.PI; grp.add(b);
      var col = oncoming ? new THREE.Color(0.9, 0.95, 1.0) : new THREE.Color(1.0, 0.07, 0.05);
      var fz = oncoming ? 2.25 : 2.25; /* lights face the camera either way (head for oncoming, tail for same way) */
      var gm = new THREE.SpriteMaterial({ map: glowTex, color: col, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: true });
      [-1, 1].forEach(function (s) {
        var sp = new THREE.Sprite(gm); sp.position.set(s * 0.62, 0.72, fz); sp.scale.setScalar(oncoming ? 1.6 : 0.9); grp.add(sp);
        var tr = new THREE.Mesh(trailG, new THREE.MeshBasicMaterial({ map: trailTex, color: col.clone().multiplyScalar(oncoming ? 0.5 : 0.7), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: true }));
        tr.position.set(s * 0.62, 0.66, fz - 4.5); grp.add(tr);
      });
      if (oncoming) {
        var fl = new THREE.Sprite(new THREE.SpriteMaterial({ map: flareTex, color: new THREE.Color(0.35, 0.55, 1.0), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.55, fog: true }));
        fl.position.set(0, 0.72, fz + 0.1); fl.scale.set(9, 0.12, 1); grp.add(fl);
      }
      scene.add(grp);
      traffic.push({ g: grp, oncoming: oncoming, z: -40 - R() * 200, x: 0, v: 0, R: R });
      respawn(traffic[traffic.length - 1], true);
    }
  }
  function respawn(t, first) {
    var R = t.R;
    if (t.oncoming) { t.x = R() < 0.6 ? -1.75 : -5.2; t.v = SPEED + 11 + R() * 6; }
    else { t.x = 5.2; t.v = 3 + R() * 4; }
    t.z = first ? -30 - R() * 190 : -220 - R() * 40;
    t.g.position.x = t.x;
    t.g.rotation.y = t.oncoming ? 0 : 0;
  }

  /* ───────────────── rain ───────────────── */
  function buildRain(n) {
    var R = rand(2024);
    var a = new Float32Array(n * 2 * 4);
    for (var i = 0; i < n; i++) {
      var x = R(), y = R(), z = R(), b = R();
      for (var e = 0; e < 2; e++) {
        var o = (i * 2 + e) * 4;
        a[o] = x; a[o + 1] = y; a[o + 2] = z; a[o + 3] = e + b * 0.001;
      }
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 2 * 3), 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(a, 4));
    rainMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uTravel: { value: 0 }, uCam: { value: new THREE.Vector3() }, uBox: { value: new THREE.Vector3(26, 14, 44) } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: [
        "attribute vec4 aSeed; uniform float uTime; uniform float uTravel; uniform vec3 uCam; uniform vec3 uBox; varying float vA;",
        "void main(){",
        "  vec3 p = aSeed.xyz * uBox;",
        "  p.y = mod(p.y - uTime * 10.5, uBox.y);",
        "  p.z = mod(p.z + uTravel, uBox.z);",
        "  p.x = mod(p.x + uTime * 0.6, uBox.x);",
        "  vec3 w = vec3(uCam.x - uBox.x * 0.5, 0.0, uCam.z - uBox.z * 0.85) + p;",
        "  vec3 vel = normalize(vec3(0.6, -10.5, 13.0));",
        "  w -= vel * 0.55 * floor(aSeed.w + 0.5);",
        "  vec4 mv = viewMatrix * vec4(w, 1.0); float d = -mv.z;",
        "  float dz = mod(w.z - uTravel + 8.0, 16.0) - 8.0;",
        "  float lamp = exp(-dz * dz * 0.035) * exp(-pow(abs(w.x) - 5.1, 2.0) * 0.06) * smoothstep(0.0, 6.0, w.y);",
        "  vA = smoothstep(0.35, 1.6, d) * exp(-d * 0.045) * (0.16 + 1.5 * lamp);",
        "  gl_Position = projectionMatrix * mv; }"
      ].join("\n"),
      fragmentShader: "varying float vA; void main(){ gl_FragColor = vec4(vec3(0.78, 0.84, 0.95), vA); }"
    });
    var lines = new THREE.LineSegments(g, rainMat);
    lines.frustumCulled = false;
    scene.add(lines);
  }

  /* A tiny procedural environment for glossy reflections on paint/glass:
     dark dome, rows of sodium strips overhead, one cool sky band. */
  function buildEnv() {
    var pm = new THREE.PMREMGenerator(renderer);
    var es = new THREE.Scene();
    es.background = new THREE.Color(0x05060a);
    var mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 2.6, 1.0) });
    for (var i = -3; i <= 3; i++) {
      var m = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.1, 0.25), mat);
      m.position.set(i % 2 ? 2.2 : -2.2, 2.2, i * 2.2); es.add(m);
    }
    var sky = new THREE.Mesh(new THREE.BoxGeometry(14, 0.4, 14), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.06, 0.08, 0.13) }));
    sky.position.y = 5; es.add(sky);
    var rt = pm.fromScene(es, 0.04);
    pm.dispose();
    return rt.texture;
  }

  /* ───────────────── camera: keyframed shot relative to the car ─────── */
  /* Keyframes p → camera position / look target (car-local, metres) and
     horizontal FOV. 0 wide establishing · 0.32 chase · 0.5 closing ·
     0.62 the plate fills the lens (lock + deskew + read happen here). */
  var KEYS = [
    { p: 0.0,  pos: [-4.8, 3.2, 14.0], look: [-6.6, 1.5, -9.0], hf: 64 },
    { p: 0.3,  pos: [-2.0, 1.9, 9.4],  look: [-0.9, 0.95, -3.0], hf: 56 },
    { p: 0.5,  pos: [-0.7, 1.15, 5.4], look: [0.0, 0.62, 1.2],   hf: 46 },
    { p: 0.62, pos: [-0.42, 0.8, 3.95], look: [0.0, 0.5, 2.3],  hf: 40 },
    { p: 0.8,  pos: [-1.1, 1.5, 7.2],   look: [0.0, 0.7, 0.5],  hf: 46 },
    { p: 1.0,  pos: [-1.4, 1.7, 8.4],   look: [0.0, 0.75, 0.0], hf: 48 }
  ];
  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function sampleKeys(p) {
    p = Math.max(0, Math.min(1, p));
    for (var i = 0; i < KEYS.length - 1; i++) {
      var a = KEYS[i], b = KEYS[i + 1];
      if (p <= b.p) {
        var t = ease((p - a.p) / (b.p - a.p));
        return {
          pos: a.pos.map(function (v, k) { return v + (b.pos[k] - v) * t; }),
          look: a.look.map(function (v, k) { return v + (b.look[k] - v) * t; }),
          hf: a.hf + (b.hf - a.hf) * t
        };
      }
    }
    var l = KEYS[KEYS.length - 1];
    return { pos: l.pos, look: l.look, hf: l.hf };
  }
  var lookV = new THREE.Vector3();
  function placeCamera() {
    var k = sampleKeys(st.ps);
    var aspect = st.cssW / st.cssH;
    var close = THREE.MathUtils.smoothstep(st.ps, 0.45, 0.62) * (1 - THREE.MathUtils.smoothstep(st.ps, 0.64, 0.8));
    /* Portrait screens: keep the horizontal framing by widening the
       vertical FOV, but cap it; for the close-up pull back a touch so the
       plate fits the narrow frame. */
    var hf = k.hf * Math.PI / 180;
    var vf = 2 * Math.atan(Math.tan(hf / 2) / Math.max(aspect, 0.01));
    var vfDeg = Math.min(78, Math.max(24, vf * 180 / Math.PI * (aspect < 1 ? 0.8 : 1)));
    camera.fov = vfDeg;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    var pull = aspect < 1 ? 1 + (1 - aspect) * 0.35 * close : 1;
    var cx = car.position.x;
    var rz = car.userData.rearZ;
    /* handheld: tiny, slow, and it calms down once the plate is locked */
    var calm = 1 - 0.75 * close;
    var sx = (Math.sin(st.t * 0.9) * 0.6 + Math.sin(st.t * 2.3 + 1.0) * 0.25) * 0.035 * calm;
    var sy = (Math.sin(st.t * 1.3 + 2.0) * 0.5 + Math.sin(st.t * 3.1) * 0.2) * 0.025 * calm;
    var lz = k.look[2];
    /* the wide shots offset the car to the right of the headline; on a
       narrow screen that would push it out of frame, so scale it down */
    var lat = Math.max(0.22, Math.min(1, aspect / 1.6));
    camera.position.set(cx + k.pos[0] * pull * (0.6 + 0.4 * lat) + sx, k.pos[1] + sy + car.position.y, rz + (k.pos[2] - rz) * pull);
    lookV.set(cx + k.look[0] * lat, k.look[1] + car.position.y, lz);
    camera.lookAt(lookV);
    camera.rotation.z += Math.sin(st.t * 0.7) * 0.004 * calm;
  }

  /* ───────────────── frame ───────────────── */
  var corners = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  function projectPlate() {
    var hw = PLATE_W / 2, hh = PLATE_H / 2;
    var local = [[-hw, hh], [hw, hh], [hw, -hh], [-hw, -hh]];
    var q = [];
    for (var i = 0; i < 4; i++) {
      corners[i].set(local[i][0], local[i][1], 0);
      plateMesh.localToWorld(corners[i]);
      corners[i].project(camera);
      q.push([(corners[i].x + 1) / 2 * st.cssW, (1 - corners[i].y) / 2 * st.cssH]);
    }
    st.quad = q;
  }

  function update(dt) {
    st.t += dt;
    var k = 1 - Math.exp(-dt * 7);
    st.ps += (st.p - st.ps) * k;
    st.travel += dt * SPEED;

    /* the car: suspension bob, slight lane drift that calms at lock */
    var close = THREE.MathUtils.smoothstep(st.ps, 0.45, 0.62);
    car.position.y = Math.sin(st.t * 5.1) * 0.006 + Math.sin(st.t * 1.7) * 0.004;
    car.position.x = CAR_X + Math.sin(st.t * 0.35) * 0.16 * (1 - close * 0.7);
    car.rotation.z = Math.sin(st.t * 1.7 + 0.5) * 0.004;
    roadUniforms.uCar.value.x = car.position.x;
    for (var i = 0; i < wheels.length; i++) wheels[i].rotation.x -= dt * SPEED / 0.33;

    /* street segments flow toward the camera */
    var off = ((st.travel % L) + L) % L;
    for (var s = 0; s < segs.length; s++) segs[s].position.z = off + (1 - s) * L;

    /* the two nearest streetlights on our side light the car as it passes */
    var mod = ((st.travel % S) + S) % S;
    lampLights[0].position.set(LAMP_X, 7.2, mod - S);
    lampLights[1].position.set(LAMP_X, 7.2, mod);
    lampLights[2].position.set(-LAMP_X, 7.2, mod - S * 0.5 - (mod > S * 0.5 ? 0 : 0));

    for (var j = 0; j < traffic.length; j++) {
      var t = traffic[j];
      t.z += t.v * dt;
      if (t.z > 46) respawn(t, false);
      t.g.position.z = t.z;
      var u = roadUniforms.uTraffic.value[j];
      if (u) u.set(t.x, t.z + 2.25, t.oncoming ? 0 : 1, t.z > -150 ? 1 : 0);
    }

    roadUniforms.uTravel.value = st.travel;
    roadUniforms.uTime.value = st.t;
    rainMat.uniforms.uTime.value = st.t;
    rainMat.uniforms.uTravel.value = st.travel;
    placeCamera();
    rainMat.uniforms.uCam.value.copy(camera.position);
  }

  function resize() {
    if (!canvas) return;
    var w = canvas.clientWidth || canvas.parentNode.clientWidth;
    var h = canvas.clientHeight || canvas.parentNode.clientHeight;
    if (!w || !h) return;
    st.cssW = w; st.cssH = h;
    renderer.setPixelRatio(st.dpr);
    renderer.setSize(w, h, false);
  }

  function adapt(dt) {
    if (st.force) return;
    st.frameAcc += dt; st.frameN++;
    if (st.frameN < 40) return;
    var avg = st.frameAcc / st.frameN * 1000;
    st.frameAcc = 0; st.frameN = 0;
    if (avg > 24 && st.dpr > st.dprMin) { st.dpr = Math.max(st.dprMin, st.dpr - 0.15); resize(); }
    else if (avg < 14 && st.dpr < st.dprMax) { st.dpr = Math.min(st.dprMax, st.dpr + 0.1); resize(); }
    /* still crawling at the floor → hand back to the static still */
    if (avg > 50 && st.dpr <= st.dprMin + 0.01) {
      if (++st.slowStreak >= 3) { api.stop(); global.dispatchEvent(new CustomEvent("plates-chase-fallback")); }
    } else st.slowStreak = 0;
  }

  function frame(now) {
    st.raf = requestAnimationFrame(frame);
    var dt = st.last ? Math.min(0.05, (now - st.last) / 1000) : 1 / 60;
    st.last = now;
    update(dt);
    renderer.render(scene, camera);
    projectPlate();
    if (!st.firstFrame) {
      st.firstFrame = true;
      canvas.classList.add("is-live");
      global.dispatchEvent(new CustomEvent("plates-chase-ready"));
    }
    if (st.onFrame) st.onFrame(st);
    if (st.t > 1.5) adapt(dt);
  }

  var api = {
    init: function (cv, opts) {
      opts = opts || {};
      canvas = cv;
      st.mobile = !!opts.mobile;
      st.force = !!opts.force;
      st.dprMax = Math.min(global.devicePixelRatio || 1, st.mobile ? 1.25 : 1.6);
      st.dpr = st.force ? Math.min(1, st.dprMax) : st.dprMax;
      try {
        renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: !st.mobile, alpha: false, powerPreference: "high-performance" });
      } catch (e) { return false; }
      renderer.setClearColor(FOG, 1);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(FOG, FOG_D);
      camera = new THREE.PerspectiveCamera(40, 1.6, 0.05, 260);
      scene.environment = buildEnv();

      scene.add(new THREE.HemisphereLight(0x22304a, 0x080808, 0.6));
      var moon = new THREE.DirectionalLight(0x8aa2d0, 0.35); moon.position.set(-6, 10, 4); scene.add(moon);
      for (var i = 0; i < 3; i++) {
        var pl = new THREE.PointLight(0xffa04a, i === 2 ? 30 : 70, 30, 2);
        scene.add(pl); lampLights.push(pl);
      }
      var glowTex = glowTexture();
      coneMat = coneMaterial();
      bldMat = buildingMaterial();
      buildGround();
      for (var s = 0; s < 3; s++) {
        var seg = s === 0 ? buildSegment(glowTex, st.mobile) : segs[0].clone();
        segs.push(seg); scene.add(seg);
      }
      car = buildCar(glowTex, shadowTexture());
      scene.add(car);
      buildTraffic(glowTex, streakTexture(false), streakTexture(true), st.mobile ? 4 : 6);
      buildRain(st.mobile ? 1600 : 5200);
      resize();
      if ("ResizeObserver" in global) {
        var lastW = 0, lastH = 0;
        new ResizeObserver(function () {
          var w = canvas.clientWidth, h = canvas.clientHeight;
          /* mobile toolbars nudge the height on every scroll — ignore small height-only changes */
          if (w === lastW && Math.abs(h - lastH) < 120 && st.mobile) return;
          lastW = w; lastH = h; resize();
        }).observe(canvas);
      } else global.addEventListener("resize", resize);
      canvas.addEventListener("webglcontextlost", function (e) {
        e.preventDefault(); api.stop(); global.dispatchEvent(new CustomEvent("plates-chase-fallback"));
      });
      st.ready = true;
      update(0.016);
      return true;
    },
    start: function () {
      if (!st.ready || st.running) return;
      st.running = true; st.last = 0;
      st.raf = requestAnimationFrame(frame);
    },
    stop: function () {
      st.running = false;
      cancelAnimationFrame(st.raf);
    },
    setProgress: function (p) { st.p = p; },
    getProgressSmooth: function () { return st.ps; },
    getPlateQuad: function () { return st.quad; },
    getPlateCanvas: function () { return plateCanvas; },
    onFrame: function (fn) { st.onFrame = fn; },
    isReady: function () { return st.ready; },
    state: function () { return { ready: st.ready, running: st.running, p: st.p, ps: +st.ps.toFixed(3), dpr: st.dpr, live: st.firstFrame, calls: renderer ? renderer.info.render.calls : 0, tris: renderer ? renderer.info.render.triangles : 0 }; },
    /* QA: jump the smoothed progress (screenshot passes) */
    snap: function (p) { st.p = p; st.ps = p; },
    plateText: PLATE_TEXT
  };
  global.PlatesChase3D = api;
})(window);
