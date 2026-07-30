(function(window, document) {
  'use strict';

  var successMessage = 'Votre demande a bien été envoyée. Merci, notre équipe vous contactera dans les plus brefs délais.';

  var SOCIAL_LINKS = {
    instagram: 'https://www.instagram.com/emara.estates',
    tiktok: 'https://www.tiktok.com/@emara.estates?_r=1&_t=ZS-95VFqI78Wjw',
    snapchat: 'https://snapchat.com/t/kQce8jwo',
    whatsapp: 'https://wa.me/212670038899?text=Bonjour%2C%20je%20souhaite%20%C3%A9changer%20avec%20Emara%20Estates%20au%20sujet%20d%27un%20projet%20immobilier%20%C3%A0%20Marrakech.%20Merci'
  };

  var SOCIAL_ICONS = {
    instagram: '/img/iconsocailmedia/instagram.png',
    tiktok: '/img/iconsocailmedia/tik-tok.png',
    snapchat: '/img/iconsocailmedia/snapchat.png',
    whatsapp: '/img/iconsocailmedia/whatsapp.png'
  };

  var modalOpen = false;
  var lastFocusedElement = null;

  function isLocalPreview() {
    return ['localhost', '127.0.0.1', '::1'].indexOf(window.location.hostname) !== -1;
  }

  function formHasLeadContent(formData) {
    var phone = formData.get('telephone') || formData.get('phoneFull') || '';
    return String(formData.get('nom_complet') || '').trim() !== ''
      || String(formData.get('email') || '').trim() !== ''
      || String(phone).trim() !== ''
      || String(formData.get('budget') || '').trim() !== ''
      || String(formData.get('message') || '').trim() !== ''
      || String(formData.get('jour_visite') || '').trim() !== '';
  }

  function ensureSuccessModal() {
    if (document.getElementById('form-success-modal')) return;

    var modal = document.createElement('div');
    modal.id = 'form-success-modal';
    modal.className = 'form-success-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'form-success-modal-title');
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML = [
      '<div class="form-success-modal__backdrop" data-success-modal-close></div>',
      '<div class="form-success-modal__card">',
      '  <button type="button" class="form-success-modal__close" data-success-modal-close aria-label="Fermer">&times;</button>',
      '  <h2 id="form-success-modal-title" class="form-success-modal__title">Merci pour votre demande</h2>',
      '  <p class="form-success-modal__text">Un conseiller d’Emara Estates vous contactera dans les plus brefs délais.</p>',
      '  <p class="form-success-modal__social-title">Suivez-nous sur nos réseaux</p>',
      '  <p class="form-success-modal__social-note">Découvrez nos projets, visites et actualités immobilières à Marrakech.</p>',
      '  <div class="form-success-modal__socials">',
      '    <a href="' + SOCIAL_LINKS.instagram + '" class="form-success-modal__social-link" target="_blank" rel="noopener noreferrer" aria-label="Instagram Emara Estates">',
      '      <img class="form-success-modal__social-icon" src="' + SOCIAL_ICONS.instagram + '" alt="" width="24" height="24" loading="lazy" decoding="async">',
      '      <span>Instagram</span>',
      '    </a>',
      '    <a href="' + SOCIAL_LINKS.tiktok + '" class="form-success-modal__social-link" target="_blank" rel="noopener noreferrer" aria-label="TikTok Emara Estates">',
      '      <img class="form-success-modal__social-icon" src="' + SOCIAL_ICONS.tiktok + '" alt="" width="24" height="24" loading="lazy" decoding="async">',
      '      <span>TikTok</span>',
      '    </a>',
      '    <a href="' + SOCIAL_LINKS.snapchat + '" class="form-success-modal__social-link" target="_blank" rel="noopener noreferrer" aria-label="Snapchat Emara Estates">',
      '      <img class="form-success-modal__social-icon" src="' + SOCIAL_ICONS.snapchat + '" alt="" width="24" height="24" loading="lazy" decoding="async">',
      '      <span>Snapchat</span>',
      '    </a>',
      '    <a href="' + SOCIAL_LINKS.whatsapp + '" class="form-success-modal__social-link" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp Emara Estates">',
      '      <img class="form-success-modal__social-icon" src="' + SOCIAL_ICONS.whatsapp + '" alt="" width="24" height="24" loading="lazy" decoding="async">',
      '      <span>WhatsApp</span>',
      '    </a>',
      '  </div>',
      '  <div class="form-success-modal__actions">',
      '    <button type="button" class="btn-outline form-success-modal__dismiss" data-success-modal-close>Fermer</button>',
      '    <a href="/" class="btn-primary form-success-modal__home"><span>Retour au site</span></a>',
      '  </div>',
      '</div>'
    ].join('');

    document.body.appendChild(modal);

    modal.querySelectorAll('[data-success-modal-close]').forEach(function(el) {
      el.addEventListener('click', closeSuccessModal);
    });
  }

  function openSuccessModal() {
    ensureSuccessModal();
    var modal = document.getElementById('form-success-modal');
    if (!modal || modalOpen) return;

    lastFocusedElement = document.activeElement;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('form-success-modal-open');
    modalOpen = true;

    var closeBtn = modal.querySelector('.form-success-modal__close');
    if (closeBtn) closeBtn.focus();
  }

  function closeSuccessModal() {
    var modal = document.getElementById('form-success-modal');
    if (!modal || !modalOpen) return;

    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('form-success-modal-open');
    modalOpen = false;

    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
      lastFocusedElement.focus();
    }
  }

  document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape' && modalOpen) {
      event.preventDefault();
      closeSuccessModal();
    }
  });

  function init(form) {
    if (!form || form.dataset.contactFormBound === 'true') return;
    form.dataset.contactFormBound = 'true';

    var feedback = document.getElementById('form-feedback');
    var submitButton = form.querySelector('.btn-submit');
    var defaultSubmitText = submitButton ? submitButton.textContent : '';
    var phoneInput = window.PhoneInputWithCountryCode || null;
    var startedAt = Date.now();

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

    function clearFieldErrors() {
      ['nom_complet', 'email', 'telephone', 'budget', 'message'].forEach(function(name) {
        var error = form.querySelector('[data-error-for="' + name + '"]');
        var fields = name === 'telephone'
          ? Array.prototype.slice.call(form.querySelectorAll('[data-phone-button], [data-phone-code], [data-phone-number], [data-phone-legacy]'))
          : (form.elements[name] ? [form.elements[name]] : []);
        fields.forEach(function(input) {
          if (input && input.type !== 'hidden') {
            input.classList.remove('is-invalid');
            input.setAttribute('aria-invalid', 'false');
          }
        });
        if (error) {
          error.textContent = '';
          error.classList.remove('is-visible');
        }
      });
    }

    function submitContactForm(hadLeadContent) {
      var phoneDetails = syncPhoneInput() || {};
      var formData = new FormData(form);

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
          source: formData.get('source') || window.location.href,
          company_website: formData.get('company_website'),
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
        .then(function() {
          setFormFeedback('', false);
          form.reset();
          if (phoneInput) phoneInput.init(form);
          form.querySelectorAll('[name]').forEach(updateAnimatedFieldState);
          startedAt = Date.now();
          form.setAttribute('data-form-start', String(startedAt));
          clearFieldErrors();
          if (hadLeadContent) openSuccessModal();
        })
        .catch(function(error) {
          if (isLocalPreview() && (!error || !error.errors)) {
            error = { message: 'Tu es sur Live Server. Lance php -S localhost:5601 dans le terminal, puis ouvre http://localhost:5601 pour tester le formulaire.' };
          }
          clearFieldErrors();
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
      });
      field.addEventListener('change', function() {
        updateAnimatedFieldState(field);
      });
    });

    form.addEventListener('submit', function(event) {
      event.preventDefault();
      syncPhoneInput();
      var formData = new FormData(form);
      var trap = String(formData.get('company_website') || '').trim();
      var hadLeadContent = formHasLeadContent(formData);

      clearFieldErrors();

      if (trap) {
        setFormFeedback(successMessage, false);
        return;
      }

      setSubmitting(true);
      submitContactForm(hadLeadContent);
    });
  }

  window.EmaraContactForm = { init: init, openSuccessModal: openSuccessModal, closeSuccessModal: closeSuccessModal };

  ensureSuccessModal();
  var forms = document.querySelectorAll('form#contactForm');
  for (var i = 0; i < forms.length; i++) {
    init(forms[i]);
  }
})(window, document);
