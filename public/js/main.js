/* ══════════════════════════════════════════════════════════
   HARSHIT GARG PORTFOLIO — main.js
   ══════════════════════════════════════════════════════════ */

// ─── 1. Particle Canvas ──────────────────────────────────────────
(function initCanvas() {
  const canvas = document.getElementById('heroCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let W, H, particles, mouse = { x: null, y: null };
  const N = 90, MAX_DIST = 130, MOUSE_RADIUS = 120;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function createParticles() {
    particles = Array.from({ length: N }, function () {
      return {
        x:  Math.random() * W,
        y:  Math.random() * H,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r:  Math.random() * 1.2 + 0.4,
      };
    });
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Move & wrap
    for (var i = 0; i < N; i++) {
      var p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0)  p.x = W;
      if (p.x > W)  p.x = 0;
      if (p.y < 0)  p.y = H;
      if (p.y > H)  p.y = 0;
    }

    // Lines between close particles
    for (var i = 0; i < N; i++) {
      for (var j = i + 1; j < N; j++) {
        var dx = particles[i].x - particles[j].x;
        var dy = particles[i].y - particles[j].y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MAX_DIST) {
          var alpha = (1 - dist / MAX_DIST) * 0.18;
          ctx.beginPath();
          ctx.strokeStyle = 'rgba(157,92,255,' + alpha + ')';
          ctx.lineWidth = 0.6;
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }

    // Mouse attraction lines
    if (mouse.x !== null) {
      for (var i = 0; i < N; i++) {
        var p = particles[i];
        var dx = p.x - mouse.x;
        var dy = p.y - mouse.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MOUSE_RADIUS) {
          var alpha = (1 - dist / MOUSE_RADIUS) * 0.35;
          ctx.beginPath();
          ctx.strokeStyle = 'rgba(0,212,255,' + alpha + ')';
          ctx.lineWidth = 0.8;
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
        }
      }
    }

    // Draw dots
    for (var i = 0; i < N; i++) {
      ctx.beginPath();
      ctx.fillStyle = 'rgba(157,92,255,0.55)';
      ctx.arc(particles[i].x, particles[i].y, particles[i].r, 0, Math.PI * 2);
      ctx.fill();
    }

    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', function () { resize(); createParticles(); }, { passive: true });

  canvas.addEventListener('mousemove', function (e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  }, { passive: true });

  canvas.addEventListener('mouseleave', function () {
    mouse.x = null;
    mouse.y = null;
  });

  resize();
  createParticles();
  draw();
})();


// ─── 2. Typewriter Effect ────────────────────────────────────────
(function initTypewriter() {
  var el = document.getElementById('typewriter');
  if (!el) return;

  var roles = [
    'AI Systems Architect',
    'Full-Stack Engineer',
    'Platform Builder',
    'Agentic AI Engineer',
    'ML Engineer',
  ];

  var roleIdx = 0, charIdx = 0, deleting = false;

  function type() {
    var current = roles[roleIdx];

    if (!deleting) {
      el.textContent = current.substring(0, charIdx + 1);
      charIdx++;
      if (charIdx === current.length) {
        deleting = true;
        setTimeout(type, 2200);
        return;
      }
    } else {
      el.textContent = current.substring(0, charIdx - 1);
      charIdx--;
      if (charIdx === 0) {
        deleting = false;
        roleIdx = (roleIdx + 1) % roles.length;
      }
    }

    setTimeout(type, deleting ? 45 : 75);
  }

  // Small delay before starting
  setTimeout(type, 800);
})();


// ─── 3. Scroll-Triggered Animations ─────────────────────────────
(function initScrollAnimations() {
  var elements = document.querySelectorAll('.animate-on-scroll');
  if (!elements.length) return;

  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });

    elements.forEach(function (el) { observer.observe(el); });
  } else {
    // Fallback: show all
    elements.forEach(function (el) { el.classList.add('visible'); });
  }
})();


