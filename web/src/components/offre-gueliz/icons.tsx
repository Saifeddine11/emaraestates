import type { ReactNode } from 'react';

/**
 * Icon set for `/offre-gueliz`, keyed exactly as `js/offre-gueliz-config.js`
 * keys them. Paths are copied from the legacy inline SVGs.
 */
const PATHS: Record<string, ReactNode> = {
  building: (
    <>
      <path d="M4 21V6l7-3 7 3v15" />
      <path d="M4 21h16" />
      <path d="M9 9h.01M13 9h.01M9 13h.01M13 13h.01M9 17h.01M13 17h.01" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-7-6.3-7-11a7 7 0 0 1 14 0c0 4.7-7 11-7 11Z" />
      <circle cx="12" cy="10" r="2.6" />
    </>
  ),
  wallet: (
    <>
      <path d="M3 7h15a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
      <path d="M3 7l12-3v3" />
      <circle cx="16" cy="13" r="1.4" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
      <path d="M3 9h18M8 2.5v4M16 2.5v4" />
    </>
  ),
  layout: (
    <>
      <rect x="3" y="3.5" width="18" height="17" rx="2.5" />
      <path d="M3 9.5h18M9 9.5V21" />
    </>
  ),
  ruler: (
    <>
      <path d="M3 16.5 16.5 3 21 7.5 7.5 21 3 16.5Z" />
      <path d="M8 8.5l1.5 1.5M11 5.5l1.5 1.5M5 11.5 6.5 13" />
    </>
  ),
  jacuzzi: (
    <>
      <path d="M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-3Z" />
      <path d="M7 12V6.5a2 2 0 0 1 2-2h1" />
      <path d="M12 4.5v1M15 4.5v1M18 4.5v1" />
      <path d="M5 21l1-1M19 21l-1-1" />
    </>
  ),
  sauna: (
    <>
      <path d="M4 20V9l8-5 8 5v11" />
      <path d="M4 20h16" />
      <path d="M9 20v-4a3 3 0 0 1 6 0v4" />
      <path d="M12 4v2" />
    </>
  ),
  spa: (
    <path d="M12 22c4-2 7-5.5 7-10 0-1.5-.5-3-1.5-4-.8 1.2-1.8 1.8-2.5 2 .3-2-.6-4.2-3-6-2.4 1.8-3.3 4-3 6-.7-.2-1.7-.8-2.5-2C5.5 9 5 10.5 5 12c0 4.5 3 8 7 10Z" />
  ),
  pool: (
    <>
      <path d="M2 17c1.5 0 1.5 1.2 3 1.2S8.5 17 10 17s1.5 1.2 3 1.2S15.5 17 17 17s1.5 1.2 3 1.2 1.5-1.2 3-1.2" />
      <path d="M2 21c1.5 0 1.5 1.2 3 1.2M8 13V6a2 2 0 0 1 4 0M12 13V6a2 2 0 0 1 4 0v.5" />
      <path d="M6.5 9.5h5.5" />
    </>
  ),
  gym: (
    <>
      <path d="M6.5 6.5 17.5 17.5M4 9l-1.5-1.5a1.5 1.5 0 0 1 0-2.1l1-1a1.5 1.5 0 0 1 2.1 0L9 6M15 18l1.5 1.5a1.5 1.5 0 0 0 2.1 0l1-1a1.5 1.5 0 0 0 0-2.1L18 15" />
      <path d="m18 6 1-1M5 18l1 1" />
    </>
  ),
  cinema: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="m10 9.5 5 2.5-5 2.5v-5Z" />
    </>
  ),
  parking: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M9 17V7h4a3 3 0 0 1 0 6H9" />
    </>
  ),
  check: <path d="M20 6 9 17l-5-5" />,
};

export function OgIcon({ name, className }: { name: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {PATHS[name] ?? null}
    </svg>
  );
}
