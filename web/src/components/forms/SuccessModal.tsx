'use client';

import Image from 'next/image';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef } from 'react';
import { ButtonLink, Button } from '@/components/ui/Button';
import { ROUTES, SOCIAL } from '@/lib/site';

/**
 * Post-submission confirmation.
 *
 * Copy, social destinations and actions match the modal that
 * js/contact-form.js injected. Note the WhatsApp link here is the "échanger"
 * variant, which differs from the float and CTA band — keep them distinct.
 */

const WHATSAPP_SUCCESS =
  'https://wa.me/212670038899?text=Bonjour%2C%20je%20souhaite%20%C3%A9changer%20avec%20Emara%20Estates%20au%20sujet%20d%27un%20projet%20immobilier%20%C3%A0%20Marrakech.%20Merci';

const SOCIALS = [
  { label: 'Instagram', href: SOCIAL.instagram, icon: '/img/iconsocailmedia/instagram.png' },
  { label: 'TikTok', href: SOCIAL.tiktok, icon: '/img/iconsocailmedia/tik-tok.png' },
  { label: 'Snapchat', href: SOCIAL.snapchat, icon: '/img/iconsocailmedia/snapchat.png' },
  { label: 'WhatsApp', href: WHATSAPP_SUCCESS, icon: '/img/iconsocailmedia/whatsapp.png' },
];

export function SuccessModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    restoreRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      restoreRef.current?.focus?.();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
          className="fixed inset-0 z-9999 flex items-center justify-center p-5"
        >
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            onClick={onClose}
            className="absolute inset-0 cursor-default bg-forest/85 backdrop-blur-sm"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="form-success-modal-title"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
            className="relative w-full max-w-[560px] overflow-y-auto rounded-3xl bg-shell p-8 text-center shadow-[0_40px_100px_-40px_rgba(0,0,0,0.5)] md:p-12"
            style={{ maxHeight: '90dvh' }}
          >
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="absolute right-5 top-4 cursor-pointer text-2xl leading-none text-forest/75 transition-colors duration-300 hover:text-forest"
            >
              ×
            </button>

            <h2
              id="form-success-modal-title"
              className="font-serif text-[clamp(28px,3vw,38px)] font-light text-forest"
            >
              Merci pour votre demande
            </h2>
            <p className="mt-4 text-[16.5px] font-normal leading-[1.9] text-forest/75">
              Un conseiller d’Emara Estates vous contactera dans les plus brefs délais.
            </p>

            <p className="mt-9 text-[13.5px] font-normal uppercase tracking-[3px] text-bronze">
              Suivez-nous sur nos réseaux
            </p>
            <p className="mt-2 text-[16px] font-normal text-forest/70">
              Découvrez nos projets, visites et actualités immobilières à Marrakech.
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {SOCIALS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${social.label} Emara Estates`}
                  className="flex items-center gap-2 rounded-full border border-forest/12 px-4 py-2.5 text-[16px] font-normal text-forest transition-colors duration-300 hover:border-bronze hover:text-bronze"
                >
                  <Image src={social.icon} alt="" width={24} height={24} className="size-5" />
                  <span>{social.label}</span>
                </a>
              ))}
            </div>

            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <Button variant="outline" tone="light" onClick={onClose}>
                Fermer
              </Button>
              <ButtonLink href={ROUTES.home} variant="primary">
                Retour au site
              </ButtonLink>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
