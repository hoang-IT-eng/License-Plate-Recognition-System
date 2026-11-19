/* ════════════════════════════════════════════════════════════════════
   PLATES — Night Checkpoint hero scene (Three.js, lazy-loaded).
   A low-poly car front built from primitives: sodium lamp, headlight
   bloom, wet-road streak reflections, and a real-proportion VN plate
   (470×110 mm ≈ 4.45 : 1) carrying the sample registration 43C-246.80.
   Camera dollies in with scroll progress via setProgress(0..1).
   ════════════════════════════════════════════════════════════════════ */
(function (global) {
  "use strict";

  var state = {
    ready: false, running: false,
    /* Hero-descent pattern (skill §4): scroll writes the TARGET into
       state.progress; the render loop eases progressSmooth toward it
       and poses the camera from the smoothed value each frame. */
    progress: 0, progressSmooth: 0,
    renderer: null, scene: null, camera: null, car: null,
    lampLight: null, headL: null, headR: null, raf: 0, clock: null
  };

  function glowTexture(inner, outer) {
    var c = document.createElement("canvas");
    c.width = c.height = 128;
    var ctx = c.getContext("2d");
    var g = ctx.createRadialGradient(64, 64, 2, 64, 64, 64);
    g.addColorStop(0, inner);
    g.addColorStop(0.35, outer);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    var tex = new THREE.CanvasTexture(c);
    return tex;
  }

  function streakTexture() {
    var c = document.createElement("canvas");
    c.width = 64; c.height = 256;
    var ctx = c.getContext("2d");
    var g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, "rgba(255,190,110,0.85)");
    g.addColorStop(0.5, "rgba(255,170,80,0.28)");
    g.addColorStop(1, "rgba(255,160,60,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 256);
    var gx = ctx.createLinearGradient(0, 0, 64, 0);
    gx.addColorStop(0, "rgba(0,0,0,1)");
    gx.addColorStop(0.5, "rgba(0,0,0,0)");
    gx.addColorStop(1, "rgba(0,0,0,1)");
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = gx;
    ctx.fillRect(0, 0, 64, 256);
    return new THREE.CanvasTexture(c);
  }

  function plateTexture() {
    var c = document.createElement("canvas");
    c.width = 640; c.height = 144;
    var ctx = c.getContext("2d");
    ctx.fillStyle = "#101114";
    ctx.fillRect(0, 0, 640, 144);
    ctx.fillStyle = "#f2f0e9";
    ctx.fillRect(7, 7, 626, 130);
    ctx.strokeStyle = "#141518";
    ctx.lineWidth = 5;
    ctx.strokeRect(16, 16, 608, 112);
    ctx.fillStyle = "#101114";
    ctx.font = "700 84px 'JetBrains Mono', 'Arial Narrow', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("43C-246.80", 320, 76);
    ctx.beginPath();
    ctx.arc(52, 72, 7, 0, Math.PI * 2);
    ctx.arc(588, 72, 7, 0, Math.PI * 2);
    ctx.fillStyle = "#8a8d90";
    ctx.fill();
    var tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }

  function box(w, h, d, mat, x, y, z) {
    var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    return m;
  }

  function init(canvas) {
    if (state.ready || !global.THREE) return false;
    var THREE = global.THREE;
    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
    } catch (e) { return false; }
    renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0c0e);
    scene.fog = new THREE.FogExp2(0x0b0c0e, 0.04);

    var camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);
    camera.position.set(0, 1.75, 9.6);

    /* Lights */
    scene.add(new THREE.HemisphereLight(0x2a2f38, 0x0a0a0c, 0.7));
    /* Warm rim from behind the car — separates the silhouette from the dark. */
    var rim = new THREE.PointLight(0xffa63e, 42, 26, 2);
    rim.position.set(0.5, 3.6, -5.5);
    scene.add(rim);
    /* Frontal fill from the camera side — checkpoint floodlight spill, so the
       car's front faces and grille read instead of going silhouette-black. */
    var fill = new THREE.PointLight(0xffe2b8, 60, 34, 2);
    fill.position.set(0.5, 2.4, 7.5);
    scene.add(fill);
    var lamp = new THREE.PointLight(0xffa63e, 300, 40, 2.0);
    lamp.position.set(-6.4, 5.8, -2.6);
    scene.add(lamp);
    state.lampLight = lamp;

    /* Road */
    var road = new THREE.Mesh(
      new THREE.PlaneGeometry(70, 46),
      new THREE.MeshStandardMaterial({ color: 0x0a0b0c, roughness: 0.38, metalness: 0.6 })
    );
    road.rotation.x = -Math.PI / 2;
    road.position.z = 6;
    scene.add(road);

    /* Wet streak reflections */
    var streakTex = streakTexture();
    function streak(x, z, w, l, opacity) {
      var m = new THREE.Mesh(
        new THREE.PlaneGeometry(w, l),
        new THREE.MeshBasicMaterial({ map: streakTex, transparent: true, opacity: opacity, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      m.rotation.x = -Math.PI / 2;
      m.rotation.z = Math.PI;
      m.position.set(x, 0.012, z);
      scene.add(m);
    }
    streak(-0.73, 4.4, 1.5, 8.5, 0.5);
    streak(3.03, 4.4, 1.5, 8.5, 0.5);
    streak(0, 3.4, 1.1, 6.0, 0.18);
    streak(-6.4, 1.5, 2.6, 10, 0.3);

    /* Background pillars (garage depth) */
    var pillarMat = new THREE.MeshStandardMaterial({ color: 0x0c0e11, roughness: 0.95, metalness: 0.05 });
    [[-8.5, -8], [-3, -10], [4, -9], [9, -7.5]].forEach(function (p) {
      var pil = box(1.4, 9, 1.4, pillarMat, p[0], 4.5, p[1]);
      scene.add(pil);
    });

    /* Lamp post + glow */
    var postMat = new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.6, metalness: 0.7 });
    var post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 6.2, 10), postMat);
    post.position.set(-6.4, 3.1, -2.6);
    scene.add(post);
    var lampHead = box(0.7, 0.16, 0.34, new THREE.MeshStandardMaterial({ color: 0x1a1c20, emissive: 0xffa63e, emissiveIntensity: 2.4 }), -6.05, 6.15, -2.6);
    scene.add(lampHead);
    var glowTex = glowTexture("rgba(255,205,130,1)", "rgba(255,160,60,0.35)");
    var lampGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffb763, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
    lampGlow.scale.set(3.4, 3.4, 1);
    lampGlow.position.set(-6.05, 6.1, -2.55);
    scene.add(lampGlow);

    /* ── The car (front, facing camera) ── */
    var car = new THREE.Group();
    var bodyMat = new THREE.MeshStandardMaterial({ color: 0x30343b, roughness: 0.5, metalness: 0.3 });
    var darkMat = new THREE.MeshStandardMaterial({ color: 0x0c0d10, roughness: 0.55, metalness: 0.5 });
    var glassMat = new THREE.MeshStandardMaterial({ color: 0x0d1219, roughness: 0.25, metalness: 0.55 });

    car.add(box(5.3, 0.95, 0.6, bodyMat, 0, 0.78, 0));            // bumper band
    car.add(box(5.05, 0.72, 0.55, bodyMat, 0, 1.58, -0.02));      // hood front
    var hood = box(4.9, 0.1, 1.5, bodyMat, 0, 1.98, -0.85);       // hood slope
    hood.rotation.x = 0.16;
    car.add(hood);
    var shield = box(4.3, 1.02, 0.42, glassMat, 0, 2.55, -1.18); // windshield — sloped
    shield.rotation.x = -0.38;
    car.add(shield);
    car.add(box(4.15, 0.12, 1.55, bodyMat, 0, 3.12, -1.38));      // roof
    /* front wheel hints behind the bumper corners */
    car.add(box(0.55, 0.84, 0.9, darkMat, -2.32, 0.42, 0.05));
    car.add(box(0.55, 0.84, 0.9, darkMat, 2.32, 0.42, 0.05));
    car.add(box(2.7, 0.6, 0.08, darkMat, 0, 1.66, 0.3));          // grille
    for (var i = -2; i <= 2; i++) {
      car.add(box(0.09, 0.52, 0.03, new THREE.MeshStandardMaterial({ color: 0x2e3238, roughness: 0.4, metalness: 0.8 }), i * 0.42, 1.66, 0.35));
    }
    car.add(box(5.34, 0.3, 0.62, darkMat, 0, 0.32, 0));           // lower intake
    /* mirrors */
    car.add(box(0.5, 0.22, 0.3, bodyMat, -2.62, 2.2, -0.6));
    car.add(box(0.5, 0.22, 0.3, bodyMat, 2.62, 2.2, -0.6));

    /* Headlights — emissive lamp set into a dark housing */
    var headMat = new THREE.MeshStandardMaterial({ color: 0x2a1c08, emissive: 0xffc987, emissiveIntensity: 2.1, roughness: 0.3 });
    car.add(box(1.26, 0.48, 0.12, darkMat, -1.88, 1.86, 0.26));
    car.add(box(1.26, 0.48, 0.12, darkMat, 1.88, 1.86, 0.26));
    var headL = box(0.98, 0.27, 0.1, headMat, -1.88, 1.86, 0.32);
    var headR = box(0.98, 0.27, 0.1, headMat, 1.88, 1.86, 0.32);
    car.add(headL); car.add(headR);
    state.headL = headL; state.headR = headR;

    [-1.88, 1.88].forEach(function (x) {
      var spot = new THREE.SpotLight(0xffc07a, 180, 34, 0.52, 0.95, 1.5);
      spot.position.set(x, 1.86, 0.45);
      spot.target.position.set(x * 1.35, 0, 9);
      car.add(spot); car.add(spot.target);
      var glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffcf96, transparent: true, opacity: 0.78, blending: THREE.AdditiveBlending, depthWrite: false }));
      glow.scale.set(1.75, 1.75, 1);
      glow.position.set(x, 1.86, 0.5);
      car.add(glow);
      /* faint cyan fringe sprite — the only cool note, at the light source */
      var fringe = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0x7fe7f2, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false }));
      fringe.scale.set(2.4, 2.4, 1);
      fringe.position.set(x + 0.05, 1.88, 0.48);
      car.add(fringe);
    });

    /* The plate — real VN long-plate proportion, sample registration */
    var plateFrame = new THREE.Mesh(new THREE.PlaneGeometry(1.62, 0.42), new THREE.MeshStandardMaterial({ color: 0x08090a, roughness: 0.5, metalness: 0.4 }));
    plateFrame.position.set(0, 1.02, 0.315);
    car.add(plateFrame);
    /* Retroreflective plates bounce the camera light straight back — a basic
       material keeps the registration legible at every dolly distance. */
    var plate = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 0.337),
      new THREE.MeshBasicMaterial({ map: plateTexture(), color: 0xece9e2 })
    );
    plate.position.set(0, 1.02, 0.325);
    car.add(plate);

    car.position.set(1.15, 0, -0.6);
    scene.add(car);

    /* Contact shadow — a soft dark pool grounding the car on the wet road. */
    var shadowTex = glowTexture("rgba(0,0,0,0.92)", "rgba(0,0,0,0.5)");
    var contact = new THREE.Mesh(
      new THREE.PlaneGeometry(7.8, 4.4),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0.62, depthWrite: false })
    );
    contact.rotation.x = -Math.PI / 2;
    contact.position.set(1.15, 0.015, 0.1);
    scene.add(contact);
    state.car = car;

    state.renderer = renderer;
    state.scene = scene;
    state.camera = camera;
    state.clock = new THREE.Clock();
    state.ready = true;

    function resize() {
      var w = canvas.clientWidth || global.innerWidth;
      var h = canvas.clientHeight || global.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resize();
    global.addEventListener("resize", resize);

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) { stop(); } else if (state._wantRun) { start(); }
    });

    applyProgress(0);
    return true;
  }

  function applyProgress(p) {
    if (!state.ready) return;
    var z = 9.6 - p * 3.6;                    // dolly 9.6 → 6.0
    if (state.camera.aspect < 1) z *= 1.28;   // portrait: pull back so the car fits
    var y = 1.75 - p * 0.42;                  // sink toward plate height
    state.camera.position.set(0, y, z);
    state.camera.lookAt(0.7, 1.28 - p * 0.1, 0);
  }

  function frame() {
    if (!state.running) return;
    var dt = Math.min(state.clock.getDelta(), 0.05);
    var t = state.clock.elapsedTime;
    /* Crane-move easing toward the scroll target. */
    var k = 1 - Math.exp(-dt * 5);
    state.progressSmooth += (state.progress - state.progressSmooth) * k;
    if (Math.abs(state.progress - state.progressSmooth) < 0.0005) {
      state.progressSmooth = state.progress;
    }
    applyProgress(state.progressSmooth);
    if (state.car) {
      state.car.position.y = Math.sin(t * 0.85) * 0.008;
      var flicker = 2.05 + Math.sin(t * 13.7) * 0.04 + Math.sin(t * 3.1) * 0.04;
      if (state.headL) { state.headL.material.emissiveIntensity = flicker; state.headR.material.emissiveIntensity = flicker; }
    }
    state.renderer.render(state.scene, state.camera);
    state.raf = requestAnimationFrame(frame);
  }

  function start() {
    state._wantRun = true;
    if (!state.ready || state.running || document.hidden) return;
    state.running = true;
    state.clock.getDelta(); /* flush any stale delta accumulated while paused */
    frame();
  }
  function stop() {
    state.running = false;
    if (state.raf) cancelAnimationFrame(state.raf);
  }

  global.PlatesHero3D = {
    init: init,
    /* Writes the target only — the render loop reads and eases it. */
    setProgress: function (p) { state.progress = Math.max(0, Math.min(1, p)); },
    start: start,
    stop: function () { state._wantRun = false; stop(); },
    isReady: function () { return state.ready; }
  };
})(typeof window !== "undefined" ? window : globalThis);
