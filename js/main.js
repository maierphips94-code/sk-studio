// ── Easing ────────────────────────────────────────
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// ── Leistungen – Sticky Scroll Animation ──────────
const leistungenSection = document.getElementById('leistungen');
const leistungSteps     = document.querySelectorAll('.leistung-step');
const leistungDots      = document.querySelectorAll('.leistung-dot');
const leistungCounter   = document.getElementById('leistung-counter');

// ── Scroll-Snapping State ──
let currentSnappedStep = -1;
let isSnapping         = false;
let snapTimeout        = null;
let lastScrollY        = window.scrollY;
let scrollDirection    = 1;  // 1 = down, -1 = up
let manualScrollActive = false;

function getSnapPosition(stepIndex) {
  const sectionTop = leistungenSection.offsetTop;
  const scrollable = leistungenSection.offsetHeight - window.innerHeight;
  return sectionTop + ((stepIndex + 0.35) / leistungSteps.length) * scrollable;
}

function smoothScrollTo(targetY, duration) {
  const startY    = window.scrollY;
  const distance  = targetY - startY;
  const startTime = performance.now();
  // CSS scroll-behavior: smooth würde jeden scrollTo-Aufruf nochmals animieren
  // → hier explizit deaktivieren damit nur unsere eigene Animation läuft
  document.documentElement.style.scrollBehavior = 'auto';

  function step(currentTime) {
    const elapsed = currentTime - startTime;
    const t       = Math.min(elapsed / duration, 1);
    const eased   = easeInOutCubic(t);

    window.scrollTo(0, startY + distance * eased);

    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      document.documentElement.style.scrollBehavior = '';
    }
  }

  requestAnimationFrame(step);
}

function snapTo(stepIndex) {
  isSnapping = true;
  currentSnappedStep = stepIndex;

  const targetY = getSnapPosition(stepIndex);
  smoothScrollTo(targetY, 500);

  clearTimeout(snapTimeout);
  snapTimeout = setTimeout(() => { isSnapping = false; }, 700);
}

function updateLeistungen() {
  if (!leistungenSection || !leistungSteps.length) return;
  if (window.innerWidth < 768) return;
  if (manualScrollActive) return;

  const sectionTop = leistungenSection.offsetTop;
  const scrollable = leistungenSection.offsetHeight - window.innerHeight;

  if (window.scrollY + window.innerHeight < sectionTop) return;
  if (window.scrollY > sectionTop + leistungenSection.offsetHeight) return;

  const progress = Math.max(0, Math.min(1, (window.scrollY - sectionTop) / scrollable));
  const total    = leistungSteps.length;
  const idx      = Math.min(Math.floor(progress * total), total - 1);

  // ── Scroll-Richtung erkennen ──
  scrollDirection = (window.scrollY >= lastScrollY) ? 1 : -1;
  lastScrollY = window.scrollY;

  // ── Snap-Logik ──
  if (!isSnapping) {
    const localProg = progress * total - idx;

    if (scrollDirection === 1) {
      // ── VORWÄRTS ──

      // 1) Neuen Step einrasten (Einblend-Phase)
      if (idx !== currentSnappedStep && localProg > 0.05 && localProg < 0.25) {
        snapTo(idx);
      }

      // 2) Aus Deadzone heraus → zum NÄCHSTEN Step snappen
      if (idx === currentSnappedStep && localProg > 0.72 && idx + 1 < total) {
        currentSnappedStep = -1;
        snapTo(idx + 1);
      }

    } else {
      // ── RÜCKWÄRTS ──

      // 1) Von oben in Step zurückkehren (Exit-Seite)
      if (idx !== currentSnappedStep && localProg > 0.5 && localProg < 0.9) {
        snapTo(idx);
      }

      // 2) idx hat sich geändert, Step von unten neu betreten
      if (idx < currentSnappedStep && localProg > 0.05 && localProg < 0.5) {
        snapTo(idx);
      }

      // 3) Aus Deadzone nach oben heraus → zum VORHERIGEN Step snappen
      if (idx === currentSnappedStep && localProg < 0.28 && idx - 1 >= 0) {
        currentSnappedStep = -1;
        snapTo(idx - 1);
      }
    }
  }

  // Grenzen der Section: komplett zurücksetzen
  if (progress > 0.97 || progress < 0.02) {
    currentSnappedStep = -1;
  }

  leistungSteps.forEach((step, i) => {
    step.classList.toggle('is-active', i === idx);

    const localProgress = Math.max(0, Math.min(1, progress * total - i));

    // ── Slot-Machine: Zahl mit Pause am Peak ──
    const numEl = step.querySelector('.leistung-number');
    if (numEl) {
      let yOffset, numOpacity;
      const numShift = -15;
      if (localProgress <= 0.3) {
        const t = easeInOutCubic(localProgress / 0.3);
        yOffset    = 120 * (1 - t) + numShift;
        numOpacity = t * 0.25;
      } else if (localProgress <= 0.7) {
        yOffset    = numShift;
        numOpacity = 0.25;
      } else {
        const t = easeInOutCubic((localProgress - 0.7) / 0.3);
        yOffset    = -120 * t + numShift;
        numOpacity = 0.25 * (1 - t);
      }
      if (i !== idx && i !== idx + 1 && i !== idx - 1) numOpacity = 0;
      numEl.style.transform = `translate3d(0, ${Math.round(yOffset)}px, 0)`;
      numEl.style.opacity   = numOpacity;
    }

    // ── Content: Fade mit eigener Deadzone ──
    const contentEl = step.querySelector('.leistung-content');
    if (contentEl) {
      let contentOpacity = 0;
      if (i === idx) {
        if (localProgress <= 0.15) {
          contentOpacity = localProgress / 0.15;
        } else if (localProgress <= 0.85) {
          contentOpacity = 1;
        } else {
          contentOpacity = (1 - localProgress) / 0.15;
        }
      }
      contentEl.style.opacity = contentOpacity;
    }
  });

  // ── Dots + Counter ──
  leistungDots.forEach((dot, i) => {
    if (i === idx) {
      dot.style.width = '24px';
      dot.style.opacity = '1';
    } else {
      dot.style.width = '8px';
      dot.style.opacity = '0.2';
    }
  });

  if (leistungCounter) {
    leistungCounter.textContent = `0${idx + 1} / 0${total}`;
  }

}

