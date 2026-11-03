/* Floating navbar behaviour:
   1. the selected option follows the section that is currently on screen
   2. the navbar gets a frosted-glass style once the page has scrolled
   Links themselves are plain #anchors (smooth scrolling is done in CSS). */
(function () {
  var nav = document.querySelector(".navbar");
  if (!nav) return;

  var links = Array.prototype.slice.call(nav.querySelectorAll('a[href^="#"]'));
  var byId = {};
  links.forEach(function (a) {
    byId[a.getAttribute("href").slice(1)] = a;
  });

  function select(id) {
    links.forEach(function (a) {
      var on = a === byId[id];
      a.classList.toggle("is-selected", on);
      if (on) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
  }

  // A section becomes "current" while it crosses the middle of the viewport.
  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) select(entry.target.id);
        });
      },
      { rootMargin: "-50% 0px -50% 0px" }
    );
    Object.keys(byId).forEach(function (id) {
      var section = document.getElementById(id);
      if (section) observer.observe(section);
    });
  }

  function onScroll() {
    nav.classList.toggle("is-scrolled", window.scrollY > 8);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
})();

/* Contact section
   1. the title is split into letters so each one can hop on hover
   2. every [data-draggable] widget can be dragged around the section
      (a press that doesn't move still counts as a normal click, so links work) */
(function () {
  var stage = document.querySelector(".contact");
  if (!stage) return;

  /* ---- 1. hopping letters ---- */
  var title = stage.querySelector(".contact__title");
  if (title) {
    title.setAttribute("aria-label", title.textContent.replace(/\s+/g, " ").trim());
    var index = 0;
    Array.prototype.slice.call(title.childNodes).forEach(function (node) {
      if (node.nodeType !== 3) return; // keep <br> as is
      var frag = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) {
          frag.appendChild(document.createTextNode(" "));
          return;
        }
        var word = document.createElement("span");
        word.className = "word";
        word.setAttribute("aria-hidden", "true");
        part.split("").forEach(function (ch) {
          var c = document.createElement("span");
          c.className = "char";
          c.textContent = ch;
          c.style.setProperty("--i", index++);
          word.appendChild(c);
        });
        frag.appendChild(word);
      });
      title.replaceChild(frag, node);
    });

    var hopping = false;
    title.addEventListener("pointerenter", function () {
      if (hopping) return;
      hopping = true;
      title.classList.add("is-hopping");
      setTimeout(function () {
        title.classList.remove("is-hopping");
        hopping = false;
      }, index * 35 + 700);
    });
  }

  /* ---- 2. draggable widgets ---- */
  var THRESHOLD = 6; // px of movement before a press becomes a drag
  var top = 10;

  Array.prototype.slice.call(stage.querySelectorAll("[data-draggable]")).forEach(function (el) {
    var x = 0, y = 0;
    var startX, startY, baseX, baseY;
    var pressed = false, dragging = false, justDragged = false;

    function bounds() {
      return {
        minX: -el.offsetLeft,
        maxX: stage.clientWidth - el.offsetLeft - el.offsetWidth,
        minY: -el.offsetTop,
        maxY: stage.clientHeight - el.offsetTop - el.offsetHeight
      };
    }
    function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

    el.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      pressed = true;
      dragging = false;
      justDragged = false;
      startX = e.clientX;
      startY = e.clientY;
      baseX = x;
      baseY = y;
      el.style.zIndex = ++top;
    });

    el.addEventListener("pointermove", function (e) {
      if (!pressed) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;
      if (!dragging) {
        if (Math.abs(dx) < THRESHOLD && Math.abs(dy) < THRESHOLD) return;
        dragging = true;
        el.setPointerCapture(e.pointerId);
        el.classList.add("is-dragging");
      }
      var b = bounds();
      x = clamp(baseX + dx, b.minX, b.maxX);
      y = clamp(baseY + dy, b.minY, b.maxY);
      el.style.setProperty("--x", x + "px");
      el.style.setProperty("--y", y + "px");
    });

    function end() {
      if (!pressed) return;
      pressed = false;
      if (dragging) {
        justDragged = true; // swallow the click that follows a drag
        setTimeout(function () { justDragged = false; }, 0);
      }
      dragging = false;
      el.classList.remove("is-dragging");
    }
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);

    el.addEventListener("click", function (e) {
      if (justDragged) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);

    el.addEventListener("dragstart", function (e) { e.preventDefault(); });
  });
})();

