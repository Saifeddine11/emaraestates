(function(window, document) {
  'use strict';

  var validBudgets = ['1M - 1.5M MAD', '2M - 3M MAD', '+3M MAD'];
  var blockedTerms = [
    'refonte', 'refondre', 'seo', 'référencement', 'referencement', 'backlink',
    'agence web', 'création de site', 'creation de site', 'site internet',
    'marketing digital', 'audit gratuit', 'devis gratuit', 'visibilité',
    'visibilite', 'ranking', 'google ads', 'wordpress', 'shopify',
    'web design', 'webdesign', 'traffic', 'trafic', 'lead generation',
    'guest post', 'link building'
  ];

  function isLocalPreview() {
    return ['localhost', '127.0.0.1', '::1'].indexOf(window.location.hostname) !== -1;
  }

  function normalizeFormText(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function looksLikeEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(String(value || '').trim());
  }

  function looksLikePhone(value) {
    var raw = String(value || '').trim();
    var digits = raw.replace(/\D/g, '');
    if (digits.length < 8 || digits.length > 15) return false;
    if (!/^\+?[0-9][0-9\s().-]{6,}[0-9]$/.test(raw)) return false;
    return !/^(\d)\1+$/.test(digits);
  }

  function looksLikeName(value) {
    var raw = String(value || '').trim();
    var parts = raw.split(/\s+/).filter(Boolean);
    if (raw.length < 3 || raw.length > 80) return false;
    if (looksLikeEmail(raw) || looksLikePhone(raw)) return false;
    if (/\d/.test(raw)) return false;
    if (!/^[A-Za-zÀ-ÖØ-öø-ÿ' -]{3,}$/.test(raw)) return false;
    if (parts.length < 2) return false;
    return parts.every(function(part) { return part.replace(/[-']/g, '').length >= 2; });
  }

  function isWeakMessage(value) {
    var text = normalizeFormText(value).replace(/\s+/g, ' ').trim();
    if (text.length < 20) return true;
    if (/^(test|hello|bonjour|salut|aaaa+|12345+|ok|merci)$/i.test(text)) return true;
    return /^(.)\1{5,}$/.test(text.replace(/\s/g, ''));
  }

  function hasSpamContent(formData) {
    var text = normalizeFormText([
      formData.get('nom_complet'),
      formData.get('email'),
      formData.get('telephone'),
      formData.get('budget'),
      formData.get('message')
    ].join(' '));
    var hasBlockedTerm = blockedTerms.some(function(term) {
      return text.indexOf(normalizeFormText(term)) !== -1;
    });
    var hasLink = /(https?:\/\/|www\.|\.ru\b|\.xyz\b|\.top\b|\.click\b)/i.test(text);
    return hasBlockedTerm || hasLink;
  }

  function init(form) {
    if (!form || form.dataset.contactFormBound === 'true') return;
    form.dataset.contactFormBound = 'true';

    var feedback = document.getElementById('form-feedback');
    var tokenInput = document.getElementById('contactFormToken');
    var turnstileInput = document.getElementById('cfTurnstileResponse');
    var submitButton = form.querySelector('.btn-submit');
    var defaultSubmitText = submitButton ? submitButton.textContent : '';
    var phoneInput = window.PhoneInputWithCountryCode || null;
    var turnstileWidgetId = null;
    var startedAt = Date.now();

    function refreshFormToken() {
      if (!tokenInput || !window.crypto || !crypto.getRandomValues) return;
      var tokenBytes = new Uint32Array(4);
      crypto.getRandomValues(tokenBytes);
      tokenInput.value = Array.prototype.map.call(tokenBytes, function(part) {
        return part.toString(16);
      }).join('');
    }

    function syncPhoneInput() {
      return phoneInput ? phoneInput.sync(form) : null;
    }

    function updateAnimatedFieldState(field) {
      var wrap = field && field.closest ? field.closest('.animated-field') : null;
      if (wrap) wrap.classList.toggle('has-value', String(field.value || '').trim().length > 0);
    }

    function setFormFeedback(message, isError) {
      if (!feedback) return;
      feedback.textContent = message;
      feedback.style.display = message ? 'block' : 'none';
      feedback.style.color = isError ? '#8f3f2f' : '#2d3a2d';
    }

    function setSubmitting(isSubmitting) {
      if (!submitButton) return;
      submitButton.disabled = isSubmitting;
      submitButton.textContent = isSubmitting ? 'Envoi...' : defaultSubmitText;
    }

    function setFieldError(name, message, showErrors) {
      var field = form.elements[name];
      var error = form.querySelector('[data-error-for="' + name + '"]');
      var fields = name === 'telephone'
        ? Array.prototype.slice.call(form.querySelectorAll('[data-phone-button], [data-phone-code], [data-phone-number], [data-phone-legacy]'))
        : (field ? [field] : []);
      if (!fields.length || !error) return;
      fields.forEach(function(input) {
        if (input.type !== 'hidden') {
          input.classList.toggle('is-invalid', Boolean(message && showErrors));
        }
        input.setAttribute('aria-invalid', message ? 'true' : 'false');
      });
      error.textContent = showErrors ? message : '';
      error.classList.toggle('is-visible', Boolean(message && showErrors));
    }

    function clearFieldErrors() {
      ['nom_complet', 'email', 'telephone', 'budget', 'message'].forEach(function(name) {
        setFieldError(name, '', true);
      });
    }

    function validateContactForm(showErrors) {
      syncPhoneInput();
      var formData = new FormData(form);
      var errors = {};
      var name = String(formData.get('nom_complet') || '').trim();
      var email = String(formData.get('email') || '').trim();
      var phone = String(formData.get('telephone') || '').trim();
      var budget = String(formData.get('budget') || '').trim();
      var message = String(formData.get('message') || '').trim();

      if (!looksLikeName(name)) errors.nom_complet = 'Indiquez un vrai nom complet, sans email ni numéro.';
      if (!looksLikeEmail(email)) errors.email = 'Indiquez une adresse email valide.';
      if (looksLikePhone(email)) errors.email = 'Le téléphone doit être dans le champ Téléphone.';
      if (!looksLikePhone(phone)) errors.telephone = 'Indiquez un vrai numéro de téléphone.';
      if (looksLikeEmail(phone)) errors.telephone = 'L’email doit être dans le champ Email.';
      if (validBudgets.indexOf(budget) === -1) errors.budget = 'Choisissez un budget dans la liste.';
      if (isWeakMessage(message)) errors.message = 'Décrivez votre projet en au moins 20 caractères.';
      if (looksLikeEmail(name) || looksLikePhone(name)) errors.nom_complet = 'Le nom ne doit pas contenir d’email ni de téléphone.';
      if (hasSpamContent(formData)) errors.message = 'Ce message ressemble à une prospection ou contient un lien non autorisé.';

      ['nom_complet', 'email', 'telephone', 'budget', 'message'].forEach(function(fieldName) {
        setFieldError(fieldName, errors[fieldName], showErrors);
      });
      return errors;
    }

    function wasSubmittedRecently() {
      var lastSubmit = Number(sessionStorage.getItem('emara_contact_last_submit') || 0);
      return lastSubmit && Date.now() - lastSubmit < 60000;
    }

    function loadTurnstileScript() {
      if (window.turnstile || document.querySelector('script[data-turnstile-loader]')) {
        initTurnstile();
        return;
      }
      var script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.dataset.turnstileLoader = 'true';
      script.onload = initTurnstile;
      document.head.appendChild(script);
    }

    function initTurnstile() {
      var holder = document.getElementById('contactTurnstile');
      var sitekey = form.getAttribute('data-turnstile-sitekey');
      if (isLocalPreview() || !holder || !window.turnstile || !sitekey || turnstileWidgetId !== null) return;
      turnstileWidgetId = turnstile.render(holder, {
        sitekey: sitekey,
        callback: function(token) {
          if (turnstileInput) turnstileInput.value = token;
          setFormFeedback('', false);
        },
        'expired-callback': function() {
          if (turnstileInput) turnstileInput.value = '';
          setFormFeedback('La vérification anti-robot a expiré. Cochez-la à nouveau.', true);
        },
        'error-callback': function() {
          if (turnstileInput) turnstileInput.value = '';
          setFormFeedback('La vérification anti-robot n’a pas abouti. Réessayez, ou contactez-nous directement par WhatsApp.', true);
        }
      });
    }

    function submitContactForm() {
      var phoneDetails = syncPhoneInput() || {};
      var formData = new FormData(form);
      var turnstileResponse = isLocalPreview()
        ? '__local_turnstile_bypass__'
        : String(formData.get('cf-turnstile-response') || formData.get('cf_turnstile_response') || '').trim();
      if (!turnstileResponse) {
        loadTurnstileScript();
        setFormFeedback('Cochez la vérification anti-robot avant d’envoyer.', true);
        setSubmitting(false);
        return;
      }

      fetch(form.action, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nom_complet: formData.get('nom_complet'),
          email: formData.get('email'),
          telephone: formData.get('telephone'),
          phoneFull: phoneDetails.phoneFull || formData.get('phoneFull'),
          phoneCode: phoneDetails.phoneCode || formData.get('phoneCode'),
          phoneCountry: phoneDetails.phoneCountry || formData.get('phoneCountry'),
          phoneCountryCode: phoneDetails.phoneCountryCode || formData.get('phoneCountryCode'),
          phoneNumber: phoneDetails.phoneNumber || formData.get('phoneNumber'),
          budget: formData.get('budget'),
          message: formData.get('message'),
          jour_visite: formData.get('jour_visite'),
          source: formData.get('source'),
          company_website: formData.get('company_website'),
          form_token: formData.get('form_token'),
          'cf-turnstile-response': turnstileResponse,
          cf_turnstile_response: turnstileResponse,
          elapsed_ms: Date.now() - startedAt
        }),
        credentials: 'same-origin'
      })
        .then(function(response) {
          return response.text().then(function(text) {
            var payload = {};
            try {
              payload = text ? JSON.parse(text) : {};
            } catch (parseError) {
              throw {
                message: 'Le serveur de contact ne répond pas correctement. Contactez-nous directement par WhatsApp.'
              };
            }
            if (!response.ok) throw payload;
            if (!payload || typeof payload.message !== 'string') {
              throw {
                message: 'Le serveur de contact ne répond pas correctement. Contactez-nous directement par WhatsApp.'
              };
            }
            return payload;
          });
        })
        .then(function(payload) {
          sessionStorage.setItem('emara_contact_last_submit', String(Date.now()));
          setFormFeedback(payload.message || 'Votre demande a bien été envoyée. Merci, notre équipe vous contactera dans les plus brefs délais.', false);
          form.reset();
          if (phoneInput) phoneInput.init(form);
          form.querySelectorAll('[name]').forEach(updateAnimatedFieldState);
          startedAt = Date.now();
          form.setAttribute('data-form-start', String(startedAt));
          refreshFormToken();
          clearFieldErrors();
          if (window.turnstile && turnstileWidgetId !== null) turnstile.reset(turnstileWidgetId);
          if (turnstileInput) turnstileInput.value = '';
        })
        .catch(function(error) {
          if (error && error.errors) {
            Object.keys(error.errors).forEach(function(name) {
              setFieldError(name, error.errors[name], true);
            });
          }
          if (isLocalPreview() && (!error || !error.errors)) {
            error = { message: 'Tu es sur Live Server. Lance php -S localhost:5601 dans le terminal, puis ouvre http://localhost:5601 pour tester le formulaire.' };
          }
          setFormFeedback((error && error.message) || 'Votre demande n’a pas pu être envoyée. Contactez-nous directement par WhatsApp.', true);
        })
        .finally(function() {
          setSubmitting(false);
        });
    }

    form.setAttribute('data-form-start', String(startedAt));
    if (phoneInput) phoneInput.init(form);
    form.querySelectorAll('[name]').forEach(function(field) {
      updateAnimatedFieldState(field);
      field.addEventListener('input', function() {
        updateAnimatedFieldState(field);
        validateContactForm(false);
      });
      field.addEventListener('blur', function() {
        updateAnimatedFieldState(field);
        validateContactForm(true);
      });
      field.addEventListener('change', function() {
        updateAnimatedFieldState(field);
        validateContactForm(true);
      });
    });
    refreshFormToken();

    form.addEventListener('focusin', loadTurnstileScript, { once: true });
    form.addEventListener('input', loadTurnstileScript, { once: true });
    form.addEventListener('pointerenter', loadTurnstileScript, { once: true });
    form.addEventListener('pointerdown', loadTurnstileScript, { once: true });
    if ('IntersectionObserver' in window) {
      var turnstileObs = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (entry.isIntersecting) {
            loadTurnstileScript();
            turnstileObs.disconnect();
          }
        });
      }, { rootMargin: '300px 0px' });
      turnstileObs.observe(form);
    } else {
      window.addEventListener('load', loadTurnstileScript);
    }

    form.addEventListener('submit', function(event) {
      event.preventDefault();
      syncPhoneInput();
      var formData = new FormData(form);
      var elapsed = Date.now() - startedAt;
      var trap = String(formData.get('company_website') || '').trim();
      var token = String(formData.get('form_token') || '').trim();
      var errors = validateContactForm(true);

      if (Object.keys(errors).length || trap || !token || elapsed < 4000 || wasSubmittedRecently()) {
        setFormFeedback('Votre demande n’a pas pu être envoyée. Contactez-nous directement par WhatsApp.', true);
        return;
      }

      setSubmitting(true);
      submitContactForm();
    });
  }

  window.EmaraContactForm = { init: init };
  init(document.getElementById('contactForm'));
})(window, document);
