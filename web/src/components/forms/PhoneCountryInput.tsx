'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  COUNTRIES,
  detectCountryCodeFromLocale,
  detectVisitorCountryCode,
  findCountry,
  normalizeText,
  type Country,
} from '@/lib/countries';
import { cn } from '@/lib/cn';

/**
 * Country-code selector + national number field.
 *
 * Replaces js/phone-input-country.js. SSR defaults to France (+33). After
 * mount we silently upgrade via IP → locale → timezone (never GPS). Manual
 * picks are never overwritten.
 *
 * Keyboard support: the trigger opens the panel, typing filters, Up/Down moves
 * through matches, Enter selects, Escape closes and returns focus.
 */

export function PhoneCountryInput({
  country,
  onCountryChange,
  number,
  onNumberChange,
  invalid,
  describedBy,
  selectId = 'contact-phone-code',
  inputId = 'contact-phone',
  numberLabel = 'Téléphone',
  placeholder = 'Téléphone',
}: {
  country: Country;
  onCountryChange: (country: Country) => void;
  number: string;
  onNumberChange: (value: string) => void;
  invalid?: boolean;
  describedBy?: string;
  /**
   * Ids default to the contact page's. `/offre-gueliz` is a separate lead
   * funnel with its own ids (`og-phone-code`, `og-phone`) — they are part of
   * that form's contract, so they are passed in rather than unified.
   */
  selectId?: string;
  inputId?: string;
  numberLabel?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const detectedRef = useRef(false);
  const userPickedRef = useRef(false);
  const onCountryChangeRef = useRef(onCountryChange);
  const countryCodeRef = useRef(country.countryCode);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    onCountryChangeRef.current = onCountryChange;
  }, [onCountryChange]);

  useEffect(() => {
    countryCodeRef.current = country.countryCode;
  }, [country.countryCode]);

  // Silent auto-detect once on mount. Strict Mode double-invoke is gated by
  // the ref; a manual pick sets userPickedRef so later IP results are ignored.
  useEffect(() => {
    if (detectedRef.current) return;
    detectedRef.current = true;
    let cancelled = false;

    const apply = (code: string) => {
      if (cancelled || userPickedRef.current) return;
      const guess = findCountry(code);
      if (guess.countryCode !== countryCodeRef.current) {
        onCountryChangeRef.current(guess);
      }
    };

    // Fast interim guess without flashing +1 for English browsers abroad.
    apply(detectCountryCodeFromLocale({ allowNorthAmerica: false }));

    void detectVisitorCountryCode(1500).then(apply);

    return () => {
      cancelled = true;
    };
  }, []);

  const matches = useMemo(() => {
    const normalized = normalizeText(query);
    if (!normalized) return COUNTRIES;
    return COUNTRIES.filter(
      (item) =>
        normalizeText(item.label).includes(normalized) ||
        normalizeText(item.country).includes(normalized) ||
        item.code.includes(normalized),
    );
  }, [query]);

  // Closing resets the filter here rather than in an effect, so the panel never
  // renders once with a stale query on the way down.
  const close = useCallback((returnFocus = false) => {
    setOpen(false);
    setQuery('');
    setHighlighted(0);
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) close();
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open, close]);

  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  const select = (item: Country) => {
    userPickedRef.current = true;
    onCountryChange(item);
    close(true);
  };

  return (
    <div ref={containerRef} className="relative">
      <div
        className={cn(
          'flex items-stretch overflow-hidden rounded-[10px] border bg-white transition-colors duration-300',
          invalid ? 'border-red-500/60' : 'border-forest/12 focus-within:border-bronze',
        )}
      >
        {/* The legacy markup shipped a real <select id="contact-phone-code">
            and js/phone-input-country.js hid it behind the custom trigger
            rather than removing it. Keeping it preserves that id, browser
            autofill via `tel-country-code`, and the no-JS fallback. */}
        <select
          id={selectId}
          name="phoneCode"
          data-phone-code=""
          aria-label="Indicatif pays"
          autoComplete="tel-country-code"
          aria-hidden="true"
          tabIndex={-1}
          value={country.countryCode}
          onChange={(event) => {
            const next = COUNTRIES.find((c) => c.countryCode === event.target.value);
            if (next) {
              userPickedRef.current = true;
              onCountryChange(next);
            }
          }}
          className="pointer-events-none absolute size-px overflow-hidden opacity-0"
        >
          {COUNTRIES.map((option) => (
            <option key={option.countryCode} value={option.countryCode}>
              {option.label} {option.code}
            </option>
          ))}
        </select>

        <button
          ref={triggerRef}
          type="button"
          onClick={() => (open ? close() : setOpen(true))}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={`Indicatif pays : ${country.label} ${country.code}`}
          className="flex shrink-0 cursor-pointer items-center gap-2 border-r border-forest/10 px-3.5 text-[16px] font-normal text-forest transition-colors duration-300 hover:bg-forest/[0.03]"
        >
          <span aria-hidden="true" className="text-base leading-none">
            {country.flag}
          </span>
          <span className="tabular-nums">{country.code}</span>
          <svg
            viewBox="0 0 24 24"
            className={cn(
              'size-3 transition-transform duration-300',
              open && 'rotate-180',
            )}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        <input
          id={inputId}
          name="phoneNumber"
          data-phone-number=""
          type="tel"
          inputMode="tel"
          maxLength={20}
          autoComplete="tel-national"
          placeholder={placeholder}
          aria-label={numberLabel}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          value={number}
          onChange={(event) => onNumberChange(event.target.value)}
          className="w-full min-w-0 bg-transparent px-5 py-[18px] text-base font-normal leading-[1.5] text-forest outline-none placeholder:text-forest/65"
        />
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="absolute left-0 top-[calc(100%+6px)] z-50 w-full max-w-[340px] overflow-hidden rounded-xl border border-forest/10 bg-white shadow-[0_20px_50px_-20px_rgba(45,58,45,0.4)]"
          >
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setHighlighted(0);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.preventDefault();
                  close(true);
                } else if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  setHighlighted((index) => Math.min(matches.length - 1, index + 1));
                } else if (event.key === 'ArrowUp') {
                  event.preventDefault();
                  setHighlighted((index) => Math.max(0, index - 1));
                } else if (event.key === 'Enter') {
                  event.preventDefault();
                  const match = matches[highlighted];
                  if (match) select(match);
                }
              }}
              placeholder="Rechercher un pays"
              aria-label="Rechercher un pays"
              className="w-full border-b border-forest/10 px-4 py-3 text-[16px] font-normal text-forest outline-none placeholder:text-forest/65"
            />
            <ul role="listbox" aria-label="Indicatif pays" className="max-h-64 overflow-y-auto py-1">
              {matches.map((item, index) => (
                <li key={`${item.countryCode}-${item.code}`}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={item.countryCode === country.countryCode}
                    onClick={() => select(item)}
                    onMouseEnter={() => setHighlighted(index)}
                    className={cn(
                      'flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left text-[16px] font-normal text-forest transition-colors duration-150',
                      index === highlighted && 'bg-forest/[0.05]',
                      item.countryCode === country.countryCode && 'text-bronze',
                    )}
                  >
                    <span aria-hidden="true">{item.flag}</span>
                    <span className="flex-1 truncate">{item.label}</span>
                    <span className="tabular-nums text-forest/75">{item.code}</span>
                  </button>
                </li>
              ))}
              {!matches.length && (
                <li className="px-4 py-3 text-[16px] font-normal text-forest/75">Aucun pays trouvé</li>
              )}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
