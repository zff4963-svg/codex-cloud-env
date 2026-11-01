(function () {
  "use strict";

  const root = document.documentElement;
  const burger = document.getElementById("burger");
  const nav = document.getElementById("nav");
  const themeToggle = document.getElementById("themeToggle");
  const spot = document.getElementById("spot");
  const storageKey = "xinghuo-theme";

  function setTheme(theme) {
    root.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(storageKey, theme);
    } catch (_) {
      /* ignore */
    }
  }

  function initTheme() {
    let saved = null;
    try {
      saved = localStorage.getItem(storageKey);
    } catch (_) {
      /* ignore */
    }
    if (saved === "light" || saved === "dark") {
      setTheme(saved);
      return;
    }
    const prefersDark =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    setTheme(prefersDark ? "dark" : "light");
  }

  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      const next =
        root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      setTheme(next);
    });
  }

  initTheme();

  function closeNav() {
    if (!nav || !burger) return;
    nav.classList.remove("is-open");
    burger.setAttribute("aria-expanded", "false");
    burger.setAttribute("aria-label", "打开菜单");
  }

  function toggleNav() {
    if (!nav || !burger) return;
    const open = !nav.classList.contains("is-open");
    nav.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", open ? "true" : "false");
    burger.setAttribute("aria-label", open ? "关闭菜单" : "打开菜单");
  }

  if (burger) {
    burger.addEventListener("click", toggleNav);
  }

  if (nav) {
    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", closeNav);
    });
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeNav();
  });

  /* Reveal on scroll */
  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    reveals.forEach(function (el) {
      io.observe(el);
    });
  } else {
    reveals.forEach(function (el) {
      el.classList.add("is-visible");
    });
  }

  /* Optional pointer spot glow */
  const reduceMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (spot && !reduceMotion && window.matchMedia("(pointer: fine)").matches) {
    let raf = 0;
    let x = 0;
    let y = 0;

    document.body.classList.add("has-spot");

    window.addEventListener(
      "pointermove",
      function (e) {
        x = e.clientX;
        y = e.clientY;
        if (!raf) {
          raf = requestAnimationFrame(function () {
            spot.style.left = x + "px";
            spot.style.top = y + "px";
            raf = 0;
          });
        }
      },
      { passive: true }
    );
  }
})();
