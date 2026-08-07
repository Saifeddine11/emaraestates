'use client';

import Image from 'next/image';
import { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';

/**
 * Testimonial band with a parallaxed backdrop.
 *
 * The drift is driven by `useScroll`, which reads scroll progress on the
 * compositor rather than on a scroll listener, so it stays smooth without the
 * layout thrash the legacy handler caused. Disabled under reduced motion.
 */
export function ParallaxQuote() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });
  const y = useTransform(scrollYProgress, [0, 1], ['-8%', '8%']);

  return (
    <div
      ref={sectionRef}
      className="relative flex min-h-[520px] items-center justify-center overflow-hidden px-6 py-32"
    >
      <motion.div
        aria-hidden="true"
        style={prefersReducedMotion ? undefined : { y }}
        className="absolute inset-x-0 -inset-y-[12%]"
      >
        <Image
          src="/img/cta.webp"
          alt="Résidences Emara Estates à Marrakech"
          fill
          sizes="100vw"
          loading="lazy"
          className="object-cover"
        />
      </motion.div>

      <div aria-hidden="true" className="absolute inset-0 bg-forest/75" />

      <motion.blockquote
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.9, ease: [0.23, 1, 0.32, 1] }}
        className="relative mx-auto max-w-[880px] text-center"
      >
        <p className="font-serif text-[clamp(24px,3vw,40px)] font-light italic leading-[1.45] text-cream">
          &ldquo;Cinq résidences livrées, des centaines de clients satisfaits : la confiance de nos
          acquéreurs est notre meilleure signature.&rdquo;
        </p>
        <footer className="mt-8 text-[13.5px] font-normal uppercase tracking-[4px] text-bronze">
          Emara Estates
        </footer>
      </motion.blockquote>
    </div>
  );
}
