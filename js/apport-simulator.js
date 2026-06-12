(function () {
  var forms = document.querySelectorAll('[data-apport-simulator-form]');
  if (!forms.length) return;

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
  var ERROR_MESSAGE = 'Une erreur est survenue. Vous pouvez nous contacter directement.';

  function parseBudget(raw) {
    var normalized = String(raw || '').replace(/\s/g, '').replace(/,/g, '.');
    var num = parseFloat(normalized);
    return Number.isFinite(num) && num > 0 ? num : 0;
  }

  function formatNumber(n) {
    return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');
  }

  function formatBudgetDisplay(value, currency) {
    return formatNumber(value) + ' ' + currency;
  }

  function calculateApport(budget, currency) {
    if (currency === 'EUR') {
      var apportEur = Math.round(budget * 0.3);
      var apportMad = Math.round(apportEur * 10);
      return { apportMad: apportMad, apportEur: apportEur };
    }
    var apportMadValue = Math.round(budget * 0.3);
    var apportEurValue = Math.round(apportMadValue / 10);
    return { apportMad: apportMadValue, apportEur: apportEurValue };
  }

  forms.forEach(initForm);

  function initForm(form) {
    var budgetInput = form.querySelector('[data-apport-budget]');
    var currencySelect = form.querySelector('[data-apport-currency]');
    var typologieSelect = form.querySelector('[data-apport-typologie]');
    var emailInput = form.querySelector('[data-apport-email]');
    var resultEl = form.querySelector('[data-apport-result]');
    var submitBtn = form.querySelector('.apport-simulator__submit');
    var honeypot = form.querySelector('[name="company_website"]');

    if (!budgetInput || !currencySelect || !emailInput || !resultEl || !submitBtn) return;

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      clearErrors(form);
      resultEl.hidden = true;

      var budget = parseBudget(budgetInput.value);
      var currency = currencySelect.value === 'EUR' ? 'EUR' : 'MAD';
      var email = emailInput.value.trim();
      var typologie = typologieSelect ? typologieSelect.value.trim() : '';
      var hasError = false;

      if (!budget) {
        showFieldError(form, 'budget', 'Indiquez votre budget pour calculer l\u2019apport.');
        hasError = true;
      }

      if (!email) {
        showFieldError(form, 'email', 'Indiquez votre email pour recevoir votre estimation.');
        hasError = true;
      } else if (!EMAIL_RE.test(email)) {
        showFieldError(form, 'email', 'Indiquez une adresse email valide.');
        hasError = true;
      }

      if (hasError) return;

      var apport = calculateApport(budget, currency);
      submitBtn.disabled = true;

      fetch('/contact.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          form_type: 'apport_simulator',
          email: email,
          budget_value: budget,
          currency: currency,
          typologie: typologie,
          apport_mad: apport.apportMad,
          apport_eur: apport.apportEur,
          source_page: window.location.href,
          company_website: honeypot ? honeypot.value : ''
        })
      })
        .then(function (response) {
          return response.json().then(function (data) {
            return { ok: response.ok, status: response.status, data: data };
          });
        })
        .then(function (result) {
          if (!result.ok) {
            if (result.data && result.data.errors) {
              Object.keys(result.data.errors).forEach(function (key) {
                showFieldError(form, key, result.data.errors[key]);
              });
            } else {
              showFormError(form, ERROR_MESSAGE);
            }
            return;
          }

          var payload = (result.data && result.data.result) || {};
          var budgetDisplay = payload.budget_display || formatBudgetDisplay(budget, currency);
          var apportMadDisplay = payload.apport_mad_display || formatNumber(apport.apportMad) + ' MAD';
          var apportEurDisplay = payload.apport_eur_display || formatNumber(apport.apportEur) + ' \u20ac';
          var resultText = form.querySelector('[data-apport-result-text]');

          if (resultText) {
            resultText.textContent =
              'Pour un budget de ' +
              budgetDisplay +
              ', l\u2019apport estimé à 30\u00a0% serait d\u2019environ ' +
              apportMadDisplay +
              ', soit environ ' +
              apportEurDisplay +
              '.';
          }

          setText(form, '[data-apport-result-budget]', budgetDisplay);
          setText(form, '[data-apport-result-mad]', apportMadDisplay);
          setText(form, '[data-apport-result-eur]', apportEurDisplay);

          var typeRow = form.querySelector('[data-apport-result-type-row]');
          var typeValue = form.querySelector('[data-apport-result-type]');
          if (typologie && typeRow && typeValue) {
            typeValue.textContent = typologie;
            typeRow.hidden = false;
          } else if (typeRow) {
            typeRow.hidden = true;
          }

          resultEl.hidden = false;
          resultEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        })
        .catch(function () {
          showFormError(form, ERROR_MESSAGE);
        })
        .finally(function () {
          submitBtn.disabled = false;
        });
    });
  }

  function setText(form, selector, value) {
    var el = form.querySelector(selector);
    if (el) el.textContent = value;
  }

  function clearErrors(form) {
    form.querySelectorAll('[data-error]').forEach(function (el) {
      el.hidden = true;
      el.textContent = '';
    });
    var formError = form.querySelector('[data-apport-form-error]');
    if (formError) {
      formError.hidden = true;
      formError.textContent = '';
    }
    form.querySelectorAll('.apport-simulator__input.is-invalid, .apport-simulator__select.is-invalid').forEach(function (el) {
      el.classList.remove('is-invalid');
    });
  }

  function showFieldError(form, field, message) {
    var errorEl = form.querySelector('[data-error="' + field + '"]');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.hidden = false;
    }
    var input = form.querySelector('[data-apport-' + field + ']') || form.querySelector('[name="' + field + '"]');
    if (input) input.classList.add('is-invalid');
  }

  function showFormError(form, message) {
    var formError = form.querySelector('[data-apport-form-error]');
    if (formError) {
      formError.textContent = message;
      formError.hidden = false;
    }
  }
})();