/* ============================================================
   Project modal
   Clicking a .project-card__trigger opens the modal with the
   relevant screenshots injected. ESC or the red dot closes it.
   ============================================================ */
(function () {

  /* Screenshot data per project */
  var projects = {
    elibrary: {
      title: "e-Library",
      shots: [
        { src: "assets/project-splash.png",           alt: "e-Library landing page" },
        { src: "assets/project-home.png",              alt: "Home page — book recommendations & categories" },
        { src: "assets/project-book-detail.png",       alt: "Book details page" },
        { src: "assets/project-books-administrasi.png",alt: "All Collections — Administration category" },
        { src: "assets/project-books.png",             alt: "All Collections — profile menu open" },
        { src: "assets/project-loaning-page.png",      alt: "Loan Information form" },
        { src: "assets/project-login-page.png",        alt: "Login page" },
      ]
    },
    "207": {
      title: "20/7",
      shots: [
        { src: "assets/project-207-shot-01.png", alt: "20/7 — image 1" },
        { src: "assets/project-207-shot-02.png", alt: "20/7 — image 2" },
        { src: "assets/project-207-shot-03.png", alt: "20/7 — image 3" },
        { src: "assets/project-207-shot-04.png", alt: "20/7 — image 4" },
        { src: "assets/project-207-shot-05.png", alt: "20/7 — image 5" },
        { src: "assets/project-207-shot-06.png", alt: "20/7 — image 6" }
      ]
    },
    ibis: {
      title: "ibis Styles Hotels",
      shots: [
        { src: "assets/ibis-window-01.png", alt: "ibis Styles Hotels — 1" },
        { src: "assets/ibis-window-02.png", alt: "ibis Styles Hotels — 2" },
        { src: "assets/ibis-window-03.png", alt: "ibis Styles Hotels — 3" },
        { src: "assets/ibis-window-04.png", alt: "ibis Styles Hotels — 4" },
        { src: "assets/ibis-window-05.png", alt: "ibis Styles Hotels — 5" },
        { src: "assets/ibis-window-06.png", alt: "ibis Styles Hotels — 6" }
      ]
    }
  };

  var backdrop  = document.getElementById("projectModal");
  var titleEl   = document.getElementById("modalTitle");
  var body      = document.getElementById("modalBody");
  var closeBtn  = document.getElementById("modalClose");
  if (!backdrop || !closeBtn) return;

  var lastFocus = null;

  function openModal(key) {
    var data = projects[key];
    if (!data) return;

    lastFocus = document.activeElement;
    titleEl.textContent = data.title;

    /* Build screenshot grid */
    body.innerHTML = "";
    data.shots.forEach(function (shot) {
      var li = document.createElement("div");
      li.className = "modal-shot";
      var img = document.createElement("img");
      img.src = shot.src;
      img.alt = shot.alt;
      img.loading = "lazy";
      li.appendChild(img);
      body.appendChild(li);
    });

    backdrop.hidden = false;
    /* Allow display:flex to kick in before we animate */
    requestAnimationFrame(function () {
      backdrop.classList.add("is-open");
    });
    closeBtn.focus();
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    backdrop.classList.remove("is-open");
    backdrop.hidden = true;
    document.body.style.overflow = "";
    if (lastFocus) lastFocus.focus();
  }

  /* Wire up every project card trigger */
  document.querySelectorAll(".project-card__trigger").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var key = btn.closest("[data-project]").dataset.project;
      openModal(key);
    });
  });

  closeBtn.addEventListener("click", closeModal);

  /* Click on dark backdrop closes */
  backdrop.addEventListener("click", function (e) {
    if (e.target === backdrop) closeModal();
  });

  /* ESC key */
  document.addEventListener("keydown", function (e) {
    if ((e.key === "Escape" || e.key === "Esc") && !backdrop.hidden) {
      closeModal();
    }
  });

  /* Trap focus inside modal while open */
  backdrop.addEventListener("keydown", function (e) {
    if (e.key !== "Tab") return;
    var focusable = Array.prototype.slice.call(
      backdrop.querySelectorAll('button, [href], input, [tabindex]:not([tabindex="-1"])')
    ).filter(function (el) { return !el.disabled; });
    if (!focusable.length) return;
    var first = focusable[0];
    var last  = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
    }
  });

})();
