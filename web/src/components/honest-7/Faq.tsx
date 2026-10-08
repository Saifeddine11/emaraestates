'use client';

import { FAQ } from '@/lib/content/honest-signature-7';
import { trackLandingEvent } from '@/lib/landing-events';

/**
 * Native <details>: the answers are in the HTML, open without JavaScript and
 * are keyboard-operable for free. The script only reports which question was
 * opened.
 */
export function Faq() {
  return (
    <div className="border-t border-forest/15">
      {FAQ.map((item, index) => (
        <details
          key={item.question}
          onToggle={(event) => {
            if (!event.currentTarget.open) return;
            trackLandingEvent('faq_opened', { project: 'Honest Signature 7', question: item.question, position: index + 1 });
          }}
          className="group border-b border-forest/15"
        >
          <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-5 py-4 text-[17px] font-medium leading-snug text-forest transition-colors duration-200 hover:text-olive sm:text-[19px] [&::-webkit-details-marker]:hidden">
            {item.question}
            <span aria-hidden="true" className="relative size-4 shrink-0">
              <span className="absolute left-0 top-1/2 h-px w-4 -translate-y-1/2 bg-current" />
              <span className="absolute left-1/2 top-0 h-4 w-px -translate-x-1/2 bg-current transition-transform duration-300 ease-step group-open:scale-y-0" />
            </span>
          </summary>
          <p className="max-w-[68ch] pb-5 pr-9 text-[16px] leading-[1.65] text-forest/75">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
