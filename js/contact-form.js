(function(window, document) {
  'use strict';

  var successMessage = 'Votre demande a bien été envoyée. Merci, notre équipe vous contactera dans les plus brefs délais.';

  function isLocalPreview() {
    return ['localhost', '127.0.0.1', '::1'].indexOf(window.location.hostname) !== -1;
  }

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

    function submitContactForm() {
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
        .then(function(payload) {
          setFormFeedback(payload.message || successMessage, false);
          form.reset();
          if (phoneInput) phoneInput.init(form);
          form.querySelectorAll('[name]').forEach(updateAnimatedFieldState);
          startedAt = Date.now();
          form.setAttribute('data-form-start', String(startedAt));
          clearFieldErrors();
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

      clearFieldErrors();

      if (trap) {
        setFormFeedback(successMessage, false);
        return;
      }

      setSubmitting(true);
      submitContactForm();
    });
  }

  window.EmaraContactForm = { init: init };
  init(document.getElementById('contactForm'));
})(window, document);
