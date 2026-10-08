/* Sloosh homepage directions: shared behaviours (no UI is built here).
   - click sounds (Web Audio, synthesized; no toggle in the nav)
   - every video stays muted (no audio ever autoplays)
   - theme toggle (sun while dark, moon while light; key sl-theme)
   - logo pupils follow the pointer (sloosh-logo.tsx values)
   - titles and card rows arrive when they scroll in (.in)
   - card videos play on hover; data-autoplay videos play while in view
   - rail arrows scroll their rail
   - [data-drag] objects follow the pointer and spring back home on release (a click stays a click) */
(function () {
  "use strict";
  var doc = document, root = doc.documentElement;
  var RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  /* ---------- theme ---------- */
  var t = store("sl-theme");
  if (t === "light" || t === "dark") root.setAttribute("data-theme", t);

  /* ---------- sound ---------- */
  var ctx = null, off = store("sl-sound") === "off";
  if (off) root.setAttribute("data-snd-off", "");
  function ac() {
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  function tone(c, f0, f1, dur, vol, type, when) {
    var o = c.createOscillator(), g = c.createGain(), t0 = c.currentTime + (when || 0);
    o.type = type || "sine"; o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(c.destination); o.start(t0); o.stop(t0 + dur + 0.02);
  }
  function noise(c, dur, vol, freq) {
    var n = Math.floor(c.sampleRate * dur), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
    var s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    f.type = "bandpass"; f.frequency.value = freq || 2400; f.Q.value = 1.2; g.gain.value = vol;
    s.buffer = b; s.connect(f); f.connect(g); g.connect(c.destination); s.start();
  }
  var SOUNDS = {
    tap: function (c) { noise(c, 0.03, 0.18, 3200); tone(c, 1400, 900, 0.05, 0.05, "triangle"); },
    key: function (c) { noise(c, 0.045, 0.28, 1800); tone(c, 420, 180, 0.09, 0.12, "sine"); },
    pop: function (c) { tone(c, 520, 1240, 0.12, 0.08, "sine"); },
    tick: function (c) { tone(c, 1800, 1600, 0.035, 0.05, "square"); },
    whoosh: function (c) { noise(c, 0.22, 0.08, 900); },
    reward: function (c) { [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) { tone(c, f, f * 1.002, 0.32, 0.07, "triangle", i * 0.07); }); }
  };
  function snd(kind) { if (off) return; var c = ac(); if (c && SOUNDS[kind]) SOUNDS[kind](c); }
  window.slSound = snd;

  doc.addEventListener("pointerdown", function (e) {
    var el = e.target.closest && e.target.closest("[data-snd], .key, .nl, .chip, .seg button, .mrow, .prow");
    if (!el) return;
    var k = el.getAttribute("data-snd") || (el.classList.contains("pri") || el.classList.contains("ink") ? "key" : "tap");
    if (k !== "none") snd(k);
  }, true);

  doc.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("[data-act]");
    if (a) {
      var act = a.getAttribute("data-act");
      if (act === "theme") {
        var next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
        root.setAttribute("data-theme", next); store("sl-theme", next);
      } else if (act === "rail") {
        var r = doc.getElementById(a.getAttribute("data-target"));
        if (r) r.scrollBy({ left: (+a.getAttribute("data-dir") || 1) * r.clientWidth * 0.8, behavior: RM ? "auto" : "smooth" });
      }
    }
    var dead = e.target.closest && e.target.closest('a[href="#"]');
    if (dead) e.preventDefault();
  });

  /* ---------- logo pupils ---------- */
  var EYES = [{ cx: 617.3, cy: 232.6 }, { cx: 914, cy: 232.6 }], TRAVEL = { x: 63, y: 130 }, REACH = 420, VB = { w: 1603, h: 714 };
  var ptr = null, raf = 0;
  function aim() {
    raf = 0; if (!ptr) return;
    doc.querySelectorAll("svg[data-eyes]").forEach(function (svg) {
      var box = svg.getBoundingClientRect(); if (!box.width) return;
      var vb = svg.viewBox && svg.viewBox.baseVal && svg.viewBox.baseVal.width ? svg.viewBox.baseVal : { x: 0, y: 0, width: VB.w, height: VB.h };
      var s = Math.min(box.width / vb.width, box.height / vb.height), left = box.left + (box.width - vb.width * s) / 2 - vb.x * s, top = box.top + (box.height - vb.height * s) / 2 - vb.y * s;
      svg.querySelectorAll(".lg-pupil").forEach(function (p, i) {
        var e = EYES[i] || EYES[0], dx = ptr.x - (left + e.cx * s), dy = ptr.y - (top + e.cy * s), d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / REACH);
        var gx = (dx / d) * k * TRAVEL.x, gy = (dy / d) * k * TRAVEL.y;
        var cur = p._at || { x: -35, y: -4 };
        cur.x += (gx - cur.x) * 0.22; cur.y += (gy - cur.y) * 0.22; p._at = cur;
        p.setAttribute("transform", "translate(" + cur.x.toFixed(1) + " " + cur.y.toFixed(1) + ")");
        if (Math.abs(gx - cur.x) > 0.5 || Math.abs(gy - cur.y) > 0.5) raf = raf || requestAnimationFrame(aim);
      });
    });
  }
  if (!RM) window.addEventListener("pointermove", function (e) { ptr = { x: e.clientX, y: e.clientY }; if (!raf) raf = requestAnimationFrame(aim); }, { passive: true });

  /* ---------- arrivals + autoplay ---------- */
  var io = "IntersectionObserver" in window ? new IntersectionObserver(function (es) {
    es.forEach(function (en) {
      var el = en.target;
      if (el.tagName === "VIDEO") { if (en.isIntersecting) { el.muted = true; var p = el.play(); if (p && p.catch) p.catch(function () {}); } else el.pause(); return; }
      if (en.isIntersecting) { el.classList.add("in"); io.unobserve(el); }
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }) : null;
  function scan() {
    doc.querySelectorAll(".lt:not([data-seen]), [data-rise]:not([data-seen])").forEach(function (el) {
      el.setAttribute("data-seen", ""); if (io && !RM) io.observe(el); else el.classList.add("in");
    });
    doc.querySelectorAll("video:not([data-seen])").forEach(function (v) {
      v.setAttribute("data-seen", ""); v.muted = true; v.defaultMuted = true; v.playsInline = true; v.loop = true;
      if (v.hasAttribute("data-autoplay") && io && !RM) io.observe(v);
    });
  }
  /* videos never make sound: re-mute on any play or volume change */
  function hush(e) { var v = e.target; if (v && v.tagName === "VIDEO" && !v.muted) v.muted = true; }
  doc.addEventListener("play", hush, true); doc.addEventListener("volumechange", hush, true);
  var mo = new MutationObserver(function () { clearTimeout(mo._t); mo._t = setTimeout(scan, 60); });
  function boot() { scan(); mo.observe(doc.body, { childList: true, subtree: true }); }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", boot); else boot();


  /* ---------- drag to play: [data-drag] follows the pointer, springs home on release ---------- */
  var SPRING = "linear(0, 0.0138, 0.0478, 0.0981, 0.1565, 0.2208, 0.2902, 0.3578, 0.4241, 0.49, 0.5502, 0.6063, 0.6598, 0.7068, 0.7492, 0.7885, 0.8221, 0.8526, 0.8783, 0.9006, 0.9204, 0.9367, 0.9505, 0.9624, 0.972, 0.9799, 0.9865, 0.9916, 0.9957, 0.9989, 1.0013, 1.0031, 1.0044, 1.0052, 1.0057, 1.006, 1.006, 1.0059, 1.0056, 1.0053, 1.005, 1.0046, 1.0042, 1.0037, 1.0033, 1.003, 1.0026, 1.0023, 1)"; /* card spring: settles with a barely-there overshoot */
  var drag = null, springs = 0, looping = false;
  function tick() {
    if (!drag && springs <= 0) { looping = false; doc.dispatchEvent(new CustomEvent("sl-dragframe")); return; }
    doc.dispatchEvent(new CustomEvent("sl-dragframe"));
    requestAnimationFrame(tick);
  }
  function loop() { if (!looping) { looping = true; requestAnimationFrame(tick); } }
  doc.addEventListener("pointerdown", function (e) {
    if (e.button !== 0 || e.pointerType === "touch") return;
    var el = e.target.closest && e.target.closest("[data-drag]"); if (!el) return;
    if (e.target.closest("input, textarea, select, [data-nodrag]")) return;
    var at = { x: 0, y: 0 };
    if (el._spring) { var m = new DOMMatrixReadOnly(getComputedStyle(el).transform); at = { x: m.m41, y: m.m42 }; el._spring.cancel(); }
    drag = { el: el, x0: e.clientX - at.x, y0: e.clientY - at.y, sx: e.clientX, sy: e.clientY, lx: e.clientX, vx: 0, moved: false, id: e.pointerId };
  }, true);
  doc.addEventListener("pointermove", function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.moved) {
      if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 6) return;
      drag.moved = true; drag.el.setAttribute("data-dragging", ""); root.classList.add("is-dragging");
      var sel = window.getSelection && window.getSelection(); if (sel && sel.removeAllRanges) sel.removeAllRanges();
    }
    drag.vx = drag.vx * 0.75 + (e.clientX - drag.lx) * 0.25; drag.lx = e.clientX;
    var r = Math.max(-5, Math.min(5, drag.vx * 0.5));
    drag.el.style.transform = "translate(" + (e.clientX - drag.x0).toFixed(1) + "px, " + (e.clientY - drag.y0).toFixed(1) + "px) rotate(" + r.toFixed(2) + "deg) scale(1.02)";
    loop();
  }, true);
  function release(e) {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    var d = drag; drag = null;
    if (!d.moved) return;
    var el = d.el, from = el.style.transform;
    el.removeAttribute("data-dragging"); root.classList.remove("is-dragging");
    el._dragEnd = performance.now();
    el.style.transform = "";
    el.setAttribute("data-spring", "");
    var a = el.animate([{ transform: from }, { transform: "none" }], { duration: RM ? 1 : 560, easing: SPRING });
    el._spring = a; springs++;
    var done = function () { springs--; if (el._spring === a) { el._spring = null; el.removeAttribute("data-spring"); } };
    a.onfinish = done; a.oncancel = done;
    snd("pop"); loop();
  }
  doc.addEventListener("pointerup", release, true);
  doc.addEventListener("pointercancel", release, true);
  doc.addEventListener("click", function (e) {
    var el = e.target.closest && e.target.closest("[data-drag]");
    if (el && el._dragEnd && performance.now() - el._dragEnd < 400) { e.preventDefault(); e.stopPropagation(); }
  }, true);
  doc.addEventListener("dragstart", function (e) { if (e.target.closest && e.target.closest("[data-drag]")) e.preventDefault(); }, true);

  /* ---------- a row plays its preview (data-play names the preview's class) ---------- */
  doc.addEventListener("pointerover", function (e) {
    var r = e.target.closest && e.target.closest("[data-play]"); if (!r || r._pv) return;
    var box = r.closest("section") || doc, pv = box.querySelector("." + r.getAttribute("data-play")); if (!pv) return;
    box.querySelectorAll(".pv video").forEach(function (v) { if (!pv.contains(v)) v.pause(); });
    var v = pv.querySelector("video"); if (v) { v.muted = true; var p = v.play(); if (p && p.catch) p.catch(function () {}); }
  });

  /* ---------- hover video ---------- */
  doc.addEventListener("pointerover", function (e) {
    var c = e.target.closest && e.target.closest(".mc, [data-hoverplay]"); if (!c || c._on) return;
    var v = c.querySelector("video:not([data-autoplay])"); if (!v) return;
    c._on = true; v.muted = true; var p = v.play(); if (p && p.then) p.then(function () { if (c._on) c.setAttribute("data-playing", ""); }).catch(function () {});
  });
  doc.addEventListener("pointerout", function (e) {
    var c = e.target.closest && e.target.closest(".mc, [data-hoverplay]"); if (!c || !c._on) return;
    if (e.relatedTarget && c.contains(e.relatedTarget)) return;
    c._on = false; c.removeAttribute("data-playing"); var v = c.querySelector("video:not([data-autoplay])"); if (v) v.pause();
  });
})();
