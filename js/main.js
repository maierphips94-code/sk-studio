// ── Easing ────────────────────────────────────────
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// ── Leistungen – Sticky Scroll Animation ──────────
const leistungenSection = document.getElementById('leistungen');
const leistungSteps     = document.querySelectorAll('.leistung-step');
const leistungDots      = document.querySelectorAll('.leistung-dot');
const leistungCounter   = document.getElementById('leistung-counter');

function updateLeistungen() {
  if (!leistungenSection || !leistungSteps.length) return;
  if (window.innerWidth < 768) return;

  const sectionTop = leistungenSection.offsetTop;
  const scrollable = leistungenSection.offsetHeight - window.innerHeight;

  if (window.scrollY + window.innerHeight < sectionTop) return;
  if (window.scrollY > sectionTop + leistungenSection.offsetHeight) return;

  const progress = Math.max(0, Math.min(1, (window.scrollY - sectionTop) / scrollable));
  const total    = leistungSteps.length;
  const idx      = Math.min(Math.floor(progress * total), total - 1);

  leistungSteps.forEach((step, i) => {
    step.classList.toggle('is-active', i === idx);

    const localProgress = Math.max(0, Math.min(1, progress * total - i));

    // ── Slot-Machine: Zahl mit Pause am Peak ──
    const numEl = step.querySelector('.leistung-number');
    if (numEl) {
      let yOffset, numOpacity;
      if (localProgress <= 0.3) {
        const t = easeInOutCubic(localProgress / 0.3);
        yOffset    = -120 * t;
        numOpacity = t * 0.25;
      } else if (localProgress <= 0.7) {
        yOffset    = -120;
        numOpacity = 0.25;
      } else {
        const t = easeInOutCubic((localProgress - 0.7) / 0.3);
        yOffset    = -120 - 120 * t;
        numOpacity = 0.25 * (1 - t);
      }
      if (i !== idx && i !== idx + 1 && i !== idx - 1) numOpacity = 0;
      numEl.style.transform = `translateY(${yOffset}px)`;
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

window.addEventListener('scroll', updateLeistungen, { passive: true });
window.addEventListener('resize', updateLeistungen, { passive: true });
updateLeistungen();

document.addEventListener('DOMContentLoaded', () => {

  // ── Anchor-Links: Header-Offset zuverlässig berücksichtigen ──
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const targetId = link.getAttribute('href').slice(1);
      const target   = document.getElementById(targetId);
      if (!target) return;
      e.preventDefault();
      const headerHeight = 64; // h-16
      const top = target.getBoundingClientRect().top + window.scrollY - headerHeight;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

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
