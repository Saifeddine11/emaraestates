/* =============================================================================
   EMARA ESTATES — Landing Ads « Offre Guéliz »
   Logique : formulaire progressif, capture UTM, tracking (garde-fous),
   soumission sécurisée, état de succès, CTA sticky mobile, carte lazy,
   animations d'apparition. Vanilla JS, aucune dépendance ajoutée.
   ============================================================================= */
(function (window, document) {
  'use strict';

  var CONFIG = window.EMARA_GUELIZ_CONFIG;
  if (!CONFIG) return;

  var doc = document;

  /* ------------------------------------------------------------------ utils */
  function $(sel, root) { return (root || doc).querySelector(sel); }
  function el(tag, attrs, children) {
    var node = doc.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'text') node.textContent = attrs[k];
        else if (k === 'html') node.innerHTML = attrs[k];
        else if (attrs[k] != null) node.setAttribute(k, attrs[k]);
      });
    }
    (children || []).forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  }
  function digits(v) { return String(v || '').replace(/\D/g, ''); }

  /* ---------------------------------------------------- attribution / UTM */
  var Attribution = (function () {
    var key = CONFIG.tracking.storageKey;
    var params = CONFIG.tracking.urlParams;

    function read() {
      try {
        var raw = window.sessionStorage.getItem(key);
        return raw ? JSON.parse(raw) : {};
      } catch (e) { return {}; }
    }
    function write(data) {
      try { window.sessionStorage.setItem(key, JSON.stringify(data)); } catch (e) {}
    }

    function platformFrom(source) {
      var s = String(source || '').toLowerCase();
      if (/facebook|meta|instagram|fb|ig/.test(s)) return 'Meta';
      if (/tiktok|tt/.test(s)) return 'TikTok';
      if (/snap/.test(s)) return 'Snapchat';
      if (/google|adwords|gads/.test(s)) return 'Google';
      return source || '';
    }

    function capture() {
      var stored = read();
      var search = new URLSearchParams(window.location.search);
      var changed = false;

      params.forEach(function (p) {
        var val = search.get(p);
        if (val && !stored[p]) { stored[p] = val; changed = true; }
      });

      if (!stored.landing_page_url) { stored.landing_page_url = window.location.href.split('#')[0]; changed = true; }
      if (!stored.referrer && doc.referrer) { stored.referrer = doc.referrer; changed = true; }
      if (!stored.ad_platform) {
        var plat = platformFrom(stored.utm_source);
        if (plat) { stored.ad_platform = plat; changed = true; }
      }
      if (changed) write(stored);
      return stored;
    }

    return { capture: capture, read: read };
  })();

  var attribution = Attribution.capture();

  /* ------------------------------------------------------------- tracking */
  // Ne déclenche un événement QUE si un pixel/GTM est présent (pas de doublon).
  function track(eventName, data) {
    if (!eventName) return;
    var payload = data || {};
    try {
      if (Array.isArray(window.dataLayer)) {
        window.dataLayer.push(Object.assign({ event: eventName }, payload));
      }
      if (typeof window.fbq === 'function') {
        var STD = { Lead: 1 };
        if (STD[eventName]) window.fbq('track', eventName, payload);
        else window.fbq('trackCustom', eventName, payload);
      }
      if (typeof window.ttq === 'object' && window.ttq && typeof window.ttq.track === 'function') {
        window.ttq.track(eventName, payload);
      }
      if (typeof window.snaptr === 'function') {
        window.snaptr('track', eventName === 'Lead' ? 'SIGN_UP' : 'CUSTOM_EVENT', payload);
      }
      if (typeof window.gtag === 'function') {
        window.gtag('event', eventName, payload);
      }
    } catch (e) { /* le tracking ne doit jamais casser le parcours */ }
  }

  /* --------------------------------------------------- reveal animations */
  function initReveal() {
    var nodes = Array.prototype.slice.call(doc.querySelectorAll('.og-reveal'));
    if (!('IntersectionObserver' in window) ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      nodes.forEach(function (n) { n.classList.add('is-visible'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    nodes.forEach(function (n) { io.observe(n); });
  }

  /* --------------------------------------------------------- smooth scroll */
  function scrollToForm() {
    var form = $('#og-form');
    if (!form) return;
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function initScrollTriggers() {
    Array.prototype.slice.call(doc.querySelectorAll('[data-scroll-to-form]')).forEach(function (btn) {
      btn.addEventListener('click', scrollToForm);
    });
  }

  /* -------------------------------------------------------- sticky mobile CTA */
  function initStickyCta() {
    var sticky = $('[data-sticky-cta]');
    var formSection = $('#og-form');
    if (!sticky || !formSection) return;

    function show(v) {
      sticky.classList.toggle('is-visible', v);
      sticky.setAttribute('aria-hidden', v ? 'false' : 'true');
      var btn = sticky.querySelector('.og-btn');
      if (btn) btn.setAttribute('tabindex', v ? '0' : '-1');
    }

    var ticking = false;
    function update() {
      ticking = false;
      var rect = formSection.getBoundingClientRect();
      // Le formulaire est « visible » dès qu'il entre dans le viewport.
      var formVisible = rect.top < window.innerHeight * 0.85 && rect.bottom > 0;
      show(window.scrollY > 400 && !formVisible);
    }

    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
  }

  /* ------------------------------------------------------------ carte lazy */
  function initMap() {
    var wrap = $('[data-map]');
    if (!wrap) return;
    var loaded = false;

    function load() {
      if (loaded) return;
      loaded = true;
      var iframe = el('iframe', {
        title: CONFIG.location.mapTitle,
        src: CONFIG.location.mapEmbedSrc,
        loading: 'lazy',
        referrerpolicy: 'no-referrer-when-downgrade',
        allowfullscreen: ''
      });
      wrap.appendChild(iframe);
      var ph = wrap.querySelector('[data-map-trigger]');
      if (ph) ph.remove();
    }

    var trigger = wrap.querySelector('[data-map-trigger]');
    if (trigger) trigger.addEventListener('click', load);

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { load(); io.disconnect(); }
      }, { rootMargin: '200px 0px' });
      io.observe(wrap);
    }
  }

  /* ============================================================ FORMULAIRE */
  var Form = (function () {
    var form = $('#og-lead-form');
    var stepsHost = $('[data-steps]', form);
    var progress = $('[data-progress]', form);
    var progressLabel = $('[data-progress-label]', form);
    var progressPct = $('[data-progress-pct]', form);
    var progressBar = $('[data-progress-bar]', form);
    var formError = $('[data-form-error]', form);
    var success = $('[data-success]');

    var stepDefs = CONFIG.form.steps;
    var L = CONFIG.form.labels;
    var total = stepDefs.length;

    var state = { current: 0, values: {}, started: false, submitting: false, startedAt: Date.now() };
    var stepEls = [];

    /* ----- construction des étapes ----- */
    function buildOption(step, opt, idx) {
      var input = el('input', {
        type: 'radio',
        name: step.key,
        value: opt,
        id: step.key + '-' + idx,
        'class': 'og-option__input'
      });
      input.addEventListener('change', function () {
        state.values[step.key] = opt;
        onOptionSelected(step);
      });
      var label = el('label', { 'class': 'og-option', 'for': step.key + '-' + idx }, [
        input,
        el('span', { 'class': 'og-option__mark', 'aria-hidden': 'true' }),
        el('span', { 'class': 'og-option__label', text: opt })
      ]);
      return label;
    }

    function buildContactFields() {
      var wrap = el('div', { 'class': 'og-fields', 'data-fields': '', hidden: 'hidden' });

      // Nom complet
      var nameId = 'og-fullname';
      var nameErr = el('span', { 'class': 'og-field__error', id: 'og-fullname-error', 'data-error-for': 'fullName' });
      var nameInput = el('input', {
        type: 'text', id: nameId, name: 'fullName', 'class': 'og-input',
        autocomplete: 'name', placeholder: 'Prénom et nom',
        'aria-describedby': 'og-fullname-error'
      });
      var nameField = el('div', { 'class': 'og-field' }, [
        el('label', { 'class': 'og-field__label', 'for': nameId, text: L.fullName }),
        nameInput, nameErr
      ]);

      // Téléphone (réutilise le module phone-input-country du site)
      var phoneErr = el('span', { 'class': 'og-field__error', id: 'og-phone-error', 'data-error-for': 'telephone' });
      var phoneField = el('div', { 'class': 'og-field og-field--phone animated-field phone-country-field', 'data-phone-country-field': '' });
      var phoneControl = el('div', { 'class': 'phone-country-control' });
      var select = el('select', { id: 'og-phone-code', name: 'phoneCode', 'aria-label': 'Indicatif pays', autocomplete: 'tel-country-code', 'data-phone-code': '' });
      var phoneNumber = el('input', {
        id: 'og-phone', type: 'tel', name: 'phoneNumber', placeholder: ' ',
        'aria-label': L.phone, autocomplete: 'tel-national', inputmode: 'tel',
        maxlength: '20', 'data-phone-number': '', 'aria-describedby': 'og-phone-error'
      });
      phoneControl.appendChild(select);
      phoneControl.appendChild(phoneNumber);
      phoneField.appendChild(el('label', { 'class': 'og-field__label', 'for': 'og-phone', text: L.phone }));
      phoneField.appendChild(phoneControl);
      phoneField.appendChild(el('input', { type: 'hidden', name: 'telephone', 'data-phone-legacy': '', value: '' }));
      phoneField.appendChild(el('input', { type: 'hidden', name: 'phoneFull', 'data-phone-full': '', value: '' }));
      phoneField.appendChild(el('input', { type: 'hidden', name: 'phoneCountry', 'data-phone-country': '', value: 'France' }));
      phoneField.appendChild(el('input', { type: 'hidden', name: 'phoneCountryCode', 'data-phone-country-code': '', value: 'FR' }));
      phoneField.appendChild(phoneErr);

      // Honeypot anti-spam (cohérent avec le reste du site)
      var trap = el('input', { type: 'text', name: 'company_website', tabindex: '-1', autocomplete: 'off', 'aria-hidden': 'true' });
      trap.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;opacity:0;';

      var consent = el('p', { 'class': 'og-consent', text: CONFIG.form.consent });

      wrap.appendChild(nameField);
      wrap.appendChild(phoneField);
      wrap.appendChild(trap);
      wrap.appendChild(consent);
      return wrap;
    }

    function buildActions(index) {
      var actions = el('div', { 'class': 'og-form-actions' });
      var isLast = index === total - 1;

      if (index > 0) {
        var back = el('button', { type: 'button', 'class': 'og-btn og-btn--ghost', 'data-back': '', text: L.back });
        back.addEventListener('click', function () { goTo(index - 1); });
        actions.appendChild(back);
      }

      if (isLast) {
        var submit = el('button', { type: 'submit', 'class': 'og-btn', 'data-submit': '', text: L.submit });
        submit.disabled = true;
        actions.appendChild(submit);
      } else {
        var next = el('button', { type: 'button', 'class': 'og-btn', 'data-next': '', text: L.next });
        next.disabled = true;
        next.addEventListener('click', function () {
          if (!state.values[stepDefs[index].key]) return;
          track(CONFIG.tracking.events.step, { step: index + 1, step_key: stepDefs[index].key });
          goTo(index + 1);
        });
        actions.appendChild(next);
      }
      return actions;
    }

    function build() {
      stepDefs.forEach(function (step, index) {
        var stepEl = el('div', { 'class': 'og-step', 'data-step': index });
        stepEl.appendChild(el('h3', { 'class': 'og-step__question', text: step.question }));

        var fieldset = el('fieldset', { 'class': 'og-options', role: 'radiogroup', 'aria-label': step.question });
        step.options.forEach(function (opt, i) { fieldset.appendChild(buildOption(step, opt, i)); });
        stepEl.appendChild(fieldset);

        if (index === total - 1) stepEl.appendChild(buildContactFields());
        stepEl.appendChild(buildActions(index));

        stepsHost.appendChild(stepEl);
        stepEls.push(stepEl);
      });
      stepEls[0].classList.add('is-active');
      progress.hidden = false;
      updateProgress();
    }

    /* ----- interactions ----- */
    function onOptionSelected(step) {
      if (!state.started) {
        state.started = true;
        state.startedAt = Date.now();
        track(CONFIG.tracking.events.start, { landing_page_url: attribution.landing_page_url });
      }
      var index = state.current;
      var isLast = index === total - 1;
      var stepEl = stepEls[index];

      if (isLast) {
        var fields = $('[data-fields]', stepEl);
        if (fields && fields.hidden) {
          fields.hidden = false;
          initPhone();
        }
        refreshSubmitState();
      } else {
        var next = $('[data-next]', stepEl);
        if (next) next.disabled = false;
      }
    }

    function goTo(index) {
      if (index < 0 || index >= total) return;
      stepEls[state.current].classList.remove('is-active');
      state.current = index;
      var target = stepEls[index];
      target.classList.add('is-active');
      updateProgress();
      clearFormError();
      // Focus la question pour l'accessibilité clavier.
      var q = $('.og-step__question', target);
      if (q) { q.setAttribute('tabindex', '-1'); q.focus({ preventScroll: true }); }
      if (index === total - 1) refreshSubmitState();
    }

    function updateProgress() {
      var n = state.current + 1;
      progressLabel.textContent = L.stepPrefix + ' ' + n + ' ' + L.stepJoiner + ' ' + total;
      var pct = Math.round((n / total) * 100);
      progressPct.textContent = pct + '%';
      progressBar.style.width = pct + '%';
    }

    /* ----- téléphone ----- */
    function initPhone() {
      if (window.PhoneInputWithCountryCode) {
        window.PhoneInputWithCountryCode.init(form);
      }
    }
    function syncPhone() {
      return window.PhoneInputWithCountryCode
        ? window.PhoneInputWithCountryCode.sync(form)
        : null;
    }

    /* ----- validation ----- */
    function setFieldError(name, message) {
      var errNode = form.querySelector('[data-error-for="' + name + '"]');
      if (errNode) {
        errNode.textContent = message || '';
        errNode.classList.toggle('is-visible', !!message);
      }
      var input = name === 'fullName' ? form.querySelector('[name="fullName"]') : null;
      if (input) {
        input.classList.toggle('is-invalid', !!message);
        input.setAttribute('aria-invalid', message ? 'true' : 'false');
      }
      if (name === 'telephone') {
        var pf = form.querySelector('.phone-country-field');
        if (pf) pf.classList.toggle('is-invalid', !!message);
        var num = form.querySelector('[data-phone-number]');
        if (num) num.setAttribute('aria-invalid', message ? 'true' : 'false');
      }
    }
    function clearFieldErrors() { setFieldError('fullName', ''); setFieldError('telephone', ''); }

    function validName(v) { return String(v || '').trim().length >= 2; }
    function validPhone(details) {
      var full = (details && details.phoneFull) || form.querySelector('[data-phone-full]').value || '';
      return digits(full).length >= 8 && digits(full).length <= 15;
    }

    function refreshSubmitState() {
      var submit = $('[data-submit]', form);
      if (!submit) return;
      var lastKey = stepDefs[total - 1].key;
      submit.disabled = !state.values[lastKey];
    }

    /* ----- messages ----- */
    function setFormError(msg) {
      formError.textContent = msg || '';
      formError.classList.toggle('is-visible', !!msg);
    }
    function clearFormError() { setFormError(''); }

    /* ----- soumission ----- */
    function buildPayload(phoneDetails) {
      var a = Attribution.read();
      var wa = form.querySelector('[data-phone-full]');
      return {
        fullName: (form.querySelector('[name="fullName"]').value || '').trim(),
        phone: (phoneDetails && phoneDetails.phoneFull) || (wa && wa.value) || '',
        phoneCountry: (phoneDetails && phoneDetails.phoneCountry) || '',
        phoneCountryCode: (phoneDetails && phoneDetails.phoneCountryCode) || '',
        projectType: state.values[stepDefs[0].key] || '',
        apartmentType: state.values[stepDefs[1].key] || '',
        timeframe: state.values[stepDefs[2].key] || '',
        leadSource: CONFIG.form.leadSource,
        adPlatform: a.ad_platform || '',
        campaign: a.utm_campaign || a.campaign_id || '',
        adset: a.adset_id || '',
        ad: a.ad_id || '',
        landingPageUrl: a.landing_page_url || window.location.href,
        utmSource: a.utm_source || '',
        utmMedium: a.utm_medium || '',
        utmCampaign: a.utm_campaign || '',
        utmContent: a.utm_content || '',
        utmTerm: a.utm_term || '',
        campaignId: a.campaign_id || '',
        adsetId: a.adset_id || '',
        adId: a.ad_id || '',
        referrer: a.referrer || '',
        submissionDate: new Date().toISOString(),
        company_website: (form.querySelector('[name="company_website"]') || {}).value || '',
        elapsed_ms: Date.now() - state.startedAt
      };
    }

    function setSubmitting(on) {
      state.submitting = on;
      var submit = $('[data-submit]', form);
      if (submit) {
        submit.disabled = on;
        submit.textContent = on ? 'Envoi…' : L.submit;
      }
    }

    function showSuccess(payload) {
      form.style.display = 'none';
      $('[data-success-title]').textContent = CONFIG.form.success.title;
      $('[data-success-text]').textContent = CONFIG.form.success.text;
      var wa = $('[data-success-wa]');
      var num = CONFIG.brand.whatsappNumber;
      var msg = encodeURIComponent(CONFIG.brand.whatsappMessage);
      wa.href = 'https://wa.me/' + num + '?text=' + msg;
      $('[data-success-wa-label]').textContent = CONFIG.form.success.whatsappCta;
      success.classList.add('is-visible');
      // Lead confirmé côté serveur → événement Lead.
      track(CONFIG.tracking.events.lead, {
        project_type: payload.projectType,
        apartment_type: payload.apartmentType,
        timeframe: payload.timeframe,
        lead_source: payload.leadSource,
        ad_platform: payload.adPlatform,
        utm_campaign: payload.utmCampaign
      });
      success.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function submit() {
      if (state.submitting) return; // anti double-soumission
      clearFieldErrors();
      clearFormError();

      var honeypot = (form.querySelector('[name="company_website"]') || {}).value || '';
      var phoneDetails = syncPhone() || {};
      var nameOk = validName(form.querySelector('[name="fullName"]').value);
      var phoneOk = validPhone(phoneDetails);

      if (honeypot) { showSuccess(buildPayload(phoneDetails)); return; } // piège spam

      var firstInvalid = null;
      if (!nameOk) { setFieldError('fullName', CONFIG.form.errors.fullName); firstInvalid = firstInvalid || form.querySelector('[name="fullName"]'); }
      if (!phoneOk) { setFieldError('telephone', CONFIG.form.errors.phone); firstInvalid = firstInvalid || form.querySelector('[data-phone-number]'); }
      if (firstInvalid) { firstInvalid.focus(); return; }

      var payload = buildPayload(phoneDetails);
      setSubmitting(true);

      // Étape finale complétée (avant confirmation serveur).
      track(CONFIG.tracking.events.step, { step: total, step_key: stepDefs[total - 1].key });

      fetch(CONFIG.form.endpoint, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'same-origin'
      })
        .then(function (res) {
          return res.text().then(function (t) {
            var data = {};
            try { data = t ? JSON.parse(t) : {}; } catch (e) { throw { message: CONFIG.form.errors.network }; }
            if (!res.ok || (data && data.success === false)) throw (data || {});
            return data;
          });
        })
        .then(function () { showSuccess(payload); })
        .catch(function (err) {
          setFormError((err && err.message) || CONFIG.form.errors.network);
          setSubmitting(false);
        });
    }

    function init() {
      if (!form || !stepsHost) return;
      build();
      form.addEventListener('submit', function (e) { e.preventDefault(); submit(); });
    }

    return { init: init };
  })();

  /* ------------------------------------------------------------------ boot */
  function boot() {
    initReveal();
    initScrollTriggers();
    initStickyCta();
    initMap();
    Form.init();
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window, document);
