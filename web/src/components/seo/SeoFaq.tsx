'use client';

import { Fragment, useState } from 'react';
import { motion } from 'motion/react';
import { Reveal } from '@/components/motion/Reveal';
import { SectionLabel, SectionTitle } from '@/components/ui/Section';
import { cn } from '@/lib/cn';

/**
 * `.faq` on the SEO landing pages — single-open accordion, matching the legacy
 * `toggleFaq`.
 *
 * Answers stay mounted and collapse to height 0. Unmounting them would strip
 * indexed copy out of the static HTML and leave `aria-controls` dangling, which
 * on pages that exist for search is the whole ballgame.
 *
 * Panel ids (`faq-luxe-1`, `faq-gueliz-2`, …) are preserved verbatim per page.
 */
export type FaqItem = { id: string; question: string; answer: string };

export function SeoFaq({
  label,
  /** Rendered with the legacy `<br>` between the two halves of the title. */
  titleLines,
  items,
}: {
  label: string;
  titleLines: string[];
  items: FaqItem[];
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <section
      id="faq"
      className="scroll-mt-24 bg-shell px-[clamp(28px,5vw,60px)] py-[clamp(80px,10vw,130px)]"
    >
      <div className="mx-auto grid w-full max-w-[1320px] gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:gap-24">
        <Reveal direction="left" className="lg:sticky lg:top-32 lg:self-start">
          <SectionLabel>{label}</SectionLabel>
          <SectionTitle className="text-[clamp(32px,3.6vw,52px)]">
            {titleLines.map((line, index) => (
              <Fragment key={line}>
                {index > 0 && <br />}
                {line}
              </Fragment>
            ))}
          </SectionTitle>
        </Reveal>

        <Reveal direction="right">
          <div className="divide-y divide-forest/10 border-y border-forest/10">
            {items.map((item) => {
              const isOpen = openId === item.id;
              return (
                <div key={item.id}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={item.id}
                    onClick={() => setOpenId(isOpen ? null : item.id)}
                    className="flex w-full cursor-pointer items-center justify-between gap-6 py-6 text-left transition-colors duration-300 hover:text-bronze"
                  >
                    <span
                      className={cn(
                        'font-serif text-[clamp(19px,1.6vw,23px)] font-normal text-balance transition-colors duration-300',
                        isOpen ? 'text-bronze' : 'text-forest',
                      )}
                    >
                      {item.question}
                    </span>
                    <span
                      aria-hidden="true"
                      className={cn(
                        'relative size-4 shrink-0 transition-transform duration-500 ease-premium',
                        isOpen && 'rotate-45',
                      )}
                    >
                      <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-bronze" />
                      <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-bronze" />
                    </span>
                  </button>

                  <motion.div
                    id={item.id}
                    role="region"
                    inert={isOpen ? undefined : true}
                    initial={false}
                    animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
                    transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
                    className="overflow-hidden"
                  >
                    <p className="pb-7 pr-10 text-[16.5px] font-normal leading-[1.95] text-forest/75">
                      {item.answer}
                    </p>
                  </motion.div>
                </div>
              );
            })}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
