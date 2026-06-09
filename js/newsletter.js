(function(window, document) {
  'use strict';

  var SUCCESS_MESSAGE = 'Merci. Votre inscription à la newsletter Emara Estates a bien été prise en compte.';
  var INVALID_MESSAGE = 'Veuillez entrer une adresse email valide.';
  var ERROR_MESSAGE = 'Une erreur est survenue. Veuillez réessayer ou nous contacter directement.';

  function looksLikeEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(String(value || '').trim());
  }

  function setMessage(el, text, type) {
    if (!el) return;
    el.textContent = text || '';
    el.classList.remove('is-error', 'is-success');
    if (type === 'error') el.classList.add('is-error');
    if (type === 'success') el.classList.add('is-success');
  }

  function init(form) {
    if (!form || form.dataset.newsletterBound === 'true') return;
    form.dataset.newsletterBound = 'true';

    var messageEl = document.getElementById('newsletter-message');
    var submitButton = form.querySelector('.newsletter-button');
    var defaultButtonText = submitButton ? submitButton.textContent : '';

    function setSubmitting(isSubmitting) {
      if (!submitButton) return;
      submitButton.disabled = isSubmitting;
      submitButton.textContent = isSubmitting ? 'Envoi…' : defaultButtonText;
    }

    form.addEventListener('submit', function(event) {
      event.preventDefault();
      setMessage(messageEl, '', '');

      var email = String(form.email.value || '').trim();
      var honeypot = String(form.website.value || '').trim();

      if (!email || !looksLikeEmail(email)) {
        setMessage(messageEl, INVALID_MESSAGE, 'error');
        return;
      }

      setSubmitting(true);

      fetch(form.action, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email,
          website: honeypot,
          page_url: window.location.href
        }),
        credentials: 'same-origin'
      })
        .then(function(response) {
          return response.text().then(function(text) {
            var payload = {};
            try {
              payload = text ? JSON.parse(text) : {};
            } catch (error) {
              payload = { success: false, message: ERROR_MESSAGE };
            }
            if (!response.ok && !payload.message) {
              payload.message = ERROR_MESSAGE;
            }
            if (!response.ok || payload.success === false) {
              throw payload;
            }
            return payload;
          });
        })
        .then(function(payload) {
          setMessage(messageEl, payload.message || SUCCESS_MESSAGE, 'success');
          form.reset();
        })
        .catch(function(error) {
          setMessage(messageEl, (error && error.message) || ERROR_MESSAGE, 'error');
        })
        .finally(function() {
          setSubmitting(false);
        });
    });
  }

  document.addEventListener('DOMContentLoaded', function() {
    init(document.getElementById('newsletterForm'));
  });
})(window, document);
