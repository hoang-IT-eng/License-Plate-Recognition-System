/* ════════════════════════════════════════════════════════════════════
   PLATES — Night Checkpoint · "THE SCAN" hero world (Three.js, lazy).
   One GPU particle point-cloud is the signature material of the page:
   a LiDAR-style scan of the checkpoint — low-poly car front, road,
   gate pillars, sodium lamp and the VN plate, all sampled as points.

   The same canvas + engine serves three hosts (one WebGL context):
     · the page VEIL — particles converge from night dust into the
       plate outline while the page loads;
     · the HERO — scroll progress (shared ref from main.js) morphs the
       dust into the full scene; the plate's points end dense + bright
       as the Capture chapter pins (the scan locks on);
     · the CLOSING — the cloud settles into the plate outline with the
       glyphs of the real sample registration 43C-246.80 inside it.

   All point motion lives in the vertex shader (morph between position
   attributes, idle shimmer, pointer repulsion, click shockwave, scan
   band). No per-frame CPU loops over points. Palette arrives as
   uniforms from the CSS tokens (asphalt / amber / scanner cyan).
   ════════════════════════════════════════════════════════════════════ */
(function (global) {
  "use strict";

  /* Seeded RNG — the cloud layout is identical on every load. */
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var PLATE_TEXT = "43C-246.80";
  /* World-space plate frame (car group sits at x +1.15, z −0.6; the
     frame is 1.62 × 0.42 at local (0, 1.02, 0.315)). */
  var PLATE = { cx: 1.15, cy: 1.02, cz: -0.285, w: 1.62, h: 0.42, iw: 1.5, ih: 0.337 };

  var state = {
    ready: false, dead: false, running: false, wantRun: false,
    mode: "hero",
    /* Hero-descent pattern: scroll writes the TARGET into progress;
       the loop eases progressSmooth toward it (cinematic k 2–4). */
    progress: 0, progressSmooth: 0,
    plate: 0, glyph: 0, dim: 1,
    renderer: null, scene: null, camera: null, points: null,
    uniforms: null, canvas: null,
    hosts: { veil: null, hero: null, closing: null },
    camPos: null, camLook: null,
    mouseWorld: null, mouseAmt: 0, mouseSeen: -10,
    clock: null, raf: 0, coarse: false
  };

  /* ── Surface sampling ─────────────────────────────────────────────
     Generic area-weighted triangle sampler over an indexed
     BufferGeometry, transformed by the mesh's world matrix. */
  function buildTriTable(geo) {
    var pos = geo.attributes.position;
    var idx = geo.index;
    var tris = idx ? idx.count / 3 : pos.count / 3;
    var areas = new Float32Array(tris);
    var total = 0;
    var ax, ay, az, bx, by, bz, cx, cy, cz, ux, uy, uz, vx, vy, vz;
    for (var i = 0; i < tris; i++) {
      var a = idx ? idx.getX(i * 3) : i * 3;
      var b = idx ? idx.getX(i * 3 + 1) : i * 3 + 1;
      var c = idx ? idx.getX(i * 3 + 2) : i * 3 + 2;
      ax = pos.getX(a); ay = pos.getY(a); az = pos.getZ(a);
      bx = pos.getX(b); by = pos.getY(b); bz = pos.getZ(b);
      cx = pos.getX(c); cy = pos.getY(c); cz = pos.getZ(c);
      ux = bx - ax; uy = by - ay; uz = bz - az;
      vx = cx - ax; vy = cy - ay; vz = cz - az;
      var crx = uy * vz - uz * vy, cry = uz * vx - ux * vz, crz = ux * vy - uy * vx;
      total += Math.sqrt(crx * crx + cry * cry + crz * crz) * 0.5;
      areas[i] = total;
    }
    return { areas: areas, total: total, tris: tris };
  }

  var _v = null; /* THREE.Vector3, set in init */
  var _n = null;
  /* bias/frontZ: with probability `bias`, the sample is projected onto
     the mesh's local front plane first — the camera mostly sees front
     faces, so they deserve the density. Also writes a facing factor
     into dimOut[o]: how squarely the sampled triangle faces the
     camera (+z). Front faces burn bright; tops and flanks fall off —
     that falloff is what makes the cloud read as a shaped object. */
  function sampleMesh(THREE, mesh, table, rand, out, o, bias, frontZ, dimOut) {
    var geo = mesh.geometry;
    var pos = geo.attributes.position;
    var idx = geo.index;
    var r = rand() * table.total;
    var lo = 0, hi = table.tris - 1;
    while (lo < hi) {
      var mid = (lo + hi) >> 1;
      if (table.areas[mid] < r) lo = mid + 1; else hi = mid;
    }
    var i = lo;
    var a = idx ? idx.getX(i * 3) : i * 3;
    var b = idx ? idx.getX(i * 3 + 1) : i * 3 + 1;
    var c = idx ? idx.getX(i * 3 + 2) : i * 3 + 2;
    var u = rand(), v = rand();
    if (u + v > 1) { u = 1 - u; v = 1 - v; }
    var ax = pos.getX(a), ay = pos.getY(a), az = pos.getZ(a);
    var x = ax + u * (pos.getX(b) - ax) + v * (pos.getX(c) - ax);
    var y = ay + u * (pos.getY(b) - ay) + v * (pos.getY(c) - ay);
    var z = az + u * (pos.getZ(b) - az) + v * (pos.getZ(c) - az);
    if (bias && rand() < bias) z = frontZ;
    _v.set(x, y, z).applyMatrix4(mesh.matrixWorld);
    out[o] = _v.x; out[o + 1] = _v.y; out[o + 2] = _v.z;
    if (dimOut) {
      var ux = pos.getX(b) - ax, uy = pos.getY(b) - ay, uz = pos.getZ(b) - az;
      var vx = pos.getX(c) - ax, vy = pos.getY(c) - ay, vz = pos.getZ(c) - az;
      _n.set(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx).normalize();
      _n.transformDirection(mesh.matrixWorld);
      dimOut[o] = 0.26 + 0.74 * Math.max(0, _n.z);
    }
  }

  /* ── Glyph sampling: draw the real plate text to an offscreen
        canvas and collect the lit-glyph pixel coordinates. ── */
  function glyphPixelPool() {
    var c = document.createElement("canvas");
    c.width = 880; c.height = 198;
    var ctx = c.getContext("2d");
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, 880, 198);
    ctx.fillStyle = "#fff";
    ctx.font = "700 132px 'JetBrains Mono', 'Arial Narrow', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(PLATE_TEXT, 440, 104);
    var data;
    try {
      data = ctx.getImageData(0, 0, 880, 198).data;
    } catch (e) { return []; }
    var pool = [];
    for (var y = 0; y < 198; y += 2) {
      for (var x = 0; x < 880; x += 2) {
        if (data[(y * 880 + x) * 4] > 110) pool.push(x, y);
      }
    }
    return pool;
  }

  /* ── Shaders ──────────────────────────────────────────────────── */
  var VERT = [
    "attribute vec3 aScene;",
    "attribute vec3 aPlate;",
    "attribute vec3 aGlyphs;",
    "attribute float aGlyphFlag;",
    "attribute float aRand;",
    "attribute float aKind;",
    "attribute float aDim;",
    "uniform float uTime;",
    "uniform float uProgress;",
    "uniform float uPlate;",
    "uniform float uGlyphMix;",
    "uniform float uMouseAmt;",
    "uniform vec3 uMouseWorld;",
    "uniform vec4 uClick;",
    "uniform float uBandY;",
    "uniform float uBandAmt;",
    "uniform float uPointScale;",
    "uniform float uSizeMul;",
    "varying vec3 vColor;",
    "varying float vAlpha;",
    "varying float vRadial;",
    "void main(){",
    /* per-point stagger: the cloud assembles in waves, so mid-morph
       states already show partial structure instead of a uniform blur */
    "  float morph = smoothstep(aRand * 0.35, aRand * 0.35 + 0.65, uProgress);",
    "  float plateMix = smoothstep(aRand * 0.30, aRand * 0.30 + 0.70, uPlate);",
    "  vec3 p = mix(position, aScene, morph);",
    "  vec3 plateShape = mix(aPlate, aGlyphs, uGlyphMix);",
    "  p = mix(p, plateShape, plateMix);",
    /* idle shimmer — livelier while the cloud is scattered dust */
    "  float dustAmt = (1.0 - morph) * (1.0 - plateMix);",
    "  float ph = aRand * 6.28318;",
    "  float shim = (0.30 + dustAmt * 0.9) * (1.0 - uGlyphMix * 0.7);",
    "  p.x += sin(uTime * 0.6 + ph + position.y * 1.7) * 0.05 * shim;",
    "  p.y += sin(uTime * 0.45 + ph * 1.7 + position.x * 1.3) * 0.045 * shim;",
    "  p.z += cos(uTime * 0.5 + ph * 2.3) * 0.05 * shim;",
    /* pointer repulsion */
    "  vec3 dm = p - uMouseWorld;",
    "  float md = dot(dm, dm);",
    "  p += (dm / sqrt(md + 0.0004)) * (0.55 * uMouseAmt * exp(-md * 2.4));",
    /* click shockwave — an expanding ring that shoves points outward */
    "  float age = uTime - uClick.w;",
    "  if (age > 0.0 && age < 2.2) {",
    "    vec3 dc = p - uClick.xyz;",
    "    float cd = length(dc);",
    "    float ring = exp(-pow((cd - age * 3.4) * 2.1, 2.0)) * exp(-age * 1.5);",
    "    p += (dc / max(cd, 0.001)) * ring * 0.55;",
    "  }",
    "  vec4 wp = modelMatrix * vec4(p, 1.0);",
    "  vec4 mv = viewMatrix * wp;",
    "  gl_Position = projectionMatrix * mv;",
    "  float dist = max(-mv.z, 0.001);",
    /* scattered dust is finer + dimmer; points grow as they take form */
    "  float form = max(morph, plateMix);",
    "  float base = (0.011 + aRand * 0.011) * (0.75 + 0.45 * form);",
    "  if (aKind > 0.5 && aKind < 1.5) base *= 0.85;",
    "  if (aKind > 2.5 && aKind < 3.5) base *= 1.3;",
    "  if (aKind > 3.5) base *= 0.8;",
    "  gl_PointSize = min(base * uSizeMul * uPointScale / dist, 18.0);",
    /* scan band: the only place scanner cyan may appear */
    "  float band = exp(-pow((wp.y - uBandY) * 4.2, 2.0)) * uBandAmt;",
    "  float isPlate = (aKind > 0.5 && aKind < 1.5) ? 1.0 : 0.0;",
    "  float lock = isPlate * smoothstep(0.78, 1.0, uProgress) * (1.0 - plateMix);",
    "  vec3 warm = mix(vec3(1.0, 0.93, 0.82), vec3(1.0, 0.71, 0.28), aRand * 0.75);",
    "  float bright = 0.34 + aRand * 0.5;",
    "  if (aKind > 1.5 && aKind < 2.5) bright *= 0.75;",
    "  if (isPlate > 0.5) bright = 0.19 + aRand * 0.15;",
    "  if (aKind > 2.5 && aKind < 3.5) { warm = vec3(1.0, 0.86, 0.62); bright = 1.2; }",
    "  if (aKind > 3.5) bright *= 0.30;",
    /* glyph-stroke points burn brighter as the glyph mix takes over,
       so the registration reads against the emptied interior */
    "  bright *= 1.0 + uGlyphMix * aGlyphFlag * 1.15;",
    "  bright *= aDim;",
    "  vec3 col = warm * bright;",
    "  col *= 0.42 + 0.58 * form;",
    "  col = mix(col, vec3(0.45, 0.88, 0.94) * 1.15, clamp(band, 0.0, 1.0) * 0.85);",
    "  col *= 1.0 + lock * 0.25;",
    "  col += vec3(1.0, 0.72, 0.3) * lock * 0.10;",
    "  vColor = col;",
    "  float fadeFar = 1.0 - smoothstep(17.0, 30.0, dist);",
    "  float fadeNear = smoothstep(0.5, 2.0, dist);",
    "  vAlpha = fadeFar * fadeNear;",
    "  vRadial = clamp(length(gl_Position.xy / max(gl_Position.w, 0.001)) * 0.72, 0.0, 1.0);",
    "}"
  ].join("\n");

  var FRAG = [
    "precision mediump float;",
    "varying vec3 vColor;",
    "varying float vAlpha;",
    "varying float vRadial;",
    "uniform float uDim;",
    "void main(){",
    "  float d = length(gl_PointCoord - 0.5);",
    "  float a = smoothstep(0.5, 0.07, d);",
    "  vec3 col = vColor;",
    /* subtle chromatic split, growing toward the frame corners */
    "  col.r *= 1.0 + vRadial * 0.20;",
    "  col.g *= 1.0 - vRadial * 0.04;",
    "  col.b *= 1.0 + vRadial * 0.30;",
    "  gl_FragColor = vec4(col, a * vAlpha * uDim);",
    "}"
  ].join("\n");

  function box(w, h, d, mat, x, y, z, name) {
    var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    if (name) m.name = name;
    return m;
  }

  function init(canvas, opts) {
    if (state.ready || state.dead || !global.THREE) return false;
    opts = opts || {};
    var THREE = global.THREE;
    _v = new THREE.Vector3();
    _n = new THREE.Vector3();
    state.canvas = canvas;
    state.coarse = !!opts.coarse;
    var COUNT = opts.count || (state.coarse ? 12000 : 48000);

    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false, alpha: false, powerPreference: "high-performance" });
    } catch (e) { return false; }

    /* Software renderers (SwiftShader / llvmpipe) stay on the static
       still unless the QA flag ?scan=on forced the engine. */
    if (!opts.force) {
      try {
        var gl = renderer.getContext();
        var dbg = gl.getExtension("WEBGL_debug_renderer_info");
        var rname = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : "";
        if (/swiftshader|llvmpipe|software|angle \(google/i.test(rname)) {
          renderer.dispose();
          return false;
        }
      } catch (e) { /* if we cannot tell, let it run */ }
    }

    var DPR = Math.min(global.devicePixelRatio || 1, state.coarse ? 1.25 : 1.5);
    renderer.setPixelRatio(DPR);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0c0e);
    scene.fog = new THREE.FogExp2(0x0b0c0e, 0.035);

    var camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);
    state.camPos = new THREE.Vector3(0, 1.75, 9.6);
    state.camLook = new THREE.Vector3(0.9, 1.24, 0);
    camera.position.copy(state.camPos);
    camera.lookAt(state.camLook);

    /* Lights — only the dim occluder solids need them. */
    scene.add(new THREE.HemisphereLight(0x2a2f38, 0x0a0a0c, 0.65));
    var lampLight = new THREE.PointLight(0xffa63e, 260, 40, 2.0);
    lampLight.position.set(-6.4, 5.8, -2.6);
    scene.add(lampLight);
    var fill = new THREE.PointLight(0xffe2b8, 46, 34, 2);
    fill.position.set(0.5, 2.4, 7.5);
    scene.add(fill);

    /* ── Occluder solids: near-silhouette meshes that give the cloud
          depth (back points hide behind the car). The particles carry
          the show; these only block light. ── */
    var bodyMat = new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.85, metalness: 0.2 });
    var darkMat = new THREE.MeshStandardMaterial({ color: 0x0a0b0d, roughness: 0.9, metalness: 0.2 });
    var glassMat = new THREE.MeshStandardMaterial({ color: 0x0b0f16, roughness: 0.4, metalness: 0.4 });

    var road = new THREE.Mesh(
      new THREE.PlaneGeometry(70, 46),
      new THREE.MeshStandardMaterial({ color: 0x08090b, roughness: 0.5, metalness: 0.4 })
    );
    road.rotation.x = -Math.PI / 2;
    road.position.z = 6;
    road.name = "road";
    scene.add(road);

    var pillarMat = new THREE.MeshStandardMaterial({ color: 0x0b0d10, roughness: 0.95, metalness: 0.05 });
    var pillars = [];
    [[-8.5, -8], [-3, -10], [4, -9], [9, -7.5]].forEach(function (p, i) {
      var pil = box(1.4, 9, 1.4, pillarMat, p[0], 4.5, p[1], "pillar" + i);
      scene.add(pil);
      pillars.push(pil);
    });

    var postMat = new THREE.MeshStandardMaterial({ color: 0x101216, roughness: 0.6, metalness: 0.6 });
    var post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 6.2, 10), postMat);
    post.position.set(-6.4, 3.1, -2.6);
    post.name = "lampPost";
    scene.add(post);
    var lampHead = box(0.7, 0.16, 0.34, new THREE.MeshStandardMaterial({ color: 0x14161a, emissive: 0xffa63e, emissiveIntensity: 1.6 }), -6.05, 6.15, -2.6, "lampHead");
    scene.add(lampHead);

    /* The car — same primitive layout as the previous solid hero. */
    var car = new THREE.Group();
    var headMat = new THREE.MeshStandardMaterial({ color: 0x2a1c08, emissive: 0xffc987, emissiveIntensity: 0.25, roughness: 0.3 });
    var carParts = [];
    function part(mesh, count, kind, bias) {
      car.add(mesh);
      carParts.push({ mesh: mesh, count: count, kind: kind, bias: bias || 0 });
      return mesh;
    }
    /* Fractions of COUNT — carParts total ≈ 0.436 (see budget below). */
    part(box(5.3, 0.95, 0.6, bodyMat, 0, 0.78, 0, "bumper"), 0.09, 0, 0.7);
    part(box(5.05, 0.72, 0.55, bodyMat, 0, 1.58, -0.02, "hoodFront"), 0.075, 0, 0.7);
    var hood = box(4.9, 0.1, 1.5, bodyMat, 0, 1.98, -0.85, "hoodSlope");
    hood.rotation.x = 0.16;
    part(hood, 0.045, 0);
    var shield = box(4.3, 1.02, 0.42, glassMat, 0, 2.55, -1.18, "shield");
    shield.rotation.x = -0.38;
    part(shield, 0.07, 0, 0.55);
    part(box(4.15, 0.12, 1.55, bodyMat, 0, 3.12, -1.38, "roof"), 0.022, 0);
    part(box(0.55, 0.84, 0.9, darkMat, -2.32, 0.42, 0.05, "wheelL"), 0.014, 0);
    part(box(0.55, 0.84, 0.9, darkMat, 2.32, 0.42, 0.05, "wheelR"), 0.014, 0);
    part(box(2.7, 0.6, 0.08, darkMat, 0, 1.66, 0.3, "grille"), 0.026, 0, 0.75);
    part(box(5.34, 0.3, 0.62, darkMat, 0, 0.32, 0, "intake"), 0.026, 0, 0.7);
    part(box(0.5, 0.22, 0.3, bodyMat, -2.62, 2.2, -0.6, "mirrorL"), 0.006, 0);
    part(box(0.5, 0.22, 0.3, bodyMat, 2.62, 2.2, -0.6, "mirrorR"), 0.006, 0);
    part(box(1.26, 0.48, 0.12, darkMat, -1.88, 1.86, 0.26, "houseL"), 0.01, 0, 0.6);
    part(box(1.26, 0.48, 0.12, darkMat, 1.88, 1.86, 0.26, "houseR"), 0.01, 0, 0.6);
    part(box(0.98, 0.27, 0.1, headMat, -1.88, 1.86, 0.32, "headL"), 0.011, 3, 0.7);
    part(box(0.98, 0.27, 0.1, headMat, 1.88, 1.86, 0.32, "headR"), 0.011, 3, 0.7);
    var plateFrame = new THREE.Mesh(
      new THREE.PlaneGeometry(PLATE.w, PLATE.h),
      new THREE.MeshStandardMaterial({ color: 0x07080a, roughness: 0.6, metalness: 0.3, side: THREE.DoubleSide })
    );
    plateFrame.position.set(0, 1.02, 0.315);
    plateFrame.name = "plateFrame";
    car.add(plateFrame);
    car.position.set(1.15, 0, -0.6);
    scene.add(car);
    scene.updateMatrixWorld(true);

    /* ── Build the point cloud ─────────────────────────────────── */
    var rand = mulberry32(20261119);
    var dust = new Float32Array(COUNT * 3);
    var aScene = new Float32Array(COUNT * 3);
    var aPlate = new Float32Array(COUNT * 3);
    var aGlyphs = new Float32Array(COUNT * 3);
    var aRand = new Float32Array(COUNT);
    var aKind = new Float32Array(COUNT);
    var aDim = new Float32Array(COUNT).fill(1);

    var lampTable = buildTriTable(lampHead.geometry);
    var postTable = buildTriTable(post.geometry);
    var pillarTables = pillars.map(function (p) { return buildTriTable(p.geometry); });
    var partTables = carParts.map(function (p) { return buildTriTable(p.mesh.geometry); });
    var frameTable = buildTriTable(plateFrame.geometry);

    var o = 0; /* point cursor */
    function putScene(x, y, z, kind) {
      aScene[o * 3] = x; aScene[o * 3 + 1] = y; aScene[o * 3 + 2] = z;
      aKind[o] = kind;
      o++;
    }
    function fillFromMesh(mesh, table, n, kind, bias) {
      var fz = (mesh.geometry.parameters && mesh.geometry.parameters.depth)
        ? mesh.geometry.parameters.depth / 2 : 0;
      for (var i = 0; i < n && o < COUNT; i++) {
        sampleMesh(THREE, mesh, table, rand, aScene, o * 3, bias || 0, fz, aDim);
        aKind[o] = kind;
        o++;
      }
    }

    /* Point budget (fractions of COUNT, sums to < 1 — the remainder
       is night air): car 0.436 · plate 0.105 · road 0.19 · pillars
       0.055 · post 0.008 · lamp head 0.005 · air ≈ 0.201. */
    carParts.forEach(function (p, i) {
      fillFromMesh(p.mesh, partTables[i], Math.round(p.count * COUNT), p.kind, p.bias);
    });
    /* the plate — dense, kind 1 (scan band + lock-on live here) */
    fillFromMesh(plateFrame, frameTable, Math.round(0.105 * COUNT), 1);
    /* road: generated directly in the patch that matters (the full
       70×46 plane's far half would crush into a glitter band at the
       horizon). ~50% of points snap onto the LiDAR grid lines. */
    var roadN = Math.round(0.19 * COUNT);
    for (var ri = 0; ri < roadN && o < COUNT; ri++) {
      var rx = (rand() * 2 - 1) * 9.5;
      var rz = -6.5 + rand() * 13.5;
      var rkind = 0;
      aDim[o] = 0.38;
      if (rand() < 0.5) {
        if (rand() < 0.5) rx = Math.round(rx / 1.5) * 1.5;
        else rz = Math.round(rz / 1.5) * 1.5;
        rkind = 2;
        aDim[o] = 0.62; /* grid lines carry a little more light */
      }
      aScene[o * 3] = rx;
      aScene[o * 3 + 1] = 0.012;
      aScene[o * 3 + 2] = rz;
      aKind[o] = rkind;
      o++;
    }
    /* gate pillars + lamp */
    var pilN = Math.round(0.055 * COUNT);
    for (var pi = 0; pi < pillars.length; pi++) {
      fillFromMesh(pillars[pi], pillarTables[pi], Math.round(pilN / pillars.length), 0);
    }
    fillFromMesh(post, postTable, Math.round(0.008 * COUNT), 0);
    fillFromMesh(lampHead, lampTable, Math.round(0.005 * COUNT), 3);
    /* free night air — kind 4: stays dust in the formed scene too,
       kept dim and behind the subject plane so it reads as atmosphere */
    while (o < COUNT) {
      putScene(
        (rand() * 2 - 1) * 10,
        0.15 + rand() * 4.2,
        -7 + rand() * 7.5,
        4
      );
    }

    /* dust start positions (the `position` attribute) — kept behind
       z +3.5 so no spark ever looms huge in front of the camera */
    for (var d = 0; d < COUNT; d++) {
      dust[d * 3] = (rand() * 2 - 1) * 10;
      dust[d * 3 + 1] = 0.05 + rand() * 6.4;
      dust[d * 3 + 2] = -7 + rand() * 10.5;
      aRand[d] = rand();
    }

    /* one perimeter sample of the plate rectangle, edge-length weighted */
    function perimPoint() {
      var per = rand() * (2 * (PLATE.w + PLATE.h)), px, py;
      if (per < PLATE.w) { px = -PLATE.w / 2 + per; py = PLATE.h / 2; }
      else if (per < PLATE.w + PLATE.h) { px = PLATE.w / 2; py = PLATE.h / 2 - (per - PLATE.w); }
      else if (per < 2 * PLATE.w + PLATE.h) { px = PLATE.w / 2 - (per - PLATE.w - PLATE.h); py = -PLATE.h / 2; }
      else { px = -PLATE.w / 2; py = -PLATE.h / 2 + (per - 2 * PLATE.w - PLATE.h); }
      return [px + (rand() - 0.5) * 0.012, py + (rand() - 0.5) * 0.012];
    }

    /* plate outline targets (veil converge + closing base) */
    var plateInterior = new Uint8Array(COUNT);
    for (var q = 0; q < COUNT; q++) {
      var px, py;
      if (rand() < 0.62) {
        var pp = perimPoint(); px = pp[0]; py = pp[1];
      } else {
        px = (rand() * 2 - 1) * PLATE.w / 2;
        py = (rand() * 2 - 1) * PLATE.h / 2;
        plateInterior[q] = 1;
      }
      aPlate[q * 3] = PLATE.cx + px;
      aPlate[q * 3 + 1] = PLATE.cy + py;
      aPlate[q * 3 + 2] = PLATE.cz + (rand() - 0.5) * 0.02;
    }

    /* glyph targets: ~46% of points land inside the strokes of the
       real sample registration. The rest move OUT to the perimeter —
       if they kept their interior fill positions the strokes would
       drown in a uniform field and never read as letterforms. */
    var aGlyphFlag = new Float32Array(COUNT);
    var pool = glyphPixelPool();
    for (var g = 0; g < COUNT; g++) {
      if (pool.length > 2 && rand() < 0.46) {
        var pi2 = Math.floor(rand() * (pool.length / 2)) * 2;
        var cxp = pool[pi2], cyp = pool[pi2 + 1];
        aGlyphs[g * 3] = PLATE.cx + ((cxp / 880) - 0.5) * PLATE.iw + (rand() - 0.5) * 0.008;
        aGlyphs[g * 3 + 1] = PLATE.cy + (0.5 - (cyp / 198)) * PLATE.ih + (rand() - 0.5) * 0.008;
        aGlyphs[g * 3 + 2] = PLATE.cz + 0.012 + (rand() - 0.5) * 0.015;
        aGlyphFlag[g] = 1;
      } else if (plateInterior[g]) {
        var gp = perimPoint();
        aGlyphs[g * 3] = PLATE.cx + gp[0];
        aGlyphs[g * 3 + 1] = PLATE.cy + gp[1];
        aGlyphs[g * 3 + 2] = PLATE.cz + (rand() - 0.5) * 0.02;
      } else {
        aGlyphs[g * 3] = aPlate[g * 3];
        aGlyphs[g * 3 + 1] = aPlate[g * 3 + 1];
        aGlyphs[g * 3 + 2] = aPlate[g * 3 + 2];
      }
    }

    var geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(dust, 3));
    geo.setAttribute("aScene", new THREE.BufferAttribute(aScene, 3));
    geo.setAttribute("aPlate", new THREE.BufferAttribute(aPlate, 3));
    geo.setAttribute("aGlyphs", new THREE.BufferAttribute(aGlyphs, 3));
    geo.setAttribute("aGlyphFlag", new THREE.BufferAttribute(aGlyphFlag, 1));
    geo.setAttribute("aRand", new THREE.BufferAttribute(aRand, 1));
    geo.setAttribute("aKind", new THREE.BufferAttribute(aKind, 1));
    geo.setAttribute("aDim", new THREE.BufferAttribute(aDim, 1));

    var uniforms = {
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uPlate: { value: 0 },
      uGlyphMix: { value: 0 },
      uMouseAmt: { value: 0 },
      uMouseWorld: { value: new THREE.Vector3(0, 0, 99) },
      uClick: { value: new THREE.Vector4(0, 0, 99, -10) },
      uBandY: { value: 5.4 },
      uBandAmt: { value: 1 },
      uPointScale: { value: 600 },
      uSizeMul: { value: 1 },
      uDim: { value: 1 }
    };
    var mat = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    var points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    points.renderOrder = 5;
    scene.add(points);

    state.renderer = renderer;
    state.scene = scene;
    state.camera = camera;
    state.points = points;
    state.uniforms = uniforms;
    state.mouseWorld = new THREE.Vector3(0, 0, 99);
    state.clock = new THREE.Clock();
    state.hosts.hero = canvas.parentNode;
    state.ready = true;

    /* ── Sizing ── */
    function resize() {
      if (!state.canvas) return;
      var w = state.canvas.clientWidth || global.innerWidth;
      var h = state.canvas.clientHeight || global.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      var dbH = renderer.domElement.height || h * DPR;
      uniforms.uPointScale.value = dbH / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)));
    }
    state._resize = resize;
    resize();
    global.addEventListener("resize", resize);
    if ("ResizeObserver" in global) {
      new ResizeObserver(function () { resize(); }).observe(canvas);
    }

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) { stopLoop(); }
      else if (state.wantRun) { startLoop(); }
    });

    canvas.addEventListener("webglcontextlost", function (e) {
      e.preventDefault();
      state.dead = true;
      stopLoop();
      canvas.classList.remove("is-live");
      try { global.dispatchEvent(new Event("plates-hero-fallback")); } catch (err) { /* ignore */ }
    });

    /* ── Pointer inputs → uniforms (never per-frame state churn) ── */
    var ray = new THREE.Raycaster();
    var ndc = new THREE.Vector2();
    var planeZ = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0.2);
    var hit = new THREE.Vector3();
    function pointerWorld(e) {
      ndc.set((e.clientX / global.innerWidth) * 2 - 1, -(e.clientY / global.innerHeight) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      if (ray.ray.intersectPlane(planeZ, hit)) return hit;
      return null;
    }
    global.addEventListener("pointermove", function (e) {
      if (!state.ready || state.dead) return;
      var h = pointerWorld(e);
      if (h) {
        state.mouseWorld.copy(h);
        state.mouseSeen = state.clock ? state.clock.elapsedTime : 0;
      }
    }, { passive: true });
    global.addEventListener("pointerdown", function (e) {
      if (!state.ready || state.dead) return;
      if (e.target && e.target.closest && e.target.closest("a, button, input, label, .demo__drop")) return;
      var h = pointerWorld(e);
      if (h && state.clock) {
        uniforms.uClick.value.set(h.x, h.y, h.z, state.clock.elapsedTime);
      }
    }, { passive: true });

    return true;
  }

  /* ── Camera poses per mode ─────────────────────────────────── */
  function fitDist(fillW) {
    /* distance from the plate plane so the plate spans fillW of the
       viewport width (and never overflows vertically) */
    var cam = state.camera;
    var t = Math.tan(THREE.MathUtils.degToRad(cam.fov * 0.5));
    var byWidth = (PLATE.w / 2) / (t * cam.aspect * fillW);
    var byHeight = (PLATE.h / 2) / (t * 0.62);
    return Math.max(byWidth, byHeight);
  }
  var _tp = null, _tl = null;
  function targetPose() {
    if (!_tp) { _tp = new THREE.Vector3(); _tl = new THREE.Vector3(); }
    var cam = state.camera;
    var p = state.progressSmooth;
    if (state.mode === "veil") {
      var dv = fitDist(0.66);
      _tp.set(PLATE.cx, PLATE.cy + 0.06, PLATE.cz + dv);
      _tl.set(PLATE.cx, PLATE.cy, PLATE.cz);
    } else if (state.mode === "closing") {
      var dc = fitDist(0.85);
      _tp.set(PLATE.cx - 0.12, PLATE.cy + 0.03, PLATE.cz + dc);
      _tl.set(PLATE.cx, PLATE.cy, PLATE.cz);
    } else {
      var z = 9.6 - p * 4.3;
      if (cam.aspect < 1) z *= 1.28;
      _tp.set(0, 1.75 - p * 0.42, z);
      _tl.set(0.9, 1.24 - p * 0.08, 0);
    }
    return { pos: _tp, look: _tl };
  }

  function frame() {
    if (!state.running) return;
    var dt = Math.min(state.clock.getDelta(), 0.05);
    var t = state.clock.elapsedTime;
    var U = state.uniforms;

    /* Ease the shared scroll ref — heavy, cinematic (k ≈ 3.5). */
    var kp = 1 - Math.exp(-dt * 3.5);
    state.progressSmooth += (state.progress - state.progressSmooth) * kp;
    if (Math.abs(state.progress - state.progressSmooth) < 0.0004) {
      state.progressSmooth = state.progress;
    }

    /* Mode-driven uniform targets. */
    var plateT = state.mode === "hero" ? 0 : 1;
    var glyphT = state.mode === "closing" ? 1 : 0;
    var dimT = state.mode === "closing" ? 0.22 : 1;
    state.plate += (plateT - state.plate) * (1 - Math.exp(-dt * 2.6));
    state.glyph += (glyphT - state.glyph) * (1 - Math.exp(-dt * 2.2));
    state.dim += (dimT - state.dim) * (1 - Math.exp(-dt * 3.0));
    /* Closing sits close to the plate: shrink the points so the
       glyph strokes resolve instead of merging into a blob. */
    var sizeT = state.mode === "closing" ? 0.38 : 1;
    state.sizeMul = (state.sizeMul == null ? 1 : state.sizeMul) +
      (sizeT - (state.sizeMul == null ? 1 : state.sizeMul)) * (1 - Math.exp(-dt * 3.0));
    U.uSizeMul.value = state.sizeMul;

    /* Pointer amount: in while the pointer is fresh, decays after. */
    var amtT = (t - state.mouseSeen < 1.6 && state.mode !== "closing") ? 1 : 0;
    state.mouseAmt += (amtT - state.mouseAmt) * (1 - Math.exp(-dt * 5));

    U.uTime.value = t;
    U.uProgress.value = state.progressSmooth;
    U.uPlate.value = state.plate;
    U.uGlyphMix.value = state.glyph;
    U.uDim.value = state.dim;
    U.uMouseAmt.value = state.mouseAmt;
    U.uMouseWorld.value.copy(state.mouseWorld);

    /* Scan band: sweeps down the scene with scroll in the hero; rests
       on the plate in veil / closing. */
    if (state.mode === "hero") {
      var p = state.progressSmooth;
      U.uBandY.value = (5.4 + (0.98 - 5.4) * p) + (1 - p) * Math.sin(t * 0.4) * 0.5;
      U.uBandAmt.value += (0.85 - U.uBandAmt.value) * (1 - Math.exp(-dt * 3));
    } else {
      U.uBandY.value += (PLATE.cy - U.uBandY.value) * (1 - Math.exp(-dt * 3));
      var bT = state.mode === "veil" ? 0.5 : 0.15;
      U.uBandAmt.value += (bT - U.uBandAmt.value) * (1 - Math.exp(-dt * 3));
    }

    /* Camera: ease position + look target toward the mode pose. */
    var pose = targetPose();
    var kc = 1 - Math.exp(-dt * 3.0);
    state.camPos.lerp(pose.pos, kc);
    state.camLook.lerp(pose.look, kc);
    state.camera.position.copy(state.camPos);
    state.camera.lookAt(state.camLook);

    state.renderer.render(state.scene, state.camera);
    if (!state._firstFrame) {
      state._firstFrame = true;
      state.canvas.classList.add("is-live");
    }
    state.raf = requestAnimationFrame(frame);
  }

  function startLoop() {
    if (!state.ready || state.dead || state.running || document.hidden) return;
    state.running = true;
    state.clock.getDelta();
    frame();
  }
  function stopLoop() {
    state.running = false;
    if (state.raf) cancelAnimationFrame(state.raf);
  }

  global.PlatesHero3D = {
    init: init,
    /* Hosts for the one canvas: { veil, hero, closing } elements. */
    setHosts: function (hosts) {
      if (hosts) {
        if (hosts.veil) state.hosts.veil = hosts.veil;
        if (hosts.hero) state.hosts.hero = hosts.hero;
        if (hosts.closing) state.hosts.closing = hosts.closing;
      }
    },
    /* Switch the active surface: re-parents the canvas and retargets
       the morph + camera. The renderer and its context never change. */
    setMode: function (mode) {
      if (!state.ready || state.dead) return;
      if (mode !== "veil" && mode !== "hero" && mode !== "closing") return;
      state.mode = mode;
      var host = state.hosts[mode] || state.hosts.hero;
      if (host && state.canvas && state.canvas.parentNode !== host) {
        host.appendChild(state.canvas);
        if (state._resize) state._resize();
      }
    },
    getMode: function () { return state.mode; },
    getProgressSmooth: function () { return state.progressSmooth; },
    getPlateMix: function () { return state.plate; },
    /* Scroll writes the target only — the loop reads and eases it. */
    setProgress: function (p) { state.progress = Math.max(0, Math.min(1, p)); },
    start: function () { state.wantRun = true; startLoop(); },
    stop: function () { state.wantRun = false; stopLoop(); },
    isReady: function () { return state.ready && !state.dead; }
  };
})(typeof window !== "undefined" ? window : globalThis);
