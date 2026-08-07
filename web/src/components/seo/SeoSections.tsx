import type { ReactNode } from 'react';
import Image from 'next/image';
import { Reveal } from '@/components/motion/Reveal';
import { ButtonLink } from '@/components/ui/Button';
import { SectionLabel, SectionText, SectionTitle } from '@/components/ui/Section';
import { cn } from '@/lib/cn';

/**
 * Section grammar shared by the three SEO landing pages.
 *
 * These routes exist for search, so the components are deliberately thin: they
 * carry layout and motion, and every string is passed in from the page so the
 * copy stays auditable against the legacy file it came from.
 */

/** `.project-hero.seo-hero` — full-bleed photo, label, h1, standfirst. */
export function SeoHero({
  label,
  title,
  intro,
  image,
}: {
  label: string;
  title: string;
  intro: string;
  /** Legacy shipped this as a CSS background; `priority` makes it the LCP image. */
  image: string;
}) {
  return (
    <header className="relative flex min-h-[78vh] items-center overflow-hidden bg-forest px-[clamp(28px,5vw,60px)] pb-[88px] pt-[136px] md:min-h-[86vh] md:pb-[120px] md:pt-40">
      <Image
        src={image}
        alt=""
        aria-hidden="true"
        fill
        priority
        sizes="100vw"
        className="scale-105 object-cover"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(180deg,rgba(45,58,45,0.78)_0%,rgba(45,58,45,0.55)_35%,rgba(45,58,45,0.92)_100%)]"
      />
      <Reveal className="relative z-[2] mx-auto w-full max-w-[1240px]">
        <SectionLabel tone="dark" rule={false}>
          {label}
        </SectionLabel>
        <h1 className="max-w-[900px] text-balance font-serif text-[clamp(44px,6vw,88px)] font-light leading-[1.02] text-cream">
          {title}
        </h1>
        <p className="mt-6 max-w-[720px] text-[clamp(16px,1.5vw,20px)] font-normal leading-[1.9] text-cream/[0.82]">
          {intro}
        </p>
      </Reveal>
    </header>
  );
}

/**
 * `.project-overview.seo-split-sticky` — editorial column beside a sticky
 * image. `flip` puts the image first, alternating down the page as in the
 * legacy markup.
 */
export function SplitSticky({
  label,
  title,
  children,
  image,
  alt,
  flip = false,
}: {
  label: string;
  title: string;
  children: ReactNode;
  image: string;
  alt: string;
  flip?: boolean;
}) {
  return (
    <section className="grid items-start gap-[clamp(34px,5vw,78px)] bg-cream px-[clamp(28px,5vw,60px)] py-[clamp(72px,9vw,120px)] lg:grid-cols-2">
      <Reveal
        direction={flip ? 'right' : 'left'}
        className={cn('lg:sticky lg:top-32', flip && 'lg:order-2')}
      >
        <SectionLabel>{label}</SectionLabel>
        <SectionTitle className="text-[clamp(32px,3.6vw,52px)]">{title}</SectionTitle>
        <SectionText className="mt-6">{children}</SectionText>
      </Reveal>
      <Reveal direction={flip ? 'left' : 'right'} className={cn(flip && 'lg:order-1')}>
        <div className="overflow-hidden rounded-2xl">
          <Image
            src={image}
            alt={alt}
            width={1600}
            height={1067}
            loading="lazy"
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="h-full w-full object-cover"
          />
        </div>
      </Reveal>
    </section>
  );
}

/**
 * `.seo-program-block` — a split like `SplitSticky` but with a call to action
 * under the copy and no sticky behaviour.
 */