// ── Was ich wirklich tue – Karussell ──────────────────
const wirklichSection = document.getElementById('wirklich');
const wirklichCards   = document.querySelectorAll('.wirklich-card');
let   wirklichReady   = false;

function wirklichLayout() {
  const wrapper = wirklichSection && wirklichSection.querySelector('.wirklich-wrapper');
  if (!wrapper || !wirklichCards.length) return null;
  const cardWidth   = wirklichCards[0].offsetWidth;
  const wrapperLeft = wrapper.getBoundingClientRect().left;
  // Aktive Kachel mittig im Viewport zentrieren
  const centerX     = Math.round(window.innerWidth / 2 - cardWidth / 2 - wrapperLeft);
  // Peek-Kachel halb am Bildschirmrand: slide = halbe Viewport-Breite
  const slide       = Math.round(window.innerWidth / 2);
  return { centerX, cardWidth, slide };
}

function updateWirklich() {
  if (!wirklichSection || !wirklichCards.length) return;
  if (window.innerWidth < 768) return;

  const layout = wirklichLayout();
  if (!layout) return;
  const { centerX, slide } = layout;

  const sectionTop = wirklichSection.offsetTop;
  const scrollable = wirklichSection.offsetHeight - window.innerHeight;
  const progress   = Math.max(0, Math.min(1, (window.scrollY - sectionTop) / scrollable));
  const total      = wirklichCards.length;

  // Smooth card-Index mit Dwell-Zonen
  const scaled = progress * total;
  let rawIdx   = 0;
  for (let i = 0; i < total - 1; i++) {
    if (scaled >= i + 1.25) {
      rawIdx = i + 1;
    } else if (scaled >= i + 0.75) {
      rawIdx = i + easeInOutCubic((scaled - i - 0.75) / 0.5);
    }
  }
  rawIdx = Math.max(0, Math.min(total - 1, rawIdx));

  wirklichCards.forEach((card, i) => {
    const relPos  = i - rawIdx;                         // 0=aktiv, 1=rechts, -1=links
    const x       = centerX + Math.round(relPos * slide);
    // Aktiv: 1.0 | Peek (±1): 0.28 | weiter weg: 0
    const absRel  = Math.abs(relPos);
    const opacity = absRel <= 1
      ? 1 - (1 - 0.28) * absRel                // 1→0.28: kontinuierlich von Mitte zu Peek
      : Math.max(0, 0.28 * (2 - absRel));       // 0.28→0: weiter nach außen

    card.style.transform = `translateX(${x}px)`;
    if (wirklichReady || i !== 0) {
      card.style.opacity = opacity.toFixed(2);
    }
  });

  // ── Dots + Counter ──
  const activeIdx = Math.round(rawIdx);
  document.querySelectorAll('.wirklich-dot').forEach((dot, i) => {
    dot.style.width   = i === activeIdx ? '24px' : '8px';
    dot.style.opacity = i === activeIdx ? '1'    : '0.2';
  });
  const counter = document.getElementById('wirklich-counter');
  if (counter) counter.textContent = `0${activeIdx + 1} / 0${total}`;
}

