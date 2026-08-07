'use client';

import { motion } from 'motion/react';
import { useState } from 'react';
import { Reveal } from '@/components/motion/Reveal';
import { SectionLabel, SectionText, SectionTitle } from '@/components/ui/Section';
import { FAQ_ITEMS } from '@/lib/content/home';
import { cn } from '@/lib/cn';

/**
 * `#faq` — single-open accordion, matching the legacy `toggleFaq` behaviour.
 *
 * Panel ids (`faq-home-1` … `faq-home-9`) are preserved: they are referenced by
 * `aria-controls` and were present in the indexed markup.
 */
export function Faq() {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <section
      id="faq"
      className="scroll-mt-24 bg-shell px-[clamp(28px,5vw,60px)] py-[clamp(80px,10vw,130px)]"
    >
      <div className="mx-auto grid w-full max-w-[1320px] gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:gap-24">
        <Reveal direction="left" className="lg:sticky lg:top-32 lg:self-start">
          <SectionLabel>Questions Fréquentes</SectionLabel>
          <SectionTitle>
            Tout ce que vous
            <br />
            devez savoir
          </SectionTitle>
          <SectionText className="mt-6">
            Nous répondons aux questions les plus courantes de nos clients avant leur acquisition à
            Marrakech.
          </SectionText>

          <div className="mt-12 flex gap-12">
            <div>
              <div className="font-serif text-5xl font-normal leading-none text-bronze">5</div>
              <div className="mt-2 text-[14px] font-semibold uppercase tracking-[1.5px] text-forest/85">
                Résidences livrées
              </div>
            </div>
            <div>
              <div className="font-serif text-5xl font-normal leading-none text-bronze">Projet</div>
              <div className="mt-2 text-[14px] font-semibold uppercase tracking-[1.5px] text-forest/85">
                étudié avec prudence
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal direction="right">
          <div className="divide-y divide-forest/10 border-y border-forest/10">
            {FAQ_ITEMS.map((item) => {
              const isOpen = openId === item.id;
              return (
                <div key={item.id}>
                  {/* Questions are buttons, not headings — the indexed page has
                      exactly one h1, twelve h2 and one h3, and promoting these
                      would change that hierarchy. */}
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={item.id}
                    onClick={() => setOpenId(isOpen ? null : item.id)}
                    className="flex w-full cursor-pointer items-center justify-between gap-6 py-6 text-left transition-colors duration-300 hover:text-bronze"
                  >
                    <span
                      className={cn(
                        'font-serif text-[clamp(20px,1.7vw,25px)] font-normal text-balance transition-colors duration-300',
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

                  {/* Answers stay mounted and collapse to height 0. Unmounting
                      them would leave `aria-controls` dangling and strip the
                      answer copy — indexed content — out of the static HTML. */}
                  <motion.div
                    id={item.id}
                    role="region"
                    inert={isOpen ? undefined : true}
                    initial={false}
                    animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
                    transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
                    className="overflow-hidden"
                  >
                    <p className="pb-7 pr-10 text-[16.5px] font-normal leading-[1.7] text-forest/80">
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