// ─── 4. Active Nav on Scroll ─────────────────────────────────────
(function initActiveNav() {
  var sections  = document.querySelectorAll('section[id]');
  var navLinks  = document.querySelectorAll('.nav-link[href*="#"]');
  if (!sections.length || !navLinks.length) return;

  function update() {
    var scrollY  = window.scrollY;
    var current  = '';

    sections.forEach(function (section) {
      if (scrollY >= section.offsetTop - 90) {
        current = section.id;
      }
    });

    navLinks.forEach(function (link) {
      var href = link.getAttribute('href');
      var hash = href.substring(href.indexOf('#'));
      link.classList.toggle('active', hash === '#' + current);
    });
  }

  window.addEventListener('scroll', update, { passive: true });
  update();
})();


// ─── 5. Navbar Scroll Effect ─────────────────────────────────────
(function initNavbar() {
  var navbar = document.getElementById('navbar');
  if (!navbar) return;
  window.addEventListener('scroll', function () {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });
})();


// ─── 6. Mobile Nav Toggle ────────────────────────────────────────
(function initMobileNav() {
  var toggle = document.getElementById('navToggle');
  var links  = document.getElementById('navLinks');
  if (!toggle || !links) return;

  toggle.addEventListener('click', function () {
    var isOpen = links.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });

  links.querySelectorAll('.nav-link').forEach(function (link) {
    link.addEventListener('click', function () {
      links.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
})();


// ─── 7. Back-to-Top Button ───────────────────────────────────────
(function initBackToTop() {
  var btn = document.getElementById('backToTop');
  if (!btn) return;

  window.addEventListener('scroll', function () {
    btn.classList.toggle('visible', window.scrollY > 500);
  }, { passive: true });
})();


// ─── 8. AJAX Contact Form ────────────────────────────────────────
function showAbuseModal(title, body) {
  var modal = document.getElementById('abuseModal');
  if (!modal) return;
  var titleEl = document.getElementById('abuseModalTitle');
  var bodyEl = document.getElementById('abuseModalBody');
  var closeBtn = document.getElementById('abuseModalClose');
  if (titleEl) titleEl.textContent = title || 'Caught.';
  if (bodyEl) bodyEl.textContent = body || '';
  modal.hidden = false;
  document.body.classList.add('abuse-lock');
  if (closeBtn) closeBtn.focus();
}

function hideAbuseModal() {
  var modal = document.getElementById('abuseModal');
  if (!modal) return;
  modal.hidden = true;
  document.body.classList.remove('abuse-lock');
}

(function initAbuseModal() {
  var modal = document.getElementById('abuseModal');
  var closeBtn = document.getElementById('abuseModalClose');
  if (!modal) return;
  if (closeBtn) closeBtn.addEventListener('click', hideAbuseModal);
  modal.addEventListener('click', function (e) {
    if (e.target === modal) hideAbuseModal();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !modal.hidden) hideAbuseModal();
  });
  var boot = document.getElementById('abuseModalBoot');
  if (boot) showAbuseModal(boot.getAttribute('data-title'), boot.getAttribute('data-body'));
})();

(function initContactForm() {
  var form      = document.getElementById('contactForm');
  var submitBtn = document.getElementById('submitBtn');
  var status    = document.getElementById('formStatus');
  if (!form || !submitBtn || !status) return;

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    var name    = form.querySelector('[name="name"]').value.trim();
    var email   = form.querySelector('[name="email"]').value.trim();
    var message = form.querySelector('[name="message"]').value.trim();
    var faxEl   = form.querySelector('[name="fax"]');
    var fax     = faxEl ? faxEl.value : '';

    if (!name || !email || !message) {
      status.textContent = 'Please fill in all fields.';
      status.className   = 'form-status error';
      return;
    }

    submitBtn.textContent = 'Sending…';
    submitBtn.disabled    = true;
    status.textContent    = '';
    status.className      = 'form-status';

    try {
      var res = await fetch('/contact', {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept':       'application/json',
        },
        body: JSON.stringify({ name: name, email: email, message: message, fax: fax }),
      });

      var data = await res.json();

      if (data.success) {
        status.textContent = '✓ Message sent! I\'ll be in touch soon.';
        status.className   = 'form-status success';
        form.reset();
      } else if (data.abuse) {
        status.textContent = '';
        status.className   = 'form-status';
        showAbuseModal(data.abuseTitle, data.abuseBody);
      } else {
        status.textContent = data.error || 'Something went wrong.';
        status.className   = 'form-status error';
      }
    } catch (err) {
      status.textContent = 'Network error. Please email me directly.';
      status.className   = 'form-status error';
    } finally {
      submitBtn.textContent = 'Send Message →';
      submitBtn.disabled    = false;
    }
  });
})();


