'use client';

import { AnimatePresence, motion } from 'motion/react';
import { PhoneCountryField, type PhoneCountryFieldProps, type PhoneCountryPanel } from '@/components/forms/PhoneCountryField';

/** The country list fading down into place, and back out on close. */
const AnimatedPanel: PhoneCountryPanel = ({ open, className, children }) => (
  <AnimatePresence>
    {open && (
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
        className={className}
      >
        {children()}
      </motion.div>
    )}
  </AnimatePresence>
);

/**
 * Country-code selector + national number field, as the site's forms use it:
 * PhoneCountryField (the field, its detection and its keyboard support) with
 * the animated country list.
 */
export function PhoneCountryInput(props: Omit<PhoneCountryFieldProps, 'Panel'>) {
  return <PhoneCountryField {...props} Panel={AnimatedPanel} />;
}
