/* ==========================================================================
   PLATES — CINEMATIC PASS
   Night-highway WebGL hero layer + Lenis smooth scroll + GSAP film reveals.
   Palette: graphite night, headlight white / sodium amber, taillight red,
   steel-blue atmosphere, phosphor emerald scan. No violet tones.
   Strict fallbacks: reduced-motion / no WebGL -> static photo hero,
   all content visible, nothing depends on this file to render.
   ========================================================================== */
(function () {
  "use strict";

  var reducedMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var hero = document.querySelector(".hero");

  /* Shared interaction state: CTA hover gathers the scene, scroll drives dolly */
  var cine = { ctaHover: 0, ctaTarget: 0, scroll: 0 };

  /* ------------------------------------------------------------------ Lenis */
  function initLenis() {
    if (!window.Lenis) return null;
    var lenis = new window.Lenis({ lerp: 0.09, smoothWheel: true });

    if (window.gsap) {
      lenis.on("scroll", function () {
        if (window.ScrollTrigger) window.ScrollTrigger.update();
      });
      window.gsap.ticker.add(function (time) {
        lenis.raf(time * 1000);
      });
      window.gsap.ticker.lagSmoothing(0);
    } else {
      var rafLoop = function (time) {
        lenis.raf(time);
        requestAnimationFrame(rafLoop);
      };
      requestAnimationFrame(rafLoop);
    }

    /* Route in-page anchors through Lenis so jumps stay filmic */
    var links = document.querySelectorAll('a[href^="#"]');
    for (var i = 0; i < links.length; i++) {
      (function (a) {
        a.addEventListener("click", function (e) {
          var id = a.getAttribute("href");
          if (id.length < 2) return;
          var target = document.querySelector(id);
          if (!target) return;
          e.preventDefault();
          lenis.scrollTo(target, { offset: -72, duration: 1.4 });
        });
      })(links[i]);
    }
    return lenis;
  }

  /* ------------------------------------------------------- GSAP film reveals */
  function initReveals() {
    if (!window.gsap || !window.ScrollTrigger) return;
    var gsap = window.gsap;
    gsap.registerPlugin(window.ScrollTrigger);

    /* Hero intro: masked rise on the headline, staggered interface fade */
    var tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    var kicker = hero && hero.querySelector(".kicker-line");
    var h1 = hero && hero.querySelector(".hero__h1");
    var lead = hero && hero.querySelector(".hero__lead");
    var ctas = hero && hero.querySelector(".cta-row");
    var metrics = hero && hero.querySelector(".hero__metrics");
    var scanner = hero && hero.querySelector(".scanner-frame");

    if (kicker) {
      tl.fromTo(kicker, { y: 16, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.7 }, 0.05);
    }
    if (h1) {
      tl.fromTo(
        h1,
        { clipPath: "inset(0 0 100% 0)", y: 42 },
        { clipPath: "inset(0 0 0% 0)", y: 0, duration: 1.15 },
        0.15
      );
    }
    if (lead) {
      tl.fromTo(lead, { y: 22, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.85 }, 0.45);
    }
    if (ctas) {
      tl.fromTo(ctas, { y: 22, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.85 }, 0.58);
    }
    if (metrics) {
      tl.fromTo(metrics, { y: 18, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.9 }, 0.72);
    }
    if (scanner) {
      tl.fromTo(scanner, { x: 44, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 1.1 }, 0.4);
    }

    /* Still-photo parallax under the live scene */
    var bg = hero && hero.querySelector(".hero__bg");
    if (bg) {
      gsap.to(bg, {
        yPercent: 9,
        ease: "none",
        scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true }
      });
    }

    /* Section reveals */
    var revealEls = document.querySelectorAll("[data-reveal]");
    for (var i = 0; i < revealEls.length; i++) {
      (function (el) {
        var isClip = el.getAttribute("data-reveal") === "clip";
        var fromVars = isClip
          ? { clipPath: "inset(0 0 100% 0)", y: 26, autoAlpha: 0.001 }
          : { y: 34, autoAlpha: 0 };
        var toVars = isClip
          ? { clipPath: "inset(0 0 0% 0)", y: 0, autoAlpha: 1 }
          : { y: 0, autoAlpha: 1 };
        toVars.duration = 1.05;
        toVars.ease = "power3.out";
        toVars.scrollTrigger = { trigger: el, start: "top 88%", once: true };
        gsap.fromTo(el, fromVars, toVars);
      })(revealEls[i]);
    }
  }

  /* ------------------------------------------------- Night-highway 3D scene */
  function initHeroScene() {
    var canvas = document.getElementById("heroCanvas");
    if (!canvas || !hero || !window.THREE) {
      if (hero) hero.classList.add("hero--static");
      return;
    }

    var THREE = window.THREE;
    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: false,
        powerPreference: "high-performance"
      });
    } catch (err) {
      hero.classList.add("hero--static");
      return;
    }

    var isSmall = Math.min(window.innerWidth, window.innerHeight) < 640;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isSmall ? 1.25 : 1.5));
    renderer.setClearColor(0x04060a, 1);

    var scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x04060a, 0.042);

    var camera = new THREE.PerspectiveCamera(55, 1, 0.1, 140);
    camera.position.set(0, 1.7, 8);

    /* --- Road surface: canvas-textured asphalt with lane paint --- */
    function makeRoadTexture() {
      var c = document.createElement("canvas");
      c.width = 256;
      c.height = 256;
      var g = c.getContext("2d");
      g.fillStyle = "#0a0d11";
      g.fillRect(0, 0, 256, 256);
      /* asphalt speckle */
      for (var i = 0; i < 900; i++) {
        var a = Math.random() * 0.05;
        g.fillStyle = "rgba(160,180,200," + a.toFixed(3) + ")";
        g.fillRect(Math.random() * 256, Math.random() * 256, 1.4, 1.4);
      }
      /* steel edge lines */
      g.fillStyle = "rgba(159,180,200,0.55)";
      g.fillRect(10, 0, 3, 256);
      g.fillRect(243, 0, 3, 256);
      /* worn amber centre dashes */
      g.fillStyle = "rgba(216,178,90,0.6)";
      g.fillRect(126, 8, 4, 84);
      g.fillRect(126, 164, 4, 84);
      var tex = new THREE.CanvasTexture(c);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(1, 7);
      return tex;
    }

    var roadTex = makeRoadTexture();
    var road = new THREE.Mesh(
      new THREE.PlaneGeometry(13, 96),
      new THREE.MeshBasicMaterial({ map: roadTex })
    );
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0, -40);
    scene.add(road);

    /* Guardrails: two cold steel lines receding into the fog */
    var railMat = new THREE.MeshBasicMaterial({ color: 0x2c4258 });
    [-6.6, 6.6].forEach(function (x) {
      var rail = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 96), railMat);
      rail.position.set(x, 0.55, -40);
      scene.add(rail);
    });

    /* Sodium streetlight glows along both verges */
    function makeGlowTexture() {
      var c = document.createElement("canvas");
      c.width = 128;
      c.height = 128;
      var g = c.getContext("2d");
      var grad = g.createRadialGradient(64, 64, 2, 64, 64, 64);
      grad.addColorStop(0, "rgba(255,196,110,0.85)");
      grad.addColorStop(0.35, "rgba(245,158,11,0.28)");
      grad.addColorStop(1, "rgba(245,158,11,0)");
      g.fillStyle = grad;
      g.fillRect(0, 0, 128, 128);
      return new THREE.CanvasTexture(c);
    }
    var glowTex = makeGlowTexture();
    var glowMat = new THREE.SpriteMaterial({
      map: glowTex,
      transparent: true,
      opacity: 0.62,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    for (var gz = -4; gz >= -52; gz -= 8) {
      [-6.3, 6.3].forEach(function (x) {
        var s = new THREE.Sprite(glowMat);
        s.position.set(x, 3.3, gz);
        s.scale.set(2.4, 2.4, 1);
        scene.add(s);
      });
    }

    /* --- Light streaks: oncoming headlights + departing taillights --- */
    var streaks = [];
    var streakCount = isSmall ? 38 : 64;
    var headlightCols = [0xfff3d6, 0xffe9c4, 0xffc37a];
    for (var si = 0; si < streakCount; si++) {
      var oncoming = si % 2 === 0;
      var len = 1.4 + Math.random() * 2.4;
      var mat = new THREE.MeshBasicMaterial({
        color: oncoming
          ? headlightCols[si % headlightCols.length]
          : 0xff4440,
        transparent: true,
        opacity: oncoming ? 0.9 : 0.7,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      var m = new THREE.Mesh(new THREE.PlaneGeometry(0.07, len), mat);
      m.rotation.x = -Math.PI / 2;
      var baseX = oncoming
        ? (si % 4 === 0 ? -3.4 : -1.7)
        : (si % 4 === 1 ? 1.7 : 3.4);
      m.position.set(baseX, oncoming ? 0.55 : 0.62, -Math.random() * 58 + 4);
      scene.add(m);
      streaks.push({
        mesh: m,
        baseX: baseX,
        oncoming: oncoming,
        speed: oncoming ? 13 + Math.random() * 9 : 3 + Math.random() * 3
      });
    }

    /* --- Steel-blue atmosphere dust --- */
    var dustCount = isSmall ? 130 : 260;
    var dustPos = new Float32Array(dustCount * 3);
    for (var di = 0; di < dustCount; di++) {
      dustPos[di * 3] = (Math.random() - 0.5) * 17;
      dustPos[di * 3 + 1] = 0.2 + Math.random() * 3.8;
      dustPos[di * 3 + 2] = -Math.random() * 56 + 6;
    }
    var dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
    var dust = new THREE.Points(
      dustGeo,
      new THREE.PointsMaterial({
        color: 0x8fa8bf,
        size: 0.05,
        transparent: true,
        opacity: 0.45,
        depthWrite: false
      })
    );
    scene.add(dust);

    /* --- The demo plate, floating roadside with OBB corner locks --- */
    var plateGroup = new THREE.Group();
    plateGroup.position.set(5.4, 5.6, -6);
    plateGroup.rotation.y = -0.35;
    scene.add(plateGroup);

    var plateCanvas = document.createElement("canvas");
    plateCanvas.width = 512;
    plateCanvas.height = 144;
    var pctx = plateCanvas.getContext("2d");
    pctx.fillStyle = "#f4f6f8";
    pctx.fillRect(0, 0, 512, 144);
    pctx.strokeStyle = "#090b0e";
    pctx.lineWidth = 10;
    pctx.strokeRect(8, 8, 496, 128);
    pctx.fillStyle = "#090b0e";
    pctx.font = "700 84px 'JetBrains Mono', monospace";
    pctx.textAlign = "center";
    pctx.textBaseline = "middle";
    pctx.fillText("51G-888.99", 256, 76);

    var plate = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 0.67),
      new THREE.MeshBasicMaterial({
        map: new THREE.CanvasTexture(plateCanvas),
        transparent: true,
        opacity: 0.92
      })
    );
    plateGroup.add(plate);

    var bw = 2.56;
    var bh = 0.83;
    var cl = 0.26;
    var bv = new Float32Array([
      -bw / 2, bh / 2 - cl, 0, -bw / 2, bh / 2, 0,
      -bw / 2, bh / 2, 0, -bw / 2 + cl, bh / 2, 0,
      bw / 2 - cl, bh / 2, 0, bw / 2, bh / 2, 0,
      bw / 2, bh / 2, 0, bw / 2, bh / 2 - cl, 0,
      bw / 2, -bh / 2 + cl, 0, bw / 2, -bh / 2, 0,
      bw / 2, -bh / 2, 0, bw / 2 - cl, -bh / 2, 0,
      -bw / 2 + cl, -bh / 2, 0, -bw / 2, -bh / 2, 0,
      -bw / 2, -bh / 2, 0, -bw / 2, -bh / 2 + cl, 0
    ]);
    var bracketGeo = new THREE.BufferGeometry();
    bracketGeo.setAttribute("position", new THREE.BufferAttribute(bv, 3));
    var bracketMat = new THREE.LineBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.6
    });
    var brackets = new THREE.LineSegments(bracketGeo, bracketMat);
    brackets.position.z = 0.02;
    plateGroup.add(brackets);

    /* --- Emerald scan plane sweeping down the highway --- */
    var scanGroup = new THREE.Group();
    var scanSheet = new THREE.Mesh(
      new THREE.PlaneGeometry(12.6, 3.4),
      new THREE.MeshBasicMaterial({
        color: 0x10b981,
        transparent: true,
        opacity: 0.05,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    );
    scanSheet.position.y = 1.7;
    scanGroup.add(scanSheet);
    var scanEdge = new THREE.Mesh(
      new THREE.PlaneGeometry(12.6, 0.045),
      new THREE.MeshBasicMaterial({
        color: 0x10b981,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    );
    scanEdge.position.y = 0.02;
    scanGroup.add(scanEdge);
    scanGroup.position.z = -46;
    scene.add(scanGroup);

    /* --- Interaction wiring --- */
    var pointerX = 0;
    var pointerY = 0;
    hero.addEventListener("pointermove", function (e) {
      var r = hero.getBoundingClientRect();
      pointerX = ((e.clientX - r.left) / Math.max(1, r.width) - 0.5) * 2;
      pointerY = ((e.clientY - r.top) / Math.max(1, r.height) - 0.5) * 2;
    });

    var primaryCta = hero.querySelector(".cta-row .btn-emerald");
    if (primaryCta) {
      primaryCta.addEventListener("pointerenter", function () { cine.ctaTarget = 1; });
      primaryCta.addEventListener("pointerleave", function () { cine.ctaTarget = 0; });
      primaryCta.addEventListener("focus", function () { cine.ctaTarget = 1; });
      primaryCta.addEventListener("blur", function () { cine.ctaTarget = 0; });
    }

    window.addEventListener(
      "scroll",
      function () {
        var h = hero.offsetHeight || window.innerHeight;
        cine.scroll = Math.min(1, Math.max(0, window.scrollY / h));
      },
      { passive: true }
    );

    function resize() {
      var w = hero.clientWidth || window.innerWidth;
      var h = hero.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    }
    resize();
    window.addEventListener("resize", resize);

    var heroVisible = true;
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(
        function (entries) {
          heroVisible = entries[0].isIntersecting;
        },
        { threshold: 0.02 }
      ).observe(hero);
    }

    hero.classList.add("has-live-scene");
    canvas.classList.add("is-live");

    var clock = new THREE.Clock();
    var scanPhase = 0;
    var rafId = 0;
    var disposed = false;

    function easeInOut(p) {
      return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    }

    function animate() {
      rafId = requestAnimationFrame(animate);
      if (!heroVisible || document.hidden) return;
      var dt = Math.min(clock.getDelta(), 0.05);
      var t = clock.elapsedTime;

      /* CTA coupling: hover gathers streaks and holds the scan sweep */
      cine.ctaHover += (cine.ctaTarget - cine.ctaHover) * 0.055;
      var g = cine.ctaHover;

      /* Forward drift of the road paint */
      roadTex.offset.y -= dt * (1.15 - 0.45 * g);

      /* Streaks stream; on CTA hover they converge toward the plate lane */
      for (var i = 0; i < streaks.length; i++) {
        var s = streaks[i];
        var sp = s.speed * (1 - 0.45 * g);
        if (s.oncoming) {
          s.mesh.position.z += sp * dt;
          if (s.mesh.position.z > 9) {
            s.mesh.position.z = -52 - Math.random() * 8;
          }
        } else {
          s.mesh.position.z -= sp * dt;
          if (s.mesh.position.z < -58) {
            s.mesh.position.z = 5 + Math.random() * 4;
          }
        }
        var targetX = s.baseX * (1 - 0.34 * g);
        s.mesh.position.x += (targetX - s.mesh.position.x) * 0.06;
      }

      /* Atmosphere drift */
      dust.position.z += dt * 0.55;
      if (dust.position.z > 3) dust.position.z = 0;

      /* Scan sweep: a slow pass down the road, stalling while CTA is held */
      scanPhase += (dt / 7.5) * (1 - 0.68 * g);
      if (scanPhase > 1) scanPhase -= 1;
      var eased = easeInOut(scanPhase);
      scanGroup.position.z = -46 + eased * 52;
      var scanGlow = Math.sin(scanPhase * Math.PI);
      scanSheet.material.opacity = scanGlow * (0.05 + 0.075 * g);
      scanEdge.material.opacity = scanGlow * (0.4 + 0.45 * g);

      /* Plate: gentle float; brackets flare as the scan plane passes */
      plateGroup.position.y = 5.6 + Math.sin(t * 0.8) * 0.07;
      plateGroup.rotation.z = Math.sin(t * 0.5) * 0.02;
      var dz = Math.abs(scanGroup.position.z - plateGroup.position.z);
      var flare = Math.max(0, 1 - dz / 5);
      bracketMat.opacity = 0.55 + flare * 0.45;

      /* Camera: pointer dolly + scroll push-in */
      var camTX = pointerX * 0.7;
      var camTY = 1.7 - pointerY * 0.35 - cine.scroll * 0.25;
      camera.position.x += (camTX - camera.position.x) * 0.045;
      camera.position.y += (camTY - camera.position.y) * 0.045;
      camera.position.z = 8 - cine.scroll * 2.1;
      camera.lookAt(pointerX * 0.35, 1.05, -10);

      renderer.render(scene, camera);
    }
    animate();

    window.addEventListener("pagehide", function () {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(rafId);
      renderer.dispose();
    });
  }

  /* ------------------------------------------------------------------- boot */
  document.addEventListener("DOMContentLoaded", function () {
    if (reducedMotion) {
      if (hero) hero.classList.add("hero--static");
      return;
    }
    initLenis();
    initReveals();
    initHeroScene();
  });
})();