// ─── 9. Sticky Scroll — Experience Section ────────────────────────
(function initStickyExperience() {
  var section   = document.getElementById('experience');
  var container = document.getElementById('expScrollContainer');
  var panel     = document.getElementById('expStickyPanel');
  if (!section || !container) return;

  var isMobile = function () { return window.innerWidth <= 768; };
  var prefersReduced = function () {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  };

  var cards        = section.querySelectorAll('.exp-card');
  var navBtns      = section.querySelectorAll('.exp-nav-btn');
  var navEl        = section.querySelector('.exp-nav');
  var navTrack     = section.querySelector('.exp-nav-track');
  var progressFill = document.getElementById('expProgressFill');
  var navTrackFill = document.getElementById('expNavFill');
  var counter      = document.getElementById('expCurrent');
  var ambient      = document.getElementById('expAmbient');
  var scrollHint   = document.getElementById('expScrollHint');
  var bgNumEl      = document.getElementById('expBgNum');
  var numJobs      = cards.length;
  var currentJob   = -1;
  var lastProgress = 0;
  var lastScrollTs = 0;
  var velocity     = 0; // |Δprogress| per ms
  var ticking      = false;
  var isFast       = false;
  var settleTimer  = null;
  var leaveTimers  = [];
  var JOB_VH       = 1.45;
  var FAST_VEL     = 0.0018; // ~1.8 full-section lengths / second
  var FAST_JUMP    = 1;      // skip fancy motion when jumping >1 job
  var SETTLE_MS    = 140;
  var dotStops     = [];
  var bgNumTimer   = null;
  var pendingBgIdx = -1;

  function scrollRange() {
    var stickyTop = panel ? parseFloat(getComputedStyle(panel).top) || 0 : 64;
    return {
      start: sectionPageTop() - stickyTop,
      length: Math.max(1, container.offsetHeight - (panel ? panel.offsetHeight : window.innerHeight - stickyTop))
    };
  }

  function setHeight() {
    if (isMobile()) {
      container.style.height = '';
      cards.forEach(function (card) { card.removeAttribute('aria-hidden'); });
      return;
    }
    container.style.height =
      (window.innerHeight * JOB_VH * numJobs + window.innerHeight * 0.35) + 'px';
  }

  function measureNavTrack() {
    if (isMobile() || !navEl || !navTrack || !navBtns.length) {
      dotStops = [];
      return;
    }

    var navRect = navEl.getBoundingClientRect();
    var firstDot = navBtns[0].querySelector('.exp-nav-dot');
    var lastDot  = navBtns[numJobs - 1].querySelector('.exp-nav-dot');
    if (!firstDot || !lastDot) return;

    var firstRect = firstDot.getBoundingClientRect();
    var lastRect  = lastDot.getBoundingClientRect();

    var trackTop = (firstRect.top + firstRect.height / 2) - navRect.top + navEl.scrollTop;
    var trackLeft = (firstRect.left + firstRect.width / 2) - navRect.left + navEl.scrollLeft;
    var trackHeight = (lastRect.top + lastRect.height / 2) - (firstRect.top + firstRect.height / 2);

    navTrack.style.top = trackTop + 'px';
    navTrack.style.bottom = 'auto';
    navTrack.style.height = Math.max(0, trackHeight) + 'px';
    navTrack.style.left = (trackLeft - 1) + 'px';
    navTrack.style.opacity = trackHeight > 0 ? '1' : '0';

    if (trackHeight <= 0) {
      dotStops = [];
      return;
    }

    dotStops = [];
    for (var i = 0; i < numJobs; i++) {
      var dot = navBtns[i].querySelector('.exp-nav-dot');
      if (!dot) {
        dotStops.push(i / Math.max(1, numJobs - 1));
        continue;
      }
      var r = dot.getBoundingClientRect();
      var centerY = (r.top + r.height / 2) - navRect.top + navEl.scrollTop - trackTop;
      dotStops.push(Math.max(0, Math.min(1, centerY / trackHeight)));
    }
  }

  function jobProgress(progress) {
    var scaled = progress * numJobs;
    var idx = Math.min(numJobs - 1, Math.floor(scaled));
    if (progress >= 1) {
      return { idx: numJobs - 1, local: 1, scaled: numJobs };
    }
    return { idx: idx, local: scaled - idx, scaled: scaled };
  }

  function trackFillForJob(idx, local) {
    if (!dotStops.length) {
      if (numJobs <= 1) return 1;
      return Math.min(1, (idx + local) / (numJobs - 1));
    }
    var from = dotStops[idx];
    if (idx >= numJobs - 1) return from;
    var to = dotStops[idx + 1];
    return from + (to - from) * local;
  }

  function clearLeaveTimers() {
    for (var t = 0; t < leaveTimers.length; t++) clearTimeout(leaveTimers[t]);
    leaveTimers = [];
  }

  function stripCardMotion(card) {
    card.classList.remove(
      'is-entering', 'is-leaving',
      'from-below', 'from-above',
      'is-crossfade'
    );
  }

  function setFastMode(on) {
    isFast = on;
    if (panel) panel.classList.toggle('is-fast', on);
  }

  function setBgNumDigits(label) {
    if (!bgNumEl) return;
    var digits = bgNumEl.querySelectorAll('.exp-bg-digit');
    for (var d = 0; d < digits.length; d++) {
      digits[d].textContent = label.charAt(d) || '0';
    }
  }

  function applyBgNumInstant(idx) {
    if (!bgNumEl) return;
    if (bgNumTimer) {
      clearTimeout(bgNumTimer);
      bgNumTimer = null;
    }
    bgNumEl.classList.remove('is-dissolving', 'is-assembling');
    var label = String(idx + 1).padStart(2, '0');
    var jobColor = cards[idx]
      ? getComputedStyle(cards[idx]).getPropertyValue('--job-color').trim()
      : '';
    if (jobColor) bgNumEl.style.setProperty('--job-color', jobColor);
    setBgNumDigits(label);
  }

  function morphBgNum(idx) {
    if (!bgNumEl) return;
    var label = String(idx + 1).padStart(2, '0');
    var jobColor = cards[idx]
      ? getComputedStyle(cards[idx]).getPropertyValue('--job-color').trim()
      : '';
    if (jobColor) bgNumEl.style.setProperty('--job-color', jobColor);

    if (prefersReduced() || currentJob === -1) {
      applyBgNumInstant(idx);
      return;
    }

    if (bgNumTimer) clearTimeout(bgNumTimer);
    bgNumEl.classList.remove('is-assembling');
    bgNumEl.classList.add('is-dissolving');

    bgNumTimer = setTimeout(function () {
      setBgNumDigits(label);
      bgNumEl.classList.remove('is-dissolving');
      void bgNumEl.offsetWidth;
      bgNumEl.classList.add('is-assembling');
      bgNumTimer = setTimeout(function () {
        bgNumEl.classList.remove('is-assembling');
        bgNumTimer = null;
      }, 620);
    }, 360);
  }

  function activateJob(idx, direction, opts) {
    opts = opts || {};
    if (idx === currentJob) return;

    var prev = currentJob;
    var jump = prev === -1 ? 0 : Math.abs(idx - prev);
    var fast = !!opts.fast || jump > FAST_JUMP || prefersReduced();

    currentJob = idx;
    clearLeaveTimers();

    if (panel) {
      panel.dataset.dir = direction >= 0 ? 'down' : 'up';
    }

    // Kill any in-flight motion on every card so fast scrolls don't stack
    cards.forEach(function (card) { stripCardMotion(card); });

    cards.forEach(function (card, i) {
      if (i === idx) {
        card.classList.add('active');
        card.removeAttribute('aria-hidden');
        if (prev !== -1 && !prefersReduced()) {
          if (fast) {
            card.classList.add('is-crossfade');
          } else {
            card.classList.add('is-entering', direction >= 0 ? 'from-below' : 'from-above');
          }
        }
      } else {
        if (i === prev && prev !== -1 && !prefersReduced() && !fast) {
          card.classList.add('is-leaving', direction >= 0 ? 'from-above' : 'from-below');
          leaveTimers.push(setTimeout(function () {
            stripCardMotion(card);
          }, 520));
        }
        card.classList.remove('active');
        card.setAttribute('aria-hidden', 'true');
      }
    });

    // Clear one-shot motion classes after they finish
    if (prev !== -1 && !prefersReduced()) {
      var activeCard = cards[idx];
      leaveTimers.push(setTimeout(function () {
        if (activeCard) {
          activeCard.classList.remove('is-entering', 'from-below', 'from-above', 'is-crossfade');
        }
      }, fast ? 220 : 600));
    }

    navBtns.forEach(function (btn, i) {
      var on = i === idx;
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-current', on ? 'true' : 'false');
    });

    if (navEl && navBtns[idx]) {
      var navBox = navEl.getBoundingClientRect();
      var btnBox = navBtns[idx].getBoundingClientRect();
      if (btnBox.top < navBox.top) navEl.scrollTop += btnBox.top - navBox.top;
      else if (btnBox.bottom > navBox.bottom) navEl.scrollTop += btnBox.bottom - navBox.bottom;
    }

    if (counter) {
      counter.textContent = String(idx + 1).padStart(2, '0');
      if (!fast) {
        counter.classList.remove('exp-counter-pop');
        void counter.offsetWidth;
        counter.classList.add('exp-counter-pop');
      } else {
        counter.classList.remove('exp-counter-pop');
      }
    }

    // During fast scroll: update digits instantly; fancy morph waits for settle
    if (fast || prev === -1) {
      applyBgNumInstant(idx);
      pendingBgIdx = idx;
    } else {
      morphBgNum(idx);
      pendingBgIdx = -1;
    }

    if (ambient && cards[idx]) {
      var color = getComputedStyle(cards[idx]).getPropertyValue('--job-color').trim();
      var glow  = getComputedStyle(cards[idx]).getPropertyValue('--job-glow').trim();
      ambient.style.setProperty('--exp-ambient-color', color || '#9d5cff');
      ambient.style.setProperty('--exp-ambient-glow', glow || 'rgba(157,92,255,0.25)');
      ambient.classList.add('is-lit');
    }

    if (scrollHint && idx > 0) {
      scrollHint.classList.add('is-faded');
    }
  }

  function updateProgressUI(progress, idx, local) {
    if (progressFill) {
      progressFill.style.transform = 'scaleX(' + progress + ')';
    }
    if (navTrackFill) {
      var fill = trackFillForJob(idx, local);
      navTrackFill.style.transform = 'scaleY(' + fill + ')';
    }
    if (panel) {
      panel.style.setProperty('--exp-progress', progress.toFixed(4));
    }
  }

  function onSettle() {
    setFastMode(false);
    velocity = 0;
    // Play the dissolve/reassemble once the user stops on a job
    if (pendingBgIdx >= 0 && pendingBgIdx === currentJob && !prefersReduced()) {
      morphBgNum(pendingBgIdx);
      pendingBgIdx = -1;
    }
  }

  function scheduleSettle() {
    if (settleTimer) clearTimeout(settleTimer);
    settleTimer = setTimeout(onSettle, SETTLE_MS);
  }

  function onScroll() {
    if (isMobile()) return;

    var now = performance.now();
    var range = scrollRange();
    var scrolled = window.pageYOffset - range.start;
    var maxScroll = range.length;
    if (maxScroll <= 0) return;

    var progress = Math.max(0, Math.min(1, scrolled / maxScroll));
    var dt = lastScrollTs ? Math.max(8, now - lastScrollTs) : 16;
    var dProgress = Math.abs(progress - lastProgress);
    // EMA so one noisy frame doesn't flip modes forever
    var instantVel = dProgress / dt;
    velocity = lastScrollTs ? velocity * 0.65 + instantVel * 0.35 : instantVel;
    lastScrollTs = now;

    var direction = progress >= lastProgress ? 1 : -1;
    lastProgress = progress;

    var jp = jobProgress(progress);
    var jump = currentJob === -1 ? 0 : Math.abs(jp.idx - currentJob);
    var fast = velocity > FAST_VEL || jump > FAST_JUMP;

    if (fast) setFastMode(true);
    updateProgressUI(progress, jp.idx, jp.local);
    activateJob(jp.idx, direction, { fast: fast });
    scheduleSettle();
  }

  function requestTick() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      onScroll();
      ticking = false;
    });
  }

  function sectionPageTop() {
    return section.getBoundingClientRect().top + window.pageYOffset;
  }

  function scrollToJob(i) {
    if (isMobile()) {
      var card = cards[i];
      if (card) card.scrollIntoView({ behavior: prefersReduced() ? 'auto' : 'smooth', block: 'start' });
      return;
    }
    var range = scrollRange();
    var targetY = range.start + ((i + 0.02) / numJobs) * range.length;
    // Nav jumps often skip slots — use fast mode for the hop
    setFastMode(Math.abs(i - currentJob) > 1);
    window.scrollTo({
      top: targetY,
      behavior: prefersReduced() ? 'auto' : 'smooth'
    });
  }

  navBtns.forEach(function (btn, i) {
    btn.addEventListener('click', function () { scrollToJob(i); });
  });

  if (navEl) navEl.addEventListener('keydown', function (e) {
    if (isMobile()) return;
    var focusedBtn = e.target.closest('.exp-nav-btn');
    var targetIdx = Array.prototype.indexOf.call(navBtns, focusedBtn);
    if (targetIdx < 0) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') targetIdx++;
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') targetIdx--;
    else if (e.key === 'Home') targetIdx = 0;
    else if (e.key === 'End') targetIdx = numJobs - 1;
    else return;
    e.preventDefault();
    targetIdx = Math.max(0, Math.min(numJobs - 1, targetIdx));
    navBtns[targetIdx].focus({ preventScroll: true });
    scrollToJob(targetIdx);
  });

  window.addEventListener('scroll', requestTick, { passive: true });
  window.addEventListener('resize', function () {
    setHeight();
    currentJob = -1;
    measureNavTrack();
    requestTick();
  }, { passive: true });

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measureNavTrack);
  if (typeof ResizeObserver !== 'undefined' && navEl) {
    var navObserver = new ResizeObserver(function () { measureNavTrack(); requestTick(); });
    navObserver.observe(navEl);
    navBtns.forEach(function (btn) { navObserver.observe(btn); });
  }

  setHeight();
  measureNavTrack();
  if (!isMobile()) {
    activateJob(0, 1, { fast: true });
    onScroll();
  }
})();