export function ProgramBlock({
  label,
  title,
  children,
  image,
  alt,
  cta,
}: {
  label: string;
  title: string;
  children: ReactNode;
  image: string;
  alt: string;
  cta: { href: string; text: string };
}) {
  return (
    <section className="grid items-center gap-[clamp(34px,5vw,78px)] bg-cream px-[clamp(28px,5vw,60px)] py-[clamp(72px,9vw,120px)] lg:grid-cols-2">
      <Reveal direction="left">
        <div className="overflow-hidden rounded-2xl">
          <Image
            src={image}
            alt={alt}
            width={1600}
            height={1066}
            loading="lazy"
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="h-full w-full object-cover"
          />
        </div>
      </Reveal>
      <Reveal direction="right">
        <SectionLabel>{label}</SectionLabel>
        <SectionTitle className="text-[clamp(32px,3.6vw,52px)]">{title}</SectionTitle>
        <SectionText className="mt-6">{children}</SectionText>
        <div className="mt-9">
          <ButtonLink href={cta.href} variant="primary">
            {cta.text}
          </ButtonLink>
        </div>
      </Reveal>
    </section>
  );
}

/** `.project-overview` with no visual — a full-width editorial passage. */
export function TextBlock({
  label,
  title,
  children,
}: {
  label: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="bg-cream px-[clamp(28px,5vw,60px)] py-[clamp(72px,9vw,120px)]">
      <Reveal direction="left" className="mx-auto w-full max-w-[1320px]">
        <SectionLabel>{label}</SectionLabel>
        <SectionTitle className="text-[clamp(32px,3.6vw,52px)]">{title}</SectionTitle>
        <SectionText className="mt-6 max-w-[900px]">{children}</SectionText>
      </Reveal>
    </section>
  );
}

/** `.pinned-bg-grid` — h3 mini-cards inside a pinned card. */
export function PinnedMiniCards({ cards }: { cards: { title: string; body: string }[] }) {
  return (
    <div className="mt-7 grid gap-5 sm:grid-cols-3">
      {cards.map((card) => (
        <article key={card.title} className="border-t border-cream/20 pt-4">
          <h3 className="font-serif text-[17px] font-normal leading-[1.35] text-cream">
            {card.title}
          </h3>
          <p className="mt-2 text-[16px] font-normal leading-[1.8] text-cream/70">{card.body}</p>
        </article>
      ))}
    </div>
  );
}

/**
 * `.show-apartment-section--teaser` — photo beside a card that is labelled by
 * its own heading, so the id is passed in rather than generated.
 */
