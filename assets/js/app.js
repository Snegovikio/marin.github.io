(function () {
  "use strict";

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var audioStash = {};

  var store = {
    get: function (k, d) {
      try {
        var v = localStorage.getItem("marin-" + k);
        return v === null ? d : JSON.parse(v);
      } catch (e) { return d; }
    },
    set: function (k, v) {
      try { localStorage.setItem("marin-" + k, JSON.stringify(v)); } catch (e) {}
    },
    del: function (k) {
      try { localStorage.removeItem("marin-" + k); } catch (e) {}
    }
  };

  function toast(msg, ms) {
    var t = $("#toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("is-on");
    clearTimeout(t._timer);
    t._timer = setTimeout(function () { t.classList.remove("is-on"); }, ms || 2600);
  }

  /* ------------------------------ THEME ------------------------------ */

  function initTheme() {
    var btn = $("#themeBtn");
    var meta = $('meta[name="theme-color"]');
    function apply(mode) {
      document.documentElement.setAttribute("data-theme", mode);
      store.set("theme", mode);
      if (meta) meta.setAttribute("content", mode === "light" ? "#fff6fa" : "#140a12");
      if (btn) btn.setAttribute("aria-label", mode === "light" ? "Включить тёмную тему" : "Включить светлую тему");
    }
    if (btn) {
      btn.addEventListener("click", function () {
        var cur = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
        apply(cur === "light" ? "dark" : "light");
      });
    }
    apply(document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark");
  }

  /* ------------------------------ HEARTS CANVAS ------------------------------ */

  function initHearts() {
    var cv = $("#hearts");
    if (!cv || reduceMotion) return;
    var ctx = cv.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var hearts = [];
    var W = 0, H = 0;

    function resize() {
      W = cv.clientWidth;
      H = cv.clientHeight;
      cv.width = W * dpr;
      cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function spawn(initial) {
      var big = Math.random() < 0.12;
      hearts.push({
        x: Math.random() * W,
        y: initial ? Math.random() * H : H + 30,
        s: big ? 16 + Math.random() * 20 : 5 + Math.random() * 9,
        vy: big ? 0.22 + Math.random() * 0.28 : 0.35 + Math.random() * 0.6,
        sway: 12 + Math.random() * 30,
        phase: Math.random() * Math.PI * 2,
        speed: 0.006 + Math.random() * 0.014,
        rot: (Math.random() - 0.5) * 0.5,
        a: big ? 0.1 + Math.random() * 0.16 : 0.18 + Math.random() * 0.42
      });
    }

    function heartPath(x, y, s) {
      ctx.beginPath();
      ctx.moveTo(x, y + s * 0.32);
      ctx.bezierCurveTo(x - s, y - s * 0.2, x - s * 0.5, y - s * 0.9, x, y - s * 0.34);
      ctx.bezierCurveTo(x + s * 0.5, y - s * 0.9, x + s, y - s * 0.2, x, y + s * 0.32);
      ctx.fill();
    }

    function frame() {
      ctx.clearRect(0, 0, W, H);
      var style = getComputedStyle(document.documentElement);
      var c1 = style.getPropertyValue("--pink-500").trim() || "#ff5a9c";
      var c2 = style.getPropertyValue("--pink-300").trim() || "#ffb0d0";
      for (var i = 0; i < hearts.length; i++) {
        var h = hearts[i];
        h.y -= h.vy;
        h.phase += h.speed;
        var x = h.x + Math.sin(h.phase) * h.sway;
        var g = ctx.createLinearGradient(x - h.s, h.y - h.s, x + h.s, h.y + h.s);
        g.addColorStop(0, c1);
        g.addColorStop(1, c2);
        ctx.fillStyle = g;
        ctx.globalAlpha = h.a;
        ctx.save();
        ctx.translate(x, h.y);
        ctx.rotate(Math.sin(h.phase * 0.6) * h.rot);
        heartPath(0, 0, h.s);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      for (var j = hearts.length - 1; j >= 0; j--) {
        if (hearts[j].y < -40) hearts.splice(j, 1);
      }
      while (hearts.length < 34) spawn(false);
      requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener("resize", resize);
    for (var i = 0; i < 22; i++) spawn(true);
    frame();
  }

  /* ------------------------------ CURSOR GLOW ------------------------------ */

  function initCursor() {
    var el = $("#cursorGlow");
    if (!el || reduceMotion) return;
    var x = 0, y = 0, tx = 0, ty = 0, on = false;
    window.addEventListener("mousemove", function (e) {
      tx = e.clientX; ty = e.clientY;
      if (!on) { on = true; x = tx; y = ty; el.classList.add("is-on"); }
    });
    window.addEventListener("mouseleave", function () { el.classList.remove("is-on"); });
    (function loop() {
      x += (tx - x) * 0.12;
      y += (ty - y) * 0.12;
      el.style.transform = "translate3d(" + x + "px," + y + "px,0)";
      requestAnimationFrame(loop);
    })();
  }

  /* ------------------------------ REVEAL + COUNTERS ------------------------------ */

  function initReveal() {
    var items = $$(".reveal");
    if (!("IntersectionObserver" in window) || reduceMotion) {
      items.forEach(function (el) { el.classList.add("is-in"); });
      $$("[data-count]").forEach(function (el) { el.textContent = el.dataset.count; });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    items.forEach(function (el) {
      el.style.setProperty("--d", el.dataset.delay || 0);
      io.observe(el);
    });

    var counters = $$("[data-count]");
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        cio.unobserve(el);
        var target = parseInt(el.dataset.count, 10);
        var start = performance.now();
        var dur = 1400;
        (function step(now) {
          var p = Math.min((now - start) / dur, 1);
          var eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(target * eased);
          if (p < 1) requestAnimationFrame(step);
        })(start);
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { cio.observe(el); });
  }

  /* ------------------------------ TILT + SPOTLIGHT ------------------------------ */

  function initTilt() {
    var frame = $("[data-tilt]");
    if (!frame || reduceMotion) return;
    if (window.matchMedia("(hover: none)").matches) return;
    frame.addEventListener("mousemove", function (e) {
      var r = frame.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5;
      var py = (e.clientY - r.top) / r.height - 0.5;
      frame.style.transform = "rotateY(" + px * 14 + "deg) rotateX(" + -py * 14 + "deg) translateZ(0)";
    });
    frame.addEventListener("mouseleave", function () { frame.style.transform = ""; });
  }

  function initSpotlight() {
    if (reduceMotion || window.matchMedia("(hover: none)").matches) return;
    $$(".card").forEach(function (card) {
      card.addEventListener("mousemove", function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty("--mx", ((e.clientX - r.left) / r.width) * 100 + "%");
        card.style.setProperty("--my", ((e.clientY - r.top) / r.height) * 100 + "%");
      });
    });
  }

  /* ------------------------------ NAV ------------------------------ */

  function initNav() {
    var bar = $("#topbar");
    var burger = $("#burger");
    var nav = $(".topbar__nav");
    var ticking = false;

    window.addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        if (bar) bar.classList.toggle("is-stuck", window.scrollY > 24);
        ticking = false;
      });
    }, { passive: true });

    if (burger && nav) {
      burger.addEventListener("click", function () {
        var open = nav.classList.toggle("is-open");
        burger.setAttribute("aria-expanded", open ? "true" : "false");
      });
      nav.addEventListener("click", function (e) {
        if (e.target.tagName === "A") {
          nav.classList.remove("is-open");
          burger.setAttribute("aria-expanded", "false");
        }
      });
    }

    var sections = $$("main section[id]");
    var links = $$(".topbar__nav a");
    if ("IntersectionObserver" in window) {
      var sio = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          links.forEach(function (l) {
            l.style.color = l.getAttribute("href") === "#" + e.target.id ? "var(--fg)" : "";
          });
        });
      }, { rootMargin: "-45% 0px -50% 0px" });
      sections.forEach(function (s) { sio.observe(s); });
    }
  }

  /* ------------------------------ QUOTES ------------------------------ */

  function initQuotes() {
    var list = (window.QUOTES || []).slice();
    if (!list.length) return;
    var text = $("#quoteText");
    var author = $("#quoteAuthor");
    var dots = $("#quoteDots");
    if (!text || !author || !dots) return;
    var i = 0;
    var timer = null;

    list.forEach(function (_, n) {
      var b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-label", "Цитата " + (n + 1));
      b.addEventListener("click", function () { go(n); restart(); });
      dots.appendChild(b);
    });

    function paint() {
      text.textContent = list[i].text;
      author.textContent = "— " + list[i].author;
      $$("button", dots).forEach(function (b, n) {
        b.classList.toggle("is-active", n === i);
      });
    }

    function go(n) {
      text.classList.add("is-swap");
      setTimeout(function () {
        i = (n + list.length) % list.length;
        paint();
        text.classList.remove("is-swap");
      }, 380);
    }

    function restart() {
      clearInterval(timer);
      timer = setInterval(function () { go(i + 1); }, 6500);
    }

    paint();
    if (!reduceMotion) restart();
  }

  /* ------------------------------ INDEXEDDB (user art + audio) ------------------------------ */

  var DB_NAME = "marin-stash";
  var DB_STORE = "blobs";
  var dbPromise = null;

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      if (!window.indexedDB) return reject(new Error("no-idb"));
      var req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(DB_STORE)) {
          db.createObjectStore(DB_STORE, { keyPath: "id" });
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
    return dbPromise;
  }

  function idbAll() {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(DB_STORE, "readonly");
        var req = tx.objectStore(DB_STORE).getAll();
        req.onsuccess = function () { resolve(req.result || []); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  function idbPut(record) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(DB_STORE, "readwrite");
        tx.objectStore(DB_STORE).put(record);
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }

  function idbDel(id) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(DB_STORE, "readwrite");
        tx.objectStore(DB_STORE).delete(id);
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }

  function idbClear() {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(DB_STORE, "readwrite");
        tx.objectStore(DB_STORE).clear();
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }

  var objectUrls = [];

  function urlFor(rec) {
    var u = URL.createObjectURL(rec.blob);
    objectUrls.push(u);
    return u;
  }

  function revokeAll() {
    objectUrls.forEach(function (u) { URL.revokeObjectURL(u); });
    objectUrls = [];
  }

  /* ------------------------------ GALLERY ------------------------------ */

  var gallery = {
    items: [],
    view: [],
    filter: "all",
    page: 0,
    per: 12,
    grid: null
  };


  function tagName(id) {
    var t = (window.GALLERY_TAGS || []).filter(function (x) { return x.id === id; })[0];
    return t ? t.name : id;
  }

  function phCard(item, note) {
    var el = document.createElement("figure");
    el.className = "art art--ph is-loaded";
    el.innerHTML =
      '<div class="art--ph__in">' +
      '<span class="art--ph__ico">♡</span>' +
      "<b></b>" +
      "<small></small>" +
      '<a class="art--ph__link" target="_blank" rel="noopener noreferrer">найти на Pinterest ↗</a>' +
      "</div>";
    $("b", el).textContent = item.title;
    $("small", el).textContent = note || "картинка не загрузилась — возможно, Pinterest не дал доступ";
    if (item.source) $(".art--ph__link", el).href = item.source;
    el.style.aspectRatio = ar(item);
    return el;
  }

  function ar(item) {
    var r = item.ratio || 0.75;
    return (1 / r).toFixed(3);
  }

  function artCard(item, index) {
    var el = document.createElement("div");
    el.className = "art";
    el.style.animationDelay = Math.min(index, 14) * 55 + "ms";
    el.style.aspectRatio = ar(item);
    el.tabIndex = 0;
    el.setAttribute("role", "button");
    el.setAttribute("aria-label", "Открыть: " + item.title);

    var img = document.createElement("img");
    img.loading = "lazy";
    img.decoding = "async";
    img.referrerPolicy = "no-referrer";
    img.alt = item.title;
    img.src = item.src;

    var tag = document.createElement("span");
    tag.className = "art__tag";
    tag.textContent = tagName(item.tag);

    var veil = document.createElement("span");
    veil.className = "art__veil";
    veil.innerHTML = "<b></b><span></span>";
    $("b", veil).textContent = item.title;
    $("span", veil).textContent = item.size ? item.size + " · " + tagName(item.tag) : tagName(item.tag);

    el.appendChild(img);
    el.appendChild(tag);
    el.appendChild(veil);

    if (item.source) {
      var src = document.createElement("a");
      src.className = "art__src";
      src.href = item.source;
      src.target = "_blank";
      src.rel = "noopener noreferrer";
      src.title = "Источник на Pinterest";
      src.setAttribute("aria-label", "Источник: " + item.title);
      src.textContent = "↗";
      src.addEventListener("click", function (e) { e.stopPropagation(); });
      el.appendChild(src);
    }

    img.addEventListener("load", function () {
      el.classList.add("is-loaded");
      el.style.aspectRatio = "";
    });

    img.addEventListener("error", function () {
      var ph = phCard(item);
      ph.style.animationDelay = el.style.animationDelay;
      el.replaceWith(ph);
    });

    el.addEventListener("click", function () { openLightbox(item); });
    el.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        openLightbox(item);
      }
    });
    return el;
  }

  function renderGrid() {
    var grid = gallery.grid;
    if (!grid) return;
    grid.innerHTML = "";
    gallery.view = gallery.items.filter(function (it) {
      return gallery.filter === "all" || it.tag === gallery.filter;
    });

    var pages = Math.max(1, Math.ceil(gallery.view.length / gallery.per));
    if (gallery.page > pages - 1) gallery.page = pages - 1;
    if (gallery.page < 0) gallery.page = 0;

    var slice = gallery.view.slice(gallery.page * gallery.per, (gallery.page + 1) * gallery.per);
    var frag = document.createDocumentFragment();
    slice.forEach(function (it, i) { frag.appendChild(artCard(it, i)); });
    grid.appendChild(frag);

    var empty = $("#galleryEmpty");
    if (empty) empty.hidden = gallery.view.length > 0;

    renderPager(pages, slice.length);
  }

  function renderPager(pages, shown) {
    var box = $("#pager");
    if (!box) return;
    box.innerHTML = "";
    if (pages < 2) {
      box.hidden = true;
      return;
    }
    box.hidden = false;

    function nav(label, target, disabled) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "pager__btn" + (disabled ? " is-off" : "");
      b.textContent = label;
      b.disabled = !!disabled;
      b.addEventListener("click", function () {
        gallery.page = target;
        renderGrid();
        var sec = $("#gallery");
        if (sec) sec.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      });
      box.appendChild(b);
      return b;
    }

    nav("←", gallery.page - 1, gallery.page === 0);

    var from = Math.max(0, Math.min(gallery.page - 2, pages - 5));
    var to = Math.min(pages, from + 5);
    if (from > 0) {
      var dots = document.createElement("span");
      dots.className = "pager__gap";
      dots.textContent = "…";
      box.appendChild(dots);
    }
    for (var n = from; n < to; n++) {
      (function (num) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "pager__num" + (num === gallery.page ? " is-active" : "");
        b.textContent = String(num + 1);
        b.setAttribute("aria-current", num === gallery.page ? "true" : "false");
        b.setAttribute("aria-label", "Страница " + (num + 1));
        b.addEventListener("click", function () {
          gallery.page = num;
          renderGrid();
          var sec = $("#gallery");
          if (sec) sec.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
        });
        box.appendChild(b);
      })(n);
    }
    if (to < pages) {
      var dots2 = document.createElement("span");
      dots2.className = "pager__gap";
      dots2.textContent = "…";
      box.appendChild(dots2);
    }

    nav("→", gallery.page + 1, gallery.page >= pages - 1);

    var info = document.createElement("span");
    info.className = "pager__info";
    info.textContent = (gallery.page * gallery.per + (shown || 0)) + " из " + gallery.view.length;
    box.appendChild(info);
  }

  function renderFilters() {
    var box = $("#filters");
    if (!box) return;
    box.innerHTML = "";
    (window.GALLERY_TAGS || [{ id: "all", name: "Всё" }]).forEach(function (t) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "chip" + (gallery.filter === t.id ? " is-active" : "");
      b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", gallery.filter === t.id ? "true" : "false");
      var count = t.id === "all"
        ? gallery.items.length
        : gallery.items.filter(function (i) { return i.tag === t.id; }).length;
      b.innerHTML = "<span></span><b></b>";
      $("span", b).textContent = t.name;
      $("b", b).textContent = count;
      b.addEventListener("click", function () {
        gallery.filter = t.id;
        gallery.page = 0;
        renderFilters();
        renderGrid();
      });
      box.appendChild(b);
    });
  }

  function loadCustomAudio() {
    return idbAll().then(function (rows) {
      player.audioCustom = rows.filter(function (r) { return r.kind === "audio"; }).map(function (r) {
        return {
          title: r.name,
          sub: "твой трек",
          kind: "mine",
          src: urlFor(r)
        };
      });
      return player.audioCustom;
    }).catch(function () { return []; });
  }

  function initGallery() {
    gallery.grid = $("#galleryGrid");
    gallery.items = (window.GALLERY || []).map(function (g) { return Object.assign({}, g); });

    renderFilters();
    renderGrid();

    var dragDepth = 0;
    window.addEventListener("dragover", function (e) { e.preventDefault(); });
    window.addEventListener("drop", function (e) {
      e.preventDefault();
      dragDepth = 0;
      var files = e.dataTransfer && e.dataTransfer.files;
      if (!files || !files.length) return;
      var audio = [];
      Array.prototype.forEach.call(files, function (f) {
        if (/^audio\//.test(f.type)) audio.push(f);
      });
      if (audio.length) {
        audioStash.addTrack(audio);
      } else {
        toast("Арты берутся с Pinterest — перетаскивай только mp3", 3200);
      }
    });
  }

  /* ------------------------------ LIGHTBOX ------------------------------ */

  function openLightbox(item) {
    var lb = $("#lightbox");
    var stage = $("#lbStage");
    if (!lb || !stage) return;
    var idx = gallery.view.indexOf(item);
    lightbox.index = idx < 0 ? 0 : idx;

    paintLightbox();

    lb.hidden = false;
    requestAnimationFrame(function () { lb.classList.add("is-open"); });
    document.body.style.overflow = "hidden";
  }

  function paintLightbox() {
    var item = gallery.view[lightbox.index];
    if (!item) { closeLightbox(); return; }
    var stage = $("#lbStage");
    stage.innerHTML = "";
    var img = document.createElement("img");
    img.alt = item.title;
    img.referrerPolicy = "no-referrer";
    img.src = item.full || item.src;
    img.addEventListener("error", function () {
      stage.innerHTML = "";
      stage.appendChild(phCard(item));
    });
    stage.appendChild(img);
    $("#lbTitle").textContent = item.title;
    var meta = [tagName(item.tag)];
    if (item.size) meta.push(item.size);
    if (item.source) {
      meta.push("источник");
      var a = document.createElement("a");
      a.href = item.source;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = "Pinterest ↗";
      a.style.color = "inherit";
      a.style.textDecoration = "underline";
      var box = $("#lbTags");
      box.textContent = meta.join(" · ") + " ";
      box.appendChild(a);
      return;
    }
    $("#lbTags").textContent = meta.join(" · ");
  }

  function stepLightbox(d) {
    if (!gallery.view.length) return;
    lightbox.index = (lightbox.index + d + gallery.view.length) % gallery.view.length;
    paintLightbox();
  }

  function closeLightbox() {
    var lb = $("#lightbox");
    if (!lb || lb.hidden) return;
    lb.classList.remove("is-open");
    document.body.style.overflow = "";
    setTimeout(function () { lb.hidden = true; }, 420);
  }

  var lightbox = { index: 0 };

  function initLightbox() {
    var lb = $("#lightbox");
    $("#lbClose").addEventListener("click", closeLightbox);
    $("#lbPrev").addEventListener("click", function () { stepLightbox(-1); });
    $("#lbNext").addEventListener("click", function () { stepLightbox(1); });
    lb.addEventListener("click", function (e) {
      if (e.target === lb) closeLightbox();
    });

    document.addEventListener("keydown", function (e) {
      if (lb.hidden) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") stepLightbox(-1);
      if (e.key === "ArrowRight") stepLightbox(1);
    });

    var sx = 0;
    lb.addEventListener("touchstart", function (e) { sx = e.changedTouches[0].clientX; }, { passive: true });
    lb.addEventListener("touchend", function (e) {
      var dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 60) stepLightbox(dx < 0 ? 1 : -1);
    }, { passive: true });
  }

  /* ------------------------------ AUDIO ------------------------------ */

  var player = {
    audio: null,
    list: [],
    index: 0,
    ready: false,
    loop: "all",
    broken: {}
  };

  function loopLabel(mode) {
    if (mode === "one") return "один трек";
    if (mode === "off") return "выключен";
    return "весь плейлист";
  }

  function applyLoop() {
    if (!player.audio) return;
    player.audio.loop = player.loop === "one";
    var b = $("#loopBtn");
    if (!b) return;
    b.classList.toggle("is-all", player.loop === "all");
    b.classList.toggle("is-one", player.loop === "one");
    b.classList.toggle("is-off", player.loop === "off");
    b.setAttribute("aria-pressed", player.loop === "off" ? "false" : "true");
    b.setAttribute("aria-label", "Повтор: " + loopLabel(player.loop));
  }

  function buildPlayer() {
    var p = $("#player");
    if (!p) return;
    player.audio = new Audio();
    player.audio.preload = "none";
    player.audio.volume = store.get("volume", 55) / 100;
    var vol = $("#volBtn");
    vol.value = store.get("volume", 55);
    vol.style.setProperty("--fill", vol.value + "%");
    if (player.audio.volume > 0) $("#playerArt").textContent = "♥";

    player.loop = store.get("loop", "all");
    applyLoop();
    var loopBtn = $("#loopBtn");
    loopBtn.addEventListener("click", function () {
      var modes = ["all", "one", "off"];
      player.loop = modes[(modes.indexOf(player.loop) + 1) % modes.length];
      store.set("loop", player.loop);
      applyLoop();
      toast("Повтор: " + loopLabel(player.loop));
    });

    player.audio.addEventListener("timeupdate", function () {
      var d = player.audio.duration;
      if (!d) return;
      $("#playerFill").style.width = (player.audio.currentTime / d) * 100 + "%";
    });
    player.audio.addEventListener("ended", function () {
      if (player.loop === "off") { paintPlaying(); return; }
      stepTrack(1);
    });
    player.audio.addEventListener("play", function () { paintPlaying(); });
    player.audio.addEventListener("pause", function () { paintPlaying(); });
    player.audio.addEventListener("error", function () {
      var cur = player.list[player.index];
      if (!cur) return;
      player.broken[cur.title + cur.src] = true;
      player.audio.pause();
      renderTracks();
      if (allBroken()) {
        player.index = 0;
        player.audio.removeAttribute("src");
        $("#playerTitle").textContent = "Музыка не загружена";
        $("#playerSub").textContent = "добавь треки в assets/audio";
        paintPlaying();
        toast("Треки не найдены — положи mp3 в assets/audio", 4200);
        return;
      }
      paintPlaying();
      toast("Файл не найден: " + cur.title, 3400);
      stepTrack(1);
    });

    $("#playBtn").addEventListener("click", togglePlay);
    $("#prevBtn").addEventListener("click", function () { stepTrack(-1); });
    $("#nextBtn").addEventListener("click", function () { stepTrack(1); });
    $("#muteBtn").addEventListener("click", togglePlay);

    var prog = $("#playerProg");
    prog.addEventListener("click", function (e) {
      if (!player.audio.duration) return;
      var r = prog.getBoundingClientRect();
      player.audio.currentTime = ((e.clientX - r.left) / r.width) * player.audio.duration;
    });

    vol.addEventListener("input", function () {
      var v = Number(vol.value);
      vol.style.setProperty("--fill", v + "%");
      player.audio.volume = v / 100;
      store.set("volume", v);
      $("#playerArt").textContent = v > 0 ? "♥" : "♪";
    });

    document.addEventListener("keydown", function (e) {
      if (e.target.matches("input, textarea")) return;
      if (e.code === "Space" && document.body.classList.contains("is-entered") && $("#lightbox").hidden) {
        e.preventDefault();
        togglePlay();
      }
    });
  }

  function paintPlaying() {
    var playing = player.audio && !player.audio.paused;
    $("#player").classList.toggle("is-paused", !playing);
    $("#player").classList.toggle("is-playing", playing);
    $("#muteBtn").classList.toggle("is-playing", playing);
    document.body.classList.toggle("is-playing", playing);
    $$(".track").forEach(function (t, i) {
      t.classList.toggle("is-active", playing && i === player.index);
    });
  }

  function togglePlay() {
    if (!player.list.length) {
      toast("Музыка не загружена — добавь трек в assets/audio");
      return;
    }
    if (allBroken()) {
      toast("Треки не найдены — положи mp3 в assets/audio", 3400);
      return;
    }
    if (player.audio.paused) {
      player.audio.play().catch(function () { toast("Браузер не дал включить звук"); });
    } else {
      player.audio.pause();
    }
  }

  function allBroken() {
    if (!player.list.length) return true;
    return player.list.every(function (t) { return player.broken[t.title + t.src]; });
  }

  function stepTrack(d) {
    if (!player.list.length) return;
    var n = player.list.length;
    var i = player.index;
    for (var k = 0; k < n; k++) {
      i += d;
      if (i < 0) {
        if (player.loop === "off") { i = 0; }
        else { i = n - 1; }
      } else if (i > n - 1) {
        if (player.loop === "off") { i = n - 1; }
        else { i = 0; }
      }
      var t = player.list[i];
      if (t && !player.broken[t.title + t.src]) {
        if (i === player.index) {
          player.audio.currentTime = 0;
          player.audio.play().catch(function () {});
          return;
        }
        player.index = i;
        loadCurrent(true);
        return;
      }
      if (i === player.index) break;
    }
    player.audio.pause();
    paintPlaying();
  }

  function loadCurrent(autoplay) {
    var t = player.list[player.index];
    if (!t) return;
    player.audio.src = t.src;
    player.audio.load();
    $("#playerTitle").textContent = t.title;
    $("#playerSub").textContent = t.sub || "";
    paintPlaying();
    if (autoplay) {
      player.audio.play().catch(function () {
        toast("Не удалось запустить: " + t.title);
      });
    }
  }

  function renderTracks() {
    var box = $("#tracks");
    if (!box) return;
    box.innerHTML = "";
    var list = player.list;

    if (!list.length) {
      var hint = document.createElement("div");
      hint.className = "track track--empty";
      hint.innerHTML =
        '<span class="track__kind">пусто</span>' +
        '<div class="track__info"><b>Треков пока нет</b>' +
        "<span>Положи mp3 в assets/audio и обнови assets/js/media.js — или просто перетащи файлы в это окно браузера.</span></div>";
      box.appendChild(hint);
      return;
    }

    list.forEach(function (t, i) {
      var el = document.createElement("div");
      el.className = "track";
      el.setAttribute("role", "button");
      el.tabIndex = 0;
      el.innerHTML =
        '<span class="track__no"></span>' +
        '<div class="track__info"><b></b><span></span></div>' +
        '<span class="track__kind"></span>' +
        '<span class="track__eq"><i></i><i></i><i></i></span>';
      $(".track__no", el).textContent = String(i + 1).padStart(2, "0");
      $(".track__info b", el).textContent = t.title;
      $(".track__info span", el).textContent = t.sub || "";
      var kind = $(".track__kind", el);
      if (player.broken[t.title + t.src]) {
        kind.textContent = "нет файла";
        kind.classList.add("track__kind--off");
        el.classList.add("is-missing");
      } else {
        kind.textContent = t.kind || "♪";
      }
      function pick() {
        if (player.broken[t.title + t.src]) {
          toast("Файл не найден: " + t.title, 3000);
          return;
        }
        player.index = i;
        loadCurrent(true);
      }
      el.addEventListener("click", pick);
      el.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); }
      });
      box.appendChild(el);
    });
    paintPlaying();
  }

  function setTrackList(list) {
    player.list = list;
    player.index = 0;
    renderTracks();
    var p = $("#player");
    var hasMusic = list.length > 0;
    p.hidden = !hasMusic;
    p.classList.toggle("is-ready", hasMusic);
    document.body.classList.toggle("has-music", hasMusic);
    if (hasMusic) {
      loadCurrent(false);
    }
  }

  function probeTracks() {
    var jobs = player.list.map(function (t) {
      if (!t.src || /^blob:/.test(t.src)) return Promise.resolve();
      return fetch(t.src, { method: "HEAD" })
        .then(function (res) {
          if (!res.ok) player.broken[t.title + t.src] = true;
        })
        .catch(function () {});
    });
    return Promise.all(jobs).then(function () {
      var hasHidden = player.list.some(function (t) {
        return t.optional && player.broken[t.title + t.src];
      });
      if (hasHidden) {
        player.list = player.list.filter(function (t) {
          return !(t.optional && player.broken[t.title + t.src]);
        });
        if (player.broken[(player.list[player.index] || {}).title + (player.list[player.index] || {}).src]) {
          player.index = 0;
        }
        renderTracks();
        if (player.list.length) loadCurrent(false);
      }
      renderTracks();
      if (allBroken()) {
        $("#playerTitle").textContent = "Музыка не загружена";
        $("#playerSub").textContent = "добавь треки в assets/audio";
      }
    });
  }

  function initAudio() {
    buildPlayer();
    setTrackList((window.TRACKS || []).map(function (t) { return Object.assign({}, t); }));
    probeTracks();
    loadCustomAudio().then(function (mine) {
      if (mine.length) {
        setTrackList((window.TRACKS || []).map(function (t) { return Object.assign({}, t); }).concat(mine));
      }
    });
  }

  audioStash.addTrack = function (files) {
    var jobs = files.map(function (f, i) {
      return idbPut({
        id: "a" + Date.now() + "-" + i,
        kind: "audio",
        blob: f,
        name: f.name,
        added: Date.now()
      });
    });
    Promise.all(jobs).then(function () {
      return loadCustomAudio();
    }).then(function (mine) {
      var base = (window.TRACKS || []).map(function (t) { return Object.assign({}, t); });
      setTrackList(base.concat(mine));
      toast("Треков добавлено: " + files.length);
    }).catch(function () {
      toast("Браузер не разрешил сохранить трек");
    });
  };

  /* ------------------------------ GATE ------------------------------ */

  function initGate() {
    var gate = $("#gate");
    var btn = $("#visitBtn");
    var bar = $("#gateBar");
    var num = $("#gateProgress");
    var p = 0;
    var iv = setInterval(function () {
      p = Math.min(100, p + 4 + Math.random() * 9);
      if (bar) bar.style.width = p + "%";
      if (num) num.textContent = Math.round(p) + "%";
      if (p >= 100) clearInterval(iv);
    }, 130);

    function enter() {
      if (document.body.classList.contains("is-entered")) return;
      document.body.classList.add("is-entered");
      document.body.classList.remove("is-locked");
      if (gate) {
        gate.classList.add("is-gone");
        setTimeout(function () { gate.setAttribute("aria-hidden", "true"); }, 900);
      }
      clearInterval(iv);
      if (p < 100 && bar) bar.style.width = "100%";
      if (p < 100 && num) num.textContent = "100%";

      setTimeout(function () {
        if (player.list.length) {
          loadCurrent(true);
        } else {
          toast("Музыка не загружена — перетащи треки сюда", 3600);
        }
      }, 620);
    }

    if (btn) btn.addEventListener("click", enter);
    document.addEventListener("keydown", function (e) {
      if ((e.key === "Enter" || e.key === " ") && !document.body.classList.contains("is-entered")) {
        e.preventDefault();
        enter();
      }
    });
  }

  /* ------------------------------ BOOT ------------------------------ */

  function initFallbacks() {
    $$("img[data-fallback]").forEach(function (img) {
      img.referrerPolicy = img.referrerPolicy || "no-referrer";
      img.addEventListener("error", function () {
        if (img.dataset.fallbackDone) return;
        img.dataset.fallbackDone = "1";
        img.src = img.getAttribute("data-fallback");
      });
    });
  }

  function boot() {
    initFallbacks();
    initTheme();
    initHearts();
    initCursor();
    initReveal();
    initTilt();
    initSpotlight();
    initNav();
    initQuotes();
    initGallery();
    initLightbox();
    initAudio();
    initGate();

    var y = $("#year");
    if (y) y.textContent = new Date().getFullYear();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