// ─── 10. Smooth Scroll for Anchor Links ──────────────────────────
document.querySelectorAll('a[href*="#"]').forEach(function (anchor) {
  anchor.addEventListener('click', function (e) {
    var href = this.getAttribute('href');
    var hashIndex = href.indexOf('#');
    if (hashIndex === -1) return;

    var hash = href.substring(hashIndex);
    var path = href.substring(0, hashIndex);

    // Perform smooth scroll only on the main page (if path matches / or is empty)
    if (path === '' || path === '/' || path === window.location.pathname) {
      var target = document.querySelector(hash);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  });
});


// ─── 11. Photo Carousel Modal ─────────────────────────────────────
(function initCarousel() {
  var modal     = document.getElementById('carouselModal');
  var backdrop  = document.getElementById('carouselBackdrop');
  var closeBtn  = document.getElementById('carouselClose');
  var img       = document.getElementById('carouselImg');
  var glow      = document.getElementById('carouselGlow');
  var caption   = document.getElementById('carouselCaption');
  var prevBtn   = document.getElementById('carouselPrev');
  var nextBtn   = document.getElementById('carouselNext');
  var dotsWrap  = document.getElementById('carouselDots');
  var counterEl = document.getElementById('carouselCurrent');
  var thumbs    = document.querySelectorAll('.photo-thumb');

  if (!modal || !thumbs.length) return;

  var PHOTOS = Array.from(thumbs).map(function (btn) {
    var i = btn.querySelector('img');
    return { src: i.src, alt: i.alt };
  });

  var GLOW_COLORS = ['#9d5cff', '#00d4ff', '#7c3aed', '#ffb938'];

  var current = 0;
  var total   = PHOTOS.length;

  // Build dots
  PHOTOS.forEach(function (_, i) {
    var dot = document.createElement('button');
    dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
    dot.setAttribute('role', 'tab');
    dot.setAttribute('aria-label', 'Photo ' + (i + 1));
    dot.addEventListener('click', function () { goTo(i); });
    dotsWrap.appendChild(dot);
  });

  var dots = dotsWrap.querySelectorAll('.carousel-dot');

  function updateUI(idx) {
    // Animate transition
    img.classList.add('transitioning');
    caption.style.opacity = '0';

    setTimeout(function () {
      img.src     = PHOTOS[idx].src;
      img.alt     = PHOTOS[idx].alt;
      caption.textContent = PHOTOS[idx].alt;
      if (glow) glow.style.background = GLOW_COLORS[idx % GLOW_COLORS.length];
      if (counterEl) counterEl.textContent = idx + 1;

      img.classList.remove('transitioning');
      caption.style.opacity = '1';

      dots.forEach(function (d, i) { d.classList.toggle('active', i === idx); });
    }, 280);
  }

  function goTo(idx) {
    current = (idx + total) % total;
    updateUI(current);
  }

  function open(startIdx) {
    current = startIdx;
    img.src     = PHOTOS[current].src;
    img.alt     = PHOTOS[current].alt;
    caption.textContent = PHOTOS[current].alt;
    if (glow) glow.style.background = GLOW_COLORS[current % GLOW_COLORS.length];
    if (counterEl) counterEl.textContent = current + 1;
    dots.forEach(function (d, i) { d.classList.toggle('active', i === current); });

    modal.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
    img.focus();
  }

  function close() {
    modal.setAttribute('hidden', '');
    document.body.style.overflow = '';
  }

  // Thumb click → open
  thumbs.forEach(function (btn) {
    btn.addEventListener('click', function () {
      open(parseInt(this.dataset.index, 10));
    });
  });

  // Controls
  prevBtn.addEventListener('click', function () { goTo(current - 1); });
  nextBtn.addEventListener('click', function () { goTo(current + 1); });
  closeBtn.addEventListener('click', close);
  backdrop.addEventListener('click', close);

  // Keyboard
  document.addEventListener('keydown', function (e) {
    if (modal.hasAttribute('hidden')) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); goTo(current + 1); }
    if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   { e.preventDefault(); goTo(current - 1); }
    if (e.key === 'Escape') close();
  });

  // Touch swipe
  var touchStartX = null;
  modal.addEventListener('touchstart', function (e) {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });
  modal.addEventListener('touchend', function (e) {
    if (touchStartX === null) return;
    var dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 40) { goTo(dx < 0 ? current + 1 : current - 1); }
    touchStartX = null;
  }, { passive: true });
})();