export function ShowApartmentTeaser({
  titleId,
  label,
  title,
  body,
  image,
  alt,
  buttons,
}: {
  titleId: string;
  label: string;
  title: string;
  body: string;
  image: string;
  alt: string;
  buttons: { href: string; text: string; variant: 'primary' | 'outline' }[];
}) {
  return (
    <section
      aria-labelledby={titleId}
      className="grid items-center gap-[clamp(34px,5vw,78px)] bg-shell px-[clamp(28px,5vw,60px)] py-[clamp(72px,9vw,120px)] lg:grid-cols-2"
    >
      <Reveal direction="left">
        <div className="overflow-hidden rounded-2xl">
          <Image
            src={image}
            alt={alt}
            width={1600}
            height={1066}
            loading="lazy"
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="h-full w-full object-cover"
          />
        </div>
      </Reveal>
      <Reveal direction="right">
        <SectionLabel>{label}</SectionLabel>
        <SectionTitle id={titleId} className="text-[clamp(30px,3.2vw,46px)]">
          {title}
        </SectionTitle>
        <SectionText className="mt-6">{body}</SectionText>
        <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {buttons.map((button) => (
            <ButtonLink key={button.href} href={button.href} variant={button.variant}>
              {button.text}
            </ButtonLink>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

/** `.pinned-bg-points` — labelled bullets inside a pinned card. */
export function PinnedPoints({ points }: { points: { term: string; detail: string }[] }) {
  return (
    <ul className="mt-7 flex flex-col gap-5">
      {points.map((point) => (
        <li key={point.term} className="border-l-2 border-bronze pl-5">
          <strong className="block text-[13.5px] font-normal uppercase tracking-[2.4px] text-bronze">
            {point.term}
          </strong>
          <span className="mt-1.5 block text-[16.5px] font-normal leading-[1.85] text-cream/75">
            {point.detail}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * `.services` — numbered card grid.
 *
 * `id` is opt-in: the gueliz page renders two of these and only the second
 * carries `id="services"`, so hardcoding it would create a duplicate id and a
 * second anchor target that never existed.
 */
export function ServicesGrid({
  id,
  label,
  title,
  intro,
  cards,
}: {
  id?: string;
  label: string;
  title: string;
  intro?: string;
  cards: { title: string; body: string }[];
}) {
  return (
    <section
      id={id}
      className={cn(
        'bg-shell px-[clamp(28px,5vw,60px)] py-[clamp(72px,9vw,120px)]',
        id && 'scroll-mt-24',
      )}
    >
      <div className="mx-auto w-full max-w-[1320px]">
        <Reveal>
          <SectionLabel>{label}</SectionLabel>
          <SectionTitle className="text-[clamp(32px,3.6vw,52px)]">{title}</SectionTitle>
          {intro && <SectionText className="mt-6">{intro}</SectionText>}
        </Reveal>
        <div className={cn('mt-14 grid gap-8', cards.length === 4 ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-3')}>
          {cards.map((card, index) => (
            <Reveal key={card.title} direction="up" delay={0.1 * (index + 1)}>
              <div className="h-full border-t border-forest/12 pt-7">
                <div className="font-serif text-[34px] font-light leading-none text-bronze">
                  {String(index + 1).padStart(2, '0')}
                </div>
                <div className="mt-5 font-serif text-[23px] font-normal text-forest">
                  {card.title}
                </div>
                <p className="mt-3.5 text-[16.5px] font-normal leading-[1.9] text-forest/75">
                  {card.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/** `.pinned-bg-section` — photo stage with an overlaid editorial card. */
export function PinnedBackground({
  ariaLabel,
  image,
  alt,
  label,
  title,
  intro,
  children,
  cta,
}: {
  ariaLabel: string;
  image: string;
  alt: string;
  label: string;
  title: string;
  intro: string;
  children?: ReactNode;
  cta?: { href: string; text: string };
}) {
  return (
    <section
      aria-label={ariaLabel}
      className="relative isolate flex min-h-[80vh] items-center overflow-hidden px-[clamp(28px,5vw,60px)] py-[clamp(72px,9vw,120px)]"
    >
      <Image
        src={image}
        alt={alt}
        fill
        loading="lazy"
        sizes="100vw"
        className="-z-10 object-cover"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(18,24,18,0.55)_0%,rgba(18,24,18,0.78)_100%)]"
      />
      <div className="mx-auto w-full max-w-[1240px]">
        <Reveal direction="up">
          <div className="max-w-[620px] rounded-2xl border border-cream/15 bg-[rgba(18,24,18,0.55)] p-[clamp(24px,3vw,42px)] backdrop-blur-md">
            <SectionLabel tone="dark">{label}</SectionLabel>
            <SectionTitle tone="dark" className="text-[clamp(30px,3.2vw,46px)]">
              {title}
            </SectionTitle>
            <p className="mt-5 text-[16px] font-normal leading-[1.9] text-cream/80">{intro}</p>
            {children}
            {cta && (
              <div className="mt-8">
                <ButtonLink href={cta.href} variant="primary">
                  {cta.text}
                </ButtonLink>
              </div>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/** `.cta-section.project-cta` — centred closing band. */
export function SeoCta({
  label,
  title,
  intro,
  buttons,
}: {
  label: string;
  title: string;
  intro: string;
  buttons: { href: string; text: string; variant: 'primary' | 'outline' }[];
}) {
  return (
    <section className="bg-forest px-[clamp(28px,5vw,60px)] py-[clamp(80px,10vw,130px)] text-center">
      <Reveal className="mx-auto w-full max-w-[860px]">
        <SectionLabel tone="dark" centered>
          {label}
        </SectionLabel>
        <SectionTitle tone="dark" className="text-[clamp(32px,3.8vw,56px)]">
          {title}
        </SectionTitle>
        <p className="mx-auto mt-6 max-w-[680px] text-[17px] font-normal leading-[1.9] text-cream/[0.82]">
          {intro}
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap">
          {buttons.map((button) => (
            <ButtonLink
              key={button.href + button.text}
              href={button.href}
              variant={button.variant}
              tone="dark"
            >
              {button.text}
            </ButtonLink>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
