/* ═══════════════════════════════════════════
   EMARA ESTATES — Script principal
   ═══════════════════════════════════════════ */

// ═══ PRELOADER ═══
setTimeout(() => { document.getElementById('preloader').classList.add('out'); }, 2000);
setTimeout(() => { document.getElementById('preloader').style.display = 'none'; }, 2800);

// ═══ NAV SCROLL ═══
window.addEventListener('scroll', () => {
  const nav = document.getElementById('nav');
  if (nav) nav.classList.toggle('scrolled', window.scrollY > 80);
});

// ═══ CURSOR CUSTOM ═══
const cursor = document.getElementById('cursor');
if (cursor) {
  document.addEventListener('mousemove', e => {
    cursor.style.left = e.clientX - 10 + 'px';
    cursor.style.top  = e.clientY - 10 + 'px';
    cursor.classList.add('visible');
  });
  document.querySelectorAll('a, button, .property-card, .quartier-card, .filter-tab, .service-card, .faq-question').forEach(el => {
    el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
    el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
  });
}

// ═══ REVEAL AU SCROLL ═══
const revealObs = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      revealObs.unobserve(e.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale').forEach(el => revealObs.observe(el));

// ═══ FILTRES DES BIENS ═══
document.querySelectorAll('.filter-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const filter = tab.dataset.filter;
    document.querySelectorAll('.property-card').forEach(card => {
      card.style.display = (!filter || filter === 'tous' || card.dataset.type === filter) ? '' : 'none';
    });
  });
});

// ═══ COMPTEURS ANIMÉS ═══
const counterObs = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.querySelectorAll('.num').forEach(num => {
        const text = num.textContent;
        const match = text.match(/(\d+)/);
        if (match) {
          const target = parseInt(match[0]);
          const suffix = text.replace(match[0], '');
          let current = 0;
          const step = Math.ceil(target / 50);
          const timer = setInterval(() => {
            current += step;
            if (current >= target) { current = target; clearInterval(timer); }
            num.textContent = current + suffix;
          }, 30);
        }
      });
      counterObs.unobserve(e.target);
    }
  });
}, { threshold: 0.3 });

document.querySelectorAll('.stats-bar').forEach(el => counterObs.observe(el));

// ═══ PARALLAX DIVIDER ═══
window.addEventListener('scroll', () => {
  const pd = document.querySelector('.pd-bg');
  if (pd) {
    const rect = pd.parentElement.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      const progress = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
      pd.style.transform = 'translateY(' + (progress * 60 - 30) + 'px)';
    }
  }
});

// ═══ SMOOTH SCROLL ═══
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    const target = document.querySelector(a.getAttribute('href'));
    if (target) target.scrollIntoView({ behavior: 'smooth' });
  });
});

// ═══ FAQ ACCORDION ═══
function toggleFaq(el) {
  const item   = el.parentElement;
  const answer = item.querySelector('.faq-answer');
  const isOpen = item.classList.contains('open');
  // Fermer tous
  document.querySelectorAll('.faq-item.open').forEach(i => {
    i.classList.remove('open');
    i.querySelector('.faq-answer').style.maxHeight = '0';
  });
  // Ouvrir si était fermé
  if (!isOpen) {
    item.classList.add('open');
    answer.style.maxHeight = answer.scrollHeight + 'px';
  }
}

// ═══ MAP SECTION ANIMATIONS ═══
const mapSection = document.querySelector('.map-section');
if (mapSection) {
  const mapObs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const mapTitle   = document.getElementById('mapTitle');
        const mapDivider = document.getElementById('mapDivider');
        if (mapTitle)   setTimeout(() => mapTitle.classList.add('visible'), 400);
        if (mapDivider) setTimeout(() => mapDivider.classList.add('visible'), 700);
        mapObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.25 });
  mapObs.observe(mapSection);
}

// ═══ FORMULAIRE CONTACT ═══
const contactForm = document.getElementById('contactForm');
if (contactForm) {
  contactForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const feedback = document.getElementById('form-feedback');
    const prenom   = contactForm.querySelector('[name="prenom"]').value.trim();
    const email    = contactForm.querySelector('[name="email"]').value.trim();

    if (!prenom || !email) {
      feedback.style.display = 'block';
      feedback.style.color   = '#9B7040';
      feedback.textContent   = 'Veuillez renseigner au minimum votre prénom et votre email.';
      return;
    }

    // TODO: remplacer par l'appel HubSpot API quand le Portal ID est disponible
    // fetch(`https://api.hsforms.com/submissions/v3/integration/submit/{PORTAL_ID}/{FORM_GUID}`, {...})

    feedback.style.display = 'block';
    feedback.style.color   = '#7A8B68';
    feedback.textContent   = 'Merci ' + prenom + ', votre demande a bien été envoyée. Nous vous contacterons très prochainement.';
    contactForm.reset();
  });
}