// ─── 12. Projects — live previews + tilt ─────────────────────────
(function initProjectPreviews() {
  var previews = document.querySelectorAll('.proj-preview--live');
  if (!previews.length) return;

  var DESKTOP_W = 1280;
  var DESKTOP_H = 800;
  var LOAD_TIMEOUT = 10000;

  function fitFrame(preview) {
    var stage = preview.querySelector('.proj-preview-stage');
    var frame = preview.querySelector('.proj-preview-frame');
    if (!stage || !frame) return;
    // Fill the stage width edge-to-edge; crop overflow vertically if needed
    var scale = stage.clientWidth / DESKTOP_W;
    if (scale <= 0) return;
    frame.style.width = DESKTOP_W + 'px';
    frame.style.height = DESKTOP_H + 'px';
    frame.style.transform = 'scale(' + scale + ')';
  }

  function showFallback(preview) {
    preview.classList.add('is-fallback');
    preview.classList.remove('is-loaded');
    var fallback = preview.querySelector('.proj-preview-fallback');
    if (fallback) fallback.hidden = false;
  }

  function markLoaded(preview) {
    preview.classList.add('is-loaded');
    preview.classList.remove('is-fallback');
  }

  function loadPreview(preview) {
    if (preview.dataset.booted) return;
    preview.dataset.booted = '1';

    var frame = preview.querySelector('.proj-preview-frame');
    if (!frame) return;

    var src = frame.getAttribute('data-src');
    if (!src) {
      showFallback(preview);
      return;
    }

    fitFrame(preview);

    var settled = false;
    var timer = setTimeout(function () {
      if (settled) return;
      // Still loading after timeout — keep trying, but if never loads
      // the user at least sees the loader; hard fail only on error events
    }, LOAD_TIMEOUT);

    frame.addEventListener('load', function () {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      // Blank / blocked frames often still fire load with no contentDocument access
      try {
        // Same-origin check — cross-origin throws, which is fine (means it framed)
        void frame.contentWindow.location.href;
      } catch (e) {
        // Cross-origin: successfully embedded
      }
      markLoaded(preview);
      fitFrame(preview);
    });

    frame.addEventListener('error', function () {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      showFallback(preview);
    });

    frame.src = src;

    // Safety: if still not loaded after a long wait, fall back to mock
    setTimeout(function () {
      if (!preview.classList.contains('is-loaded') && !preview.classList.contains('is-fallback')) {
        showFallback(preview);
      }
    }, 14000);
  }

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          loadPreview(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '200px 0px', threshold: 0.05 });

    previews.forEach(function (p) { io.observe(p); });
  } else {
    previews.forEach(loadPreview);
  }

  window.addEventListener('resize', function () {
    previews.forEach(fitFrame);
  }, { passive: true });

  // Soft tilt on the chrome frame (not while interacting with shield)
  if (
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
    !window.matchMedia('(pointer: coarse)').matches
  ) {
    document.querySelectorAll('.proj-hero').forEach(function (hero) {
      var preview = hero.querySelector('.proj-preview');
      if (!preview) return;
      var flip = hero.classList.contains('proj-hero--flip');

      hero.addEventListener('mousemove', function (e) {
        var rect = hero.getBoundingClientRect();
        var x = (e.clientX - rect.left) / rect.width - 0.5;
        var y = (e.clientY - rect.top) / rect.height - 0.5;
        var rotY = (flip ? 4 : -4) + x * 6;
        var rotX = 2 - y * 5;
        preview.style.transform =
          'perspective(900px) rotateY(' + rotY + 'deg) rotateX(' + rotX + 'deg) translateY(-4px)';
      });

      hero.addEventListener('mouseleave', function () {
        preview.style.transform = '';
      });
    });
  }
})();
