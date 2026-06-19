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
  var navLinks  = document.querySelectorAll('.nav-link[href^="#"]');
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
      link.classList.toggle('active', link.getAttribute('href') === '#' + current);
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
        body: JSON.stringify({ name: name, email: email, message: message }),
      });

      var data = await res.json();

      if (data.success) {
        status.textContent = '✓ Message sent! I\'ll be in touch soon.';
        status.className   = 'form-status success';
        form.reset();
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
  if (!section || !container) return;

  // Only activate on desktop (>768px)
  var isMobile = function () { return window.innerWidth <= 768; };

  var cards        = section.querySelectorAll('.exp-card');
  var navBtns      = section.querySelectorAll('.exp-nav-btn');
  var progressFill = document.getElementById('expProgressFill');
  var navTrackFill = document.getElementById('expNavFill');
  var counter      = document.getElementById('expCurrent');
  var numJobs      = cards.length;
  var currentJob   = -1;

  // Give each scroll-slot ~1.3 viewport heights
  var JOB_VH = 1.3;

  function setHeight() {
    if (isMobile()) {
      container.style.height = '';
      return;
    }
    container.style.height = (window.innerHeight * JOB_VH * numJobs + window.innerHeight * 0.5) + 'px';
  }

  function activateJob(idx) {
    if (idx === currentJob) return;
    currentJob = idx;

    cards.forEach(function (card, i) {
      card.classList.toggle('active', i === idx);
    });
    navBtns.forEach(function (btn, i) {
      btn.classList.toggle('active', i === idx);
    });

    if (counter) {
      counter.textContent = String(idx + 1).padStart(2, '0');
    }
  }

  function onScroll() {
    if (isMobile()) return;

    var rect      = section.getBoundingClientRect();
    var scrolled  = -rect.top;
    var maxScroll = container.offsetHeight - window.innerHeight;
    if (maxScroll <= 0) return;

    var progress = Math.max(0, Math.min(1, scrolled / maxScroll));

    // Progress bar
    if (progressFill) progressFill.style.width = (progress * 100) + '%';

    // Nav track fill
    if (navTrackFill) navTrackFill.style.height = (progress * 100) + '%';

    // Active job index
    var raw = progress * numJobs;
    var idx = Math.min(numJobs - 1, Math.floor(raw));
    activateJob(idx);
  }

  // Nav button click — scroll to that job's position in the section
  navBtns.forEach(function (btn, i) {
    btn.addEventListener('click', function () {
      if (isMobile()) return;
      var maxScroll  = container.offsetHeight - window.innerHeight;
      var targetY    = section.offsetTop + (i / numJobs) * maxScroll + 2;
      window.scrollTo({ top: targetY, behavior: 'smooth' });
    });
  });

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () { setHeight(); onScroll(); }, { passive: true });

  setHeight();
  activateJob(0);
  onScroll();
})();


// ─── 10. Smooth Scroll for Anchor Links ──────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
  anchor.addEventListener('click', function (e) {
    var target = document.querySelector(this.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
