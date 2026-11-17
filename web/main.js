(function () {
  /* Mobile nav */
  var toggle = document.querySelector(".nav-toggle");
  var menu = document.getElementById("nav-menu");
  if (toggle && menu) {
    toggle.addEventListener("click", function () {
      var open = menu.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    menu.addEventListener("click", function (e) {
      if (e.target.closest("a")) {
        menu.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* Scroll reveal */
  var nodes = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) {
    nodes.forEach(function (n) { n.classList.add("in"); });
  } else {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );
    nodes.forEach(function (n) { io.observe(n); });
  }

  /* OCR readout typewriter (hero visual only) */
  var ocr = document.querySelector("[data-typewriter]");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (ocr && !reduceMotion) {
    var full = ocr.getAttribute("data-typewriter");
    var i = 0;
    var deleting = false;
    function tick() {
      if (!deleting) {
        i++;
        ocr.textContent = full.slice(0, i);
        if (i === full.length) {
          deleting = true;
          return setTimeout(tick, 2600);
        }
        return setTimeout(tick, 95);
      }
      i--;
      ocr.textContent = full.slice(0, i);
      if (i === 0) {
        deleting = false;
        return setTimeout(tick, 500);
      }
      setTimeout(tick, 40);
    }
    ocr.textContent = "";
    setTimeout(tick, 700);
  }
})();
