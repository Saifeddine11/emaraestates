'use client';

import { useEffect, useRef } from 'react';
import { LeadForm, useLeadForm } from '@/components/honest-7/DossierLeadForm';
import { FACTS } from '@/lib/content/honest-signature-7';

/**
 * The form every CTA opens. A native modal `<dialog>`: focus trap, Escape,
 * inert page behind it and the top layer (above the header and the WhatsApp
 * float) come from the browser. Bottom sheet on phones, centred on desktop.
 */
export function LeadDrawer() {
  const { drawerOpen, closeDrawer } = useLeadForm();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const root = document.documentElement;
    if (drawerOpen && !dialog.open) {
      dialog.showModal();
      root.style.overflow = 'hidden';
    } else if (!drawerOpen && dialog.open) {
      dialog.close();
    }
    if (!drawerOpen) root.style.overflow = '';
  }, [drawerOpen]);

  return (
    <dialog
      ref={dialogRef}
      id="hs7-lead-drawer"
      aria-labelledby="hs7-drawer-title"
      onClose={closeDrawer}
      onClick={(event) => {
        if (event.target === event.currentTarget) closeDrawer();
      }}
      className="hs7-sheet m-0 mt-auto max-h-[calc(100dvh-10px)] w-full max-w-none overflow-hidden rounded-t-[26px] bg-shell p-0 text-forest shadow-[0_-20px_60px_-20px_rgba(20,30,20,0.45)] backdrop:bg-[#1d261d]/60 backdrop:backdrop-blur-[3px] sm:m-auto sm:max-h-[min(90dvh,860px)] sm:w-[min(560px,calc(100vw-48px))] sm:rounded-[28px]"
    >
      <div data-sheet-body className="max-h-[inherit] overflow-y-auto overscroll-contain">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 bg-shell/95 px-6 pb-3 pt-4 backdrop-blur sm:px-9 sm:pt-6">
          <div aria-hidden="true" className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-forest/15 sm:hidden" />
          <p id="hs7-drawer-title" className="pt-1 text-[13px] font-medium uppercase tracking-[0.2em] text-olive">
            {FACTS.project} · Guéliz
          </p>
          <button
            type="button"
            onClick={closeDrawer}
            aria-label="Fermer"
            className="-mr-2 flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-forest transition-colors hover:bg-forest/5"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-5" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        <div className="px-6 pb-[max(24px,env(safe-area-inset-bottom))] pt-1 sm:px-9 sm:pb-9">
          <LeadForm idPrefix="hs7-sheet" active={drawerOpen} onDone={closeDrawer} />
        </div>
      </div>
    </dialog>
  );
}
