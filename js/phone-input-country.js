(function(window, document) {
  'use strict';

  var FALLBACK_COUNTRY = 'FR';
  var COUNTRIES = [
    { countryCode: 'MA', code: '+212', country: 'Morocco', label: 'Maroc', flag: '🇲🇦' },
    { countryCode: 'FR', code: '+33', country: 'France', label: 'France', flag: '🇫🇷' },
    { countryCode: 'BE', code: '+32', country: 'Belgium', label: 'Belgique', flag: '🇧🇪' },
    { countryCode: 'CH', code: '+41', country: 'Switzerland', label: 'Suisse', flag: '🇨🇭' },
    { countryCode: 'ES', code: '+34', country: 'Spain', label: 'Espagne', flag: '🇪🇸' },
    { countryCode: 'NL', code: '+31', country: 'Netherlands', label: 'Pays-Bas', flag: '🇳🇱' },
    { countryCode: 'GB', code: '+44', country: 'United Kingdom', label: 'Royaume-Uni', flag: '🇬🇧' },
    { countryCode: 'DE', code: '+49', country: 'Germany', label: 'Allemagne', flag: '🇩🇪' },
    { countryCode: 'IT', code: '+39', country: 'Italy', label: 'Italie', flag: '🇮🇹' },
    { countryCode: 'PT', code: '+351', country: 'Portugal', label: 'Portugal', flag: '🇵🇹' },
    { countryCode: 'AE', code: '+971', country: 'United Arab Emirates', label: 'Emirats Arabes Unis', flag: '🇦🇪' },
    { countryCode: 'SA', code: '+966', country: 'Saudi Arabia', label: 'Arabie Saoudite', flag: '🇸🇦' },
    { countryCode: 'QA', code: '+974', country: 'Qatar', label: 'Qatar', flag: '🇶🇦' },
    { countryCode: 'KW', code: '+965', country: 'Kuwait', label: 'Koweit', flag: '🇰🇼' },
    { countryCode: 'US', code: '+1', country: 'United States / Canada', label: 'Etats-Unis / Canada', flag: '🇺🇸' },
    { countryCode: 'CA', code: '+1', country: 'United States / Canada', label: 'Canada', flag: '🇨🇦' },
    { countryCode: 'DZ', code: '+213', country: 'Algeria', label: 'Algerie', flag: '🇩🇿' },
    { countryCode: 'TN', code: '+216', country: 'Tunisia', label: 'Tunisie', flag: '🇹🇳' },
    { countryCode: 'SN', code: '+221', country: 'Senegal', label: 'Senegal', flag: '🇸🇳' },
    { countryCode: 'CI', code: '+225', country: 'Cote d Ivoire', label: 'Cote d Ivoire', flag: '🇨🇮' },
    { countryCode: 'EG', code: '+20', country: 'Egypt', label: 'Egypte', flag: '🇪🇬' },
    { countryCode: 'TR', code: '+90', country: 'Turkey', label: 'Turquie', flag: '🇹🇷' },
    { countryCode: 'IE', code: '+353', country: 'Ireland', label: 'Irlande', flag: '🇮🇪' },
    { countryCode: 'LU', code: '+352', country: 'Luxembourg', label: 'Luxembourg', flag: '🇱🇺' },
    { countryCode: 'MC', code: '+377', country: 'Monaco', label: 'Monaco', flag: '🇲🇨' },
    { countryCode: 'AT', code: '+43', country: 'Austria', label: 'Autriche', flag: '🇦🇹' },
    { countryCode: 'SE', code: '+46', country: 'Sweden', label: 'Suede', flag: '🇸🇪' },
    { countryCode: 'NO', code: '+47', country: 'Norway', label: 'Norvege', flag: '🇳🇴' },
    { countryCode: 'DK', code: '+45', country: 'Denmark', label: 'Danemark', flag: '🇩🇰' },
    { countryCode: 'FI', code: '+358', country: 'Finland', label: 'Finlande', flag: '🇫🇮' },
    { countryCode: 'PL', code: '+48', country: 'Poland', label: 'Pologne', flag: '🇵🇱' },
    { countryCode: 'GR', code: '+30', country: 'Greece', label: 'Grece', flag: '🇬🇷' },
    { countryCode: 'BR', code: '+55', country: 'Brazil', label: 'Bresil', flag: '🇧🇷' },
    { countryCode: 'MX', code: '+52', country: 'Mexico', label: 'Mexique', flag: '🇲🇽' },
    { countryCode: 'RU', code: '+7', country: 'Russia', label: 'Russie', flag: '🇷🇺' },
    { countryCode: 'CN', code: '+86', country: 'China', label: 'Chine', flag: '🇨🇳' },
    { countryCode: 'JP', code: '+81', country: 'Japan', label: 'Japon', flag: '🇯🇵' },
    { countryCode: 'IN', code: '+91', country: 'India', label: 'Inde', flag: '🇮🇳' },
    { countryCode: 'AU', code: '+61', country: 'Australia', label: 'Australie', flag: '🇦🇺' }
  ];

  var TIMEZONE_COUNTRIES = {
    'Africa/Casablanca': 'MA',
    'Europe/Paris': 'FR',
    'Europe/Brussels': 'BE',
    'Europe/Zurich': 'CH',
    'Europe/Madrid': 'ES',
    'Europe/Amsterdam': 'NL',
    'Europe/London': 'GB',
    'Europe/Berlin': 'DE',
    'Europe/Rome': 'IT',
    'Europe/Lisbon': 'PT',
    'Asia/Dubai': 'AE',
    'Asia/Riyadh': 'SA',
    'Asia/Qatar': 'QA',
    'Asia/Kuwait': 'KW',
    'America/New_York': 'US',
    'America/Chicago': 'US',
    'America/Denver': 'US',
    'America/Los_Angeles': 'US',
    'America/Toronto': 'CA'
  };

  function normalizeText(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function digitsOnly(value) {
    return String(value || '').replace(/\D/g, '');
  }

  function findCountry(value) {
    var raw = String(value || '').toUpperCase();
    return COUNTRIES.filter(function(country) {
      return country.countryCode === raw || country.code === value;
    })[0] || COUNTRIES.filter(function(country) {
      return country.countryCode === FALLBACK_COUNTRY;
    })[0] || COUNTRIES[0];
  }

  function detectCountryCode() {
    var languages = [];
    if (navigator.languages && navigator.languages.length) languages = navigator.languages;
    if (navigator.language) languages = languages.concat(navigator.language);

    for (var i = 0; i < languages.length; i += 1) {
      var parts = String(languages[i] || '').split('-');
      var region = parts.length > 1 ? parts.pop().toUpperCase() : '';
      if (region && COUNTRIES.some(function(country) { return country.countryCode === region; })) {
        return region;
      }
    }

    try {
      var timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (TIMEZONE_COUNTRIES[timezone]) return TIMEZONE_COUNTRIES[timezone];
    } catch (error) {
      return FALLBACK_COUNTRY;
    }

    return FALLBACK_COUNTRY;
  }

  function normalizeLocalNumber(value, code) {
    var number = digitsOnly(value);
    var codeDigits = digitsOnly(code);

    if (number.indexOf('00') === 0) number = number.slice(2);
    if (codeDigits && number.indexOf(codeDigits) === 0 && number.length > codeDigits.length + 3) {
      number = number.slice(codeDigits.length);
    }
    number = number.replace(/^0+/, '');

    return number;
  }

  function populateNativeSelect(select) {
    select.innerHTML = '';
    COUNTRIES.forEach(function(country) {
      var option = document.createElement('option');
      option.value = country.countryCode;
      option.dataset.phoneCode = country.code;
      option.dataset.country = country.country;
      option.textContent = country.label + ' ' + country.code;
      select.appendChild(option);
    });
  }

  function closeDropdown(field) {
    var dropdown = field.querySelector('[data-phone-dropdown]');
    var button = field.querySelector('[data-phone-button]');
    if (dropdown) dropdown.hidden = true;
    if (button) button.setAttribute('aria-expanded', 'false');
  }

  function openDropdown(field) {
    var dropdown = field.querySelector('[data-phone-dropdown]');
    var button = field.querySelector('[data-phone-button]');
    var search = field.querySelector('[data-phone-search]');
    if (!dropdown || !button) return;
    dropdown.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    renderOptions(field, search ? search.value : '');
    if (search) search.focus();
  }

  function updateButton(field, country) {
    var flag = field.querySelector('[data-phone-selected-flag]');
    var name = field.querySelector('[data-phone-selected-name]');
    var code = field.querySelector('[data-phone-selected-code]');
    if (flag) flag.textContent = country.flag;
    if (name) name.textContent = country.label;
    if (code) code.textContent = country.code;
  }

  function renderOptions(field, query) {
    var list = field.querySelector('[data-phone-options]');
    if (!list) return;
    var current = findCountry((field.querySelector('[data-phone-code]') || {}).value);
    var normalizedQuery = normalizeText(query);
    var matches = COUNTRIES.filter(function(country) {
      var haystack = normalizeText([
        country.label,
        country.country,
        country.countryCode,
        country.code
      ].join(' '));
      return !normalizedQuery || haystack.indexOf(normalizedQuery) !== -1;
    });

    list.innerHTML = '';
    matches.forEach(function(country) {
      var option = document.createElement('button');
      option.type = 'button';
      option.className = 'phone-country-option';
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', country.countryCode === current.countryCode ? 'true' : 'false');
      option.dataset.countryCode = country.countryCode;
      option.innerHTML = '<span class="phone-country-option__flag">' + country.flag + '</span>' +
        '<span class="phone-country-option__name">' + country.label + '</span>' +
        '<span class="phone-country-option__meta">' + country.countryCode + ' ' + country.code + '</span>';
      option.addEventListener('click', function() {
        setCountry(field, country.countryCode, true);
        closeDropdown(field);
      });
      list.appendChild(option);
    });
  }

  function ensureCustomPicker(field) {
    if (field.querySelector('[data-phone-button]')) return;

    var control = field.querySelector('.phone-country-control');
    var select = field.querySelector('[data-phone-code]');
    var numberInput = field.querySelector('[data-phone-number]');
    if (!control || !select || !numberInput) return;
    if (!field.querySelector('[data-phone-country-code]')) {
      var countryCodeInput = document.createElement('input');
      countryCodeInput.type = 'hidden';
      countryCodeInput.name = 'phoneCountryCode';
      countryCodeInput.dataset.phoneCountryCode = 'true';
      field.insertBefore(countryCodeInput, field.querySelector('[data-error-for="telephone"]'));
    }

    select.classList.add('phone-native-select');
    select.setAttribute('tabindex', '-1');
    select.setAttribute('aria-hidden', 'true');

    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'phone-country-trigger';
    button.dataset.phoneButton = 'true';
    button.setAttribute('aria-label', 'Choisir un indicatif pays');
    button.setAttribute('aria-haspopup', 'listbox');
    button.setAttribute('aria-expanded', 'false');
    button.innerHTML = '<span class="phone-country-trigger__flag" data-phone-selected-flag></span>' +
      '<span class="phone-country-trigger__name" data-phone-selected-name></span>' +
      '<span class="phone-country-trigger__code" data-phone-selected-code></span>' +
      '<span class="phone-country-trigger__chevron" aria-hidden="true">⌄</span>';

    var dropdown = document.createElement('div');
    dropdown.className = 'phone-country-dropdown';
    dropdown.dataset.phoneDropdown = 'true';
    dropdown.hidden = true;
    dropdown.innerHTML = '<input class="phone-country-search" type="search" autocomplete="off" data-phone-search aria-label="Rechercher un pays ou indicatif" placeholder="Rechercher un pays ou +33">' +
      '<div class="phone-country-options" role="listbox" data-phone-options></div>';

    control.insertBefore(button, numberInput);
    field.appendChild(dropdown);

    button.addEventListener('click', function() {
      var isOpen = button.getAttribute('aria-expanded') === 'true';
      if (isOpen) closeDropdown(field);
      else openDropdown(field);
    });

    dropdown.querySelector('[data-phone-search]').addEventListener('input', function(event) {
      renderOptions(field, event.target.value);
    });

    document.addEventListener('click', function(event) {
      if (!field.contains(event.target)) closeDropdown(field);
    });

    field.addEventListener('keydown', function(event) {
      if (event.key === 'Escape') closeDropdown(field);
    });
  }

  function setCountry(field, countryCode, markTouched) {
    var select = field.querySelector('[data-phone-code]');
    if (!select) return null;
    var country = findCountry(countryCode || FALLBACK_COUNTRY);
    select.value = country.countryCode;
    select.dataset.selectedCode = country.code;
    if (markTouched) field.dataset.phoneCountryTouched = 'true';
    updateButton(field, country);
    return syncField(field);
  }

  function syncField(field) {
    if (!field) return null;

    var select = field.querySelector('[data-phone-code]');
    var numberInput = field.querySelector('[data-phone-number]');
    var countryInput = field.querySelector('[data-phone-country]');
    var countryCodeInput = field.querySelector('[data-phone-country-code]');
    var fullInput = field.querySelector('[data-phone-full]');
    var legacyInput = field.querySelector('[data-phone-legacy]');
    if (!select || !numberInput || !countryInput || !countryCodeInput || !fullInput || !legacyInput) return null;

    var country = findCountry(select.value || FALLBACK_COUNTRY);
    var localNumber = normalizeLocalNumber(numberInput.value, country.code);
    var phoneFull = localNumber ? country.code + localNumber : '';

    select.value = country.countryCode;
    countryInput.value = country.country;
    countryCodeInput.value = country.countryCode;
    fullInput.value = phoneFull;
    legacyInput.value = phoneFull;
    updateButton(field, country);

    return {
      phoneFull: phoneFull,
      phoneCode: country.code,
      phoneCountry: country.country,
      phoneCountryCode: country.countryCode,
      phoneNumber: localNumber
    };
  }

  function sync(form) {
    if (!form) return null;
    return syncField(form.querySelector('[data-phone-country-field]'));
  }

  function init(form) {
    if (!form) return null;
    var field = form.querySelector('[data-phone-country-field]');
    if (!field) return null;

    var select = field.querySelector('[data-phone-code]');
    if (select && !field.dataset.phoneOptionsReady) {
      populateNativeSelect(select);
      field.dataset.phoneOptionsReady = 'true';
    }
    ensureCustomPicker(field);

    if (!field.dataset.phoneCountryTouched) {
      setCountry(field, FALLBACK_COUNTRY, false);
    }

    if (field.dataset.phoneInputBound === 'true') return syncField(field);
    field.dataset.phoneInputBound = 'true';

    field.querySelectorAll('[data-phone-code], [data-phone-number]').forEach(function(input) {
      input.addEventListener('input', function() { syncField(field); });
      input.addEventListener('change', function() {
        if (input.matches('[data-phone-code]')) field.dataset.phoneCountryTouched = 'true';
        syncField(field);
      });
      input.addEventListener('blur', function() { syncField(field); });
    });

    return syncField(field);
  }

  window.PhoneInputWithCountryCode = {
    countries: COUNTRIES.slice(),
    detectCountryCode: detectCountryCode,
    init: init,
    sync: sync,
    syncField: syncField
  };
})(window, document);