let rafPendingWirklich = false;
function onScrollWirklich() {
  if (!rafPendingWirklich) {
    rafPendingWirklich = true;
    requestAnimationFrame(() => { updateWirklich(); rafPendingWirklich = false; });
  }
}

window.addEventListener('scroll', onScrollWirklich, { passive: true });
window.addEventListener('resize', updateWirklich,  { passive: true });
updateWirklich();

let rafPending = false;
function onScrollLeistungen() {
  if (!rafPending) {
    rafPending = true;
    requestAnimationFrame(() => {
      updateLeistungen();
      rafPending = false;
    });
  }
}

window.addEventListener('scroll', onScrollLeistungen, { passive: true });
window.addEventListener('resize', updateLeistungen, { passive: true });
updateLeistungen();

document.addEventListener('DOMContentLoaded', () => {

  // ── Anchor-Links: Header-Offset zuverlässig berücksichtigen ──
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const targetId = link.getAttribute('href').slice(1);
      if (!targetId) return;
      const target = document.getElementById(targetId);
      if (!target) return;
      e.preventDefault();

      // Snap-Logik für alle Anchor-Navigationen deaktivieren
      manualScrollActive = true;
      isSnapping = true;
      currentSnappedStep = -1;
      setTimeout(() => { manualScrollActive = false; isSnapping = false; }, 1000);

      if (targetId === 'hero') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      const headerHeight = 64;
      const top = target.getBoundingClientRect().top + window.scrollY - headerHeight;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

  // ── Hash-Navigation NUR bei Cross-Page-Navigation ──
  if (window.location.hash) {
    const isReload = (performance.getEntriesByType('navigation')[0]?.type === 'reload');

    if (!isReload) {
      manualScrollActive = true;
      isSnapping = true;
      setTimeout(() => {
        const hash   = window.location.hash.slice(1);
        const target = document.getElementById(hash);
        if (target) {
          const headerHeight = 64;
          const top = target.getBoundingClientRect().top + window.scrollY - headerHeight;
          window.scrollTo({ top, behavior: 'smooth' });
        }
        setTimeout(() => { manualScrollActive = false; isSnapping = false; }, 1000);
      }, 300);
    } else {
      history.replaceState(null, '', window.location.pathname);
    }
  }

  // Scroll-Fade-In
  const fadeObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          fadeObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );
  document.querySelectorAll('[data-fade]').forEach(el => fadeObserver.observe(el));

  // ── Wirklich: Kachel 01 beim ersten Einblenden faden (wie data-fade) ──
  if (wirklichSection && wirklichCards.length) {
    // Initiale Positionen setzen (vor dem Einblenden)
    const l0 = wirklichLayout();
    if (l0 && window.innerWidth >= 768) {
      const { centerX, slide } = l0;
      wirklichCards.forEach((card, i) => {
        card.style.transform = `translateX(${centerX + i * slide}px)`;
      });
    }
    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !wirklichReady && window.innerWidth >= 768) {
        wirklichReady = true;
        const l = wirklichLayout();
        if (!l) return;
        const { centerX, slide } = l;
        // Kachel 01: normales Einblenden
        wirklichCards[0].style.transition = 'opacity 0.7s ease, transform 0.7s ease';
        wirklichCards[0].style.opacity    = '1';
        wirklichCards[0].style.transform  = `translateX(${centerX}px)`;
        // Peek-Kachel rechts leicht einblenden
        if (wirklichCards[1]) {
          wirklichCards[1].style.transition = 'opacity 0.5s ease 0.2s';
          wirklichCards[1].style.opacity    = '0.28';
          wirklichCards[1].style.transform  = `translateX(${centerX + slide}px)`;
        }
        setTimeout(() => {
          wirklichCards.forEach(c => { c.style.transition = ''; });
        }, 900);
      }
    }, { threshold: 0 }).observe(wirklichSection);
  }

  // ── Feature Carousel (Was ich wirklich tue) – Sticky Scroll ──
  (function() {
    const FEATURES = [
      {
        num: '01',
        label: 'Strategische Empathie',
        sub: 'Verstehen statt nur zuhören',
        body: 'Echte Effizienz entsteht durch Mitdenken. Ich höre nicht nur zu, sondern tauche tief in Ihre Welt ein, um Ihre Ziele wirklich zu durchdringen. Dieser Austausch auf Augenhöhe ist das Fundament für das Vertrauen meiner Kunden.',
        tags: [
          { label: 'Markenberatung' },
          { label: 'Konzeption' },
          { label: 'Briefing-Analyse' },
        ],
        img: 'assets/images/Über Mich/01.jpg',
      },
      {
        num: '02',
        label: 'Analytische Klarheit',
        sub: 'Den Kern finden',
        body: 'In der Komplexität moderner Kommunikation ist Klarheit die wertvollste Währung. Ich filtere das Wesentliche heraus, ordne Ihre Botschaften und schaffe Struktur – ohne Buzzword-Bingo und Verwirrung.',
        tags: [
          { label: 'Analyse' },
          { label: 'Ideen' },
          { label: 'Konzeption' },
        ],
        img: 'assets/images/Über Mich/02.jpg',
      },
      {
        num: '03',
        label: 'Multidisziplinäres Handwerk',
        sub: 'Erst denken, dann handeln',
        body: 'Ich setze um – ohne Reibungsverluste. Briefingwege sind extrem kurz, weil derjenige, der die Strategie entwickelt, auch selbst Hand anlegt: Foto, Video, Animation, Text, Grafikdesign oder KI-Tools.',
        tags: [
          { label: 'Foto',              href: 'fotografie.html' },
          { label: 'Video',             href: 'videografie.html' },
          { label: 'Podcast' },
          { label: 'Animation' },
          { label: 'Text & Sprecher' },
          { label: 'Grafikdesign' },
          { label: 'Projektmanagement' },
          { label: 'KI-Tools' },
          { label: 'Fine Art',          href: 'fine-art.html' },
        ],
        img: 'assets/images/Über Mich/03.jpg',
      },
    ];

    const ITEM_H = 65;
    const N      = FEATURES.length;

    const fcSection = document.getElementById('feature-carousel');
    const track     = document.getElementById('fc-label-track');
    const cardWrap  = document.getElementById('fc-card-wrap');
    if (!fcSection || !track || !cardWrap) return;

    let step          = 0;
    let prevStep      = 0;
    let fcIgnoreScroll = false;

    function curIdx() { return ((step % N) + N) % N; }

    function wdist(i, cur) {
      let d = i - cur;
      if (d >  N / 2) d -= N;
      if (d < -N / 2) d += N;
      return d;
    }

    // ── Navigation: direkt animieren + Scroll still synchronisieren ──
    function goToStep(targetStep) {
      if (targetStep === curIdx()) return;
      step = targetStep;
      render();
      // Scrollposition still synchronisieren damit Scroll-Logik konsistent bleibt
      if (window.innerWidth >= 768) {
        const sectionTop = fcSection.offsetTop;
        const scrollable = fcSection.offsetHeight - window.innerHeight;
        if (scrollable > 0) {
          fcIgnoreScroll = true;
          document.documentElement.style.scrollBehavior = 'auto';
          window.scrollTo(0, sectionTop + ((targetStep + 0.5) / N) * scrollable);
          document.documentElement.style.scrollBehavior = '';
          setTimeout(function() { fcIgnoreScroll = false; }, 120);
        }
      }
    }

    // ── Label-Buttons ──
    const labelEls = FEATURES.map(function(f, i) {
      const btn = document.createElement('button');
      btn.className = 'fc-label';
      btn.type = 'button';
      btn.innerHTML =
        '<span class="fc-label-num">' + f.num + '</span>' +
        '<span>' + f.label + '</span>';
      btn.addEventListener('click', function() {
        if (i !== curIdx()) goToStep(i);
      });
      track.appendChild(btn);
      return btn;
    });

    // ── Tag-Chips HTML ──
    function buildTags(tags) {
      return '<ul style="display:flex;flex-wrap:wrap;gap:0.375rem;margin-top:1rem;">' +
        tags.map(function(t) {
          var inner = t.href
            ? '<a href="' + t.href + '" style="color:inherit;text-decoration:none;" class="hover:text-paper transition-colors duration-200 inline-flex items-center gap-1">' + t.label + ' <span aria-hidden="true">↗</span></a>'
            : t.label;
          return '<li class="font-body" style="font-size:0.75rem;letter-spacing:0.05em;' +
            'color:rgba(249,248,246,0.7);background:rgba(249,248,246,0.1);padding:0.25rem 0.75rem;">' +
            inner + '</li>';
        }).join('') +
        '</ul>';
    }

    // ── Bild-Karten ──
    const cardEls = FEATURES.map(function(f, i) {
      const div = document.createElement('div');
      div.className = 'fc-card';
      div.innerHTML =
        '<div class="fc-card-inner">' +
        '<img src="' + f.img + '" alt="' + f.label + '" loading="lazy" ' +
        'class="w-full h-full object-cover" style="will-change:filter;transition:filter 0.7s ease;">' +
        '<div class="fc-overlay" style="position:absolute;inset:0;' +
        'background:linear-gradient(to bottom,transparent 15%,rgba(10,10,10,0.94) 100%);' +
        'opacity:0;transition:opacity 0.6s ease;"></div>' +
        '<div class="fc-info" style="position:absolute;inset-x:0;bottom:0;padding:1.75rem 1.75rem 2.75rem;' +
        'opacity:0;transform:translateY(8px);' +
        'transition:opacity 0.6s ease,transform 0.6s ease;">' +
        '<p class="font-body" style="font-size:0.6875rem;letter-spacing:0.2em;text-transform:uppercase;' +
        'color:rgba(249,248,246,0.5);margin-bottom:0.35rem;">' + f.num + ' · ' + f.label + '</p>' +
        '<p class="font-display font-bold" style="font-size:1.45rem;color:#f9f8f6;line-height:1.2;margin-bottom:0.75rem;">' + f.sub + '.</p>' +
        '<p class="font-body" style="font-size:1rem;color:rgba(249,248,246,0.75);line-height:1.625;">' + f.body + '</p>' +
        buildTags(f.tags) +
        '</div>' +
        '</div>';
      div.addEventListener('click', function() {
        if (i !== curIdx()) goToStep(i);
      });
      cardWrap.appendChild(div);
      return div;
    });

    // ── Render ──
    function render() {
      const cur  = curIdx();
      const prev = prevStep;

      labelEls.forEach(function(btn, i) {
        const d      = wdist(i, cur);
        const active = i === cur;
        btn.style.transform       = 'translateY(' + (d * ITEM_H) + 'px)';
        btn.style.opacity         = Math.max(0, 1 - Math.abs(d) * 0.28);
        btn.style.backgroundColor = 'transparent';
        btn.style.borderColor     = 'transparent';
        btn.style.color           = active ? '#0a0a0a' : 'rgba(10,10,10,0.38)';
        btn.style.fontWeight      = active ? '700'     : '400';
        btn.style.fontSize        = active ? '1rem'    : '0.8rem';
      });

      cardEls.forEach(function(card, i) {
        const d      = wdist(i, cur);
        const active = d === 0;
        const near   = Math.abs(d) === 1;
        const tx     = active ? 0 : (d < 0 ? -110 : 110);
        const sc     = active ? 1 : (near ? 0.86 : 0.72);
        const op     = active ? 1 : (near ? 0.35 : 0);
        const ro     = 0;

        // ── Crossing-Kachel: war near, bleibt near, wechselt aber Seite ──
        // → kurz ausblenden, teleportieren, wieder einblenden – kein sichtbarer Querflug
        const prevD      = wdist(i, prev);
        const isCrossing = prev !== cur &&
                           Math.abs(prevD) === 1 && Math.abs(d) === 1 &&
                           prevD !== d;

        if (isCrossing) {
          card.style.transition = 'opacity 0s, transform 0s';
          card.style.opacity    = '0';
          card.style.transform  = 'translateX(' + tx + 'px) scale(' + sc + ') rotate(' + ro + 'deg)';
          card.style.zIndex     = '10';
          card.style.pointerEvents = 'auto';
          card.style.cursor     = 'pointer';
          card.classList.remove('is-active');
          void card.offsetHeight; // reflow erzwingen
          card.style.transition = ''; // CSS-Klassen-Transition wieder aktiv
          requestAnimationFrame(function() {
            card.style.opacity = String(op);
          });
          return;
        }

        card.style.transform     = 'translateX(' + tx + 'px) scale(' + sc + ') rotate(' + ro + 'deg)';
        card.style.opacity       = String(op);
        card.style.zIndex        = active ? '20' : (near ? '10' : '0');
        card.style.pointerEvents = (active || near) ? 'auto' : 'none';
        card.style.cursor        = near ? 'pointer' : 'default';
        card.classList.toggle('is-active', active);

        const img     = card.querySelector('img');
        const overlay = card.querySelector('.fc-overlay');
        const info    = card.querySelector('.fc-info');
        if (img)     img.style.filter      = active ? 'none' : 'grayscale(100%) brightness(0.75)';
        if (overlay) overlay.style.opacity = active ? '1' : '0';
        if (info) {
          info.style.opacity   = active ? '1' : '0';
          info.style.transform = active ? 'translateY(0)' : 'translateY(8px)';
        }
      });

      prevStep = cur;
    }

    // ── Scroll-getriebene Steuerung (Desktop) ──
    function updateFcScroll() {
      if (fcIgnoreScroll || window.innerWidth < 768) return;
      const sectionTop = fcSection.offsetTop;
      const scrollable = fcSection.offsetHeight - window.innerHeight;
      if (scrollable <= 0) return;

      const progress = Math.max(0, Math.min(1, (window.scrollY - sectionTop) / scrollable));
      const newStep  = Math.min(Math.floor(progress * N), N - 1);

      if (newStep !== step) {
        // Immer nur einen Schritt weiter – garantiert saubere Animation
        const dir = newStep > step ? 1 : -1;
        step = ((step + dir) % N + N) % N;
        render();
      }
    }

    let fcRafPending = false;
    window.addEventListener('scroll', function() {
      if (!fcRafPending) {
        fcRafPending = true;
        requestAnimationFrame(function() { updateFcScroll(); fcRafPending = false; });
      }
    }, { passive: true });
    window.addEventListener('resize', updateFcScroll, { passive: true });

    render();
    updateFcScroll();
  }());

  // Header: transparent über Hero-Video (nur auf index.html), sonst immer paper
  const header   = document.querySelector('header');
  const hero     = document.getElementById('hero');
  const logo     = document.getElementById('header-logo');

  // Alle Nav-Links und Burger-Bars im Header
  const navLinks   = header ? header.querySelectorAll('nav ul a, nav .nav-cta') : [];
  const burgerBars = header ? header.querySelectorAll('.burger-bar') : [];

  if (header && hero) {
    // Homepage: header reagiert auf Scroll über Video-Hero
    const onScroll = () => {
      const heroBottom = hero.getBoundingClientRect().bottom;
      const overHero   = heroBottom > 64;

      header.classList.toggle('bg-transparent',    overHero);
      header.classList.toggle('border-transparent', overHero);
      header.classList.toggle('bg-paper/95',       !overHero);
      header.classList.toggle('border-stone',      !overHero);

      // Logo: invertiert (weiß) über Video, multiply auf hellem Header
      if (logo) {
        logo.style.mixBlendMode = overHero ? 'normal' : 'multiply';
        logo.style.filter       = overHero ? 'invert(1)' : 'none';
      }

      // Nav-Links: hell über Video, Standard-Farbe auf paper
      navLinks.forEach(link => {
        // Aktiven Link (aria-current) nicht überschreiben
        if (link.getAttribute('aria-current') === 'page') return;
        link.style.color = overHero ? 'rgba(249,248,246,0.75)' : '';
      });

      // Burger-Bars: weiß über Video, dunkel auf paper
      burgerBars.forEach(bar => {
        bar.style.backgroundColor = overHero ? 'rgba(249,248,246,0.9)' : '';
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

  } else if (header) {
    // Unterseiten: header immer paper – keine Scroll-Logik nötig
    header.classList.add('bg-paper/95', 'border-stone');
  }

});
