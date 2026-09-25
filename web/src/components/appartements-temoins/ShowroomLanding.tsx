import Image from 'next/image';
import { FadeIn } from '@/components/appartements-temoins/FadeIn';
import { ShowroomGallery } from '@/components/appartements-temoins/ShowroomGallery';
import {
  CTA_PRIMARY,
  CTA_PRIMARY_DARK,
  CTA_SECONDARY_ON_DARK,
  StickyVisitCta,
  VisitCta,
} from '@/components/appartements-temoins/VisitCta';
import { VisitRequestForm } from '@/components/appartements-temoins/VisitRequestForm';
import { HERO_IMAGE } from '@/lib/content/appartements-temoins';
import { ROUTES } from '@/lib/site';

const HERO_ID = 'visite-temoins';

const EYEBROW = 'text-[11px] font-semibold uppercase tracking-[0.18em] text-olive';
const H2 =
  'font-sans text-[clamp(34px,4.2vw,54px)] font-semibold leading-[1.08] tracking-[-0.05em] text-forest';
const LEAD = 'text-[clamp(16px,1.35vw,18px)] font-normal leading-[1.75] text-forest/70';

const BENEFITS = [
  {
    title: 'Finitions et matériaux',
    text: 'Voyez de près les revêtements, les menuiseries et les équipements de cuisine et de salle de bains.',
    icon: <path d="M4 20h16M6 20V9l6-5 6 5v11M10 20v-5h4v5" />,
  },
  {
    title: 'Volumes et luminosité',
    text: 'Appréciez la hauteur sous plafond, la profondeur des pièces et la lumière naturelle.',
    icon: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </>
    ),
  },
  {
    title: 'Agencement réel',
    text: 'Circulez d’une pièce à l’autre pour juger la distribution, les rangements et les ouvertures.',
    icon: <path d="M3 3h18v18H3zM3 12h9M12 3v18M12 16h9" />,
  },
  {
    title: 'Qualité des espaces communs',
    text: 'Découvrez l’entrée, les circulations et les parties communes d’une résidence déjà livrée.',
    icon: <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-4h6v4M9 10h.01M15 10h.01M9 14h.01M15 14h.01" />,
  },
];

const STEPS = [
  {
    number: '01',
    title: 'Choisissez votre créneau',
    text: 'Indiquez le moment qui vous convient ; un conseiller vous confirme le rendez-vous.',
  },
  {
    number: '02',
    title: 'Découvrez un appartement témoin',
    text: 'Une visite accompagnée à Guéliz, au rythme de vos questions.',
  },
  {
    number: '03',
    title: 'Recevez les biens disponibles correspondant à votre projet',
    text: 'Plans, prix et disponibilités actuelles selon votre budget et la typologie recherchée.',
  },
];

export function ShowroomLanding() {
  return (
    <>
      {/* 1 — Hero. Forest ground so the transparent site header stays legible;
          the photo sits beside the text, never under it. */}
      <section
        id={HERO_ID}
        aria-labelledby="showroom-title"
        className="relative isolate overflow-hidden bg-forest px-gutter pb-[clamp(56px,7vw,96px)] pt-[clamp(112px,11vw,150px)]"
      >
        <div aria-hidden="true" className="absolute -right-40 -top-40 -z-[1] size-[520px] rounded-full bg-olive/15 blur-3xl" />
        <div className="mx-auto grid w-full max-w-[1280px] items-center gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:gap-[clamp(48px,6vw,88px)]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sand">
              Appartements témoins · Résidences livrées
            </p>
            <h1
              id="showroom-title"
              className="mt-4 font-sans text-[clamp(38px,5.2vw,72px)] font-semibold leading-[1.03] tracking-[-0.045em] text-cream"
            >
              Visitez les appartements témoins Honest à Marrakech
            </h1>
            <p className="mt-6 max-w-[540px] text-[clamp(16.5px,1.45vw,20px)] font-normal leading-[1.6] text-cream/78">
              Découvrez les volumes, les finitions et l’ambiance réelle des résidences Honest Signature
              à Guéliz.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <VisitCta intent="Visite d’un appartement témoin" className={CTA_PRIMARY}>
                Planifier une visite
              </VisitCta>
              <VisitCta intent="Recevoir les plans et disponibilités" className={CTA_SECONDARY_ON_DARK}>
                Recevoir les disponibilités
              </VisitCta>
            </div>
          </div>

          <figure className="relative m-0 aspect-[3/2] overflow-hidden rounded-[26px] bg-forest shadow-[0_30px_80px_-30px_rgba(0,0,0,0.55)]">
            <Image
              src={HERO_IMAGE.src}
              alt={HERO_IMAGE.alt}
              fill
              priority
              sizes="(max-width: 1023px) 100vw, 55vw"
              className="object-cover"
            />
            <figcaption className="absolute left-4 top-4 rounded-full bg-white/85 px-3.5 py-1.5 text-[12px] font-semibold tracking-[0.02em] text-forest backdrop-blur-md">
              Guéliz · Marrakech
            </figcaption>
          </figure>
        </div>
      </section>

      {/* 2 — Trust introduction */}
      <section className="bg-white px-gutter py-[clamp(64px,8vw,112px)]">
        <FadeIn className="mx-auto w-full max-w-[860px] text-center">
          <p className={EYEBROW}>Voir avant de choisir</p>
          <h2 className={`mt-4 ${H2}`}>Des appartements que vous pouvez réellement visiter.</h2>
          <p className={`mx-auto mt-6 max-w-[680px] ${LEAD}`}>
            Les photos donnent une idée ; la visite permet de juger. Dans les résidences Honest déjà
            livrées à Guéliz, vous voyez sur place les finitions, les volumes, la lumière naturelle,
            les matériaux et l’ambiance avant de prendre votre décision.
          </p>
          <dl className="mx-auto mt-10 grid max-w-[640px] grid-cols-3 gap-4 border-y border-forest/10 py-6">
            <Stat value="4" label="résidences livrées" />
            <Stat value="Guéliz" label="hyper-centre" />
            <Stat value="Sur place" label="visite accompagnée" />
          </dl>
        </FadeIn>
      </section>

      {/* 3 — Filterable gallery */}
      <section
        id="galerie-temoins"
        aria-labelledby="gallery-title"
        className="bg-[#f7f9f6] px-gutter py-[clamp(64px,8vw,112px)]"
      >
        <div className="mx-auto w-full max-w-[1280px]">
          <FadeIn className="max-w-[720px]">
            <p className={EYEBROW}>Galerie</p>
            <h2 id="gallery-title" className={`mt-4 ${H2}`}>
              Les appartements témoins des résidences livrées
            </h2>
          </FadeIn>
          <div className="mt-8">
            <ShowroomGallery />
          </div>
        </div>
      </section>

      {/* 4 — What the visitor can check */}
      <section aria-labelledby="benefits-title" className="bg-white px-gutter py-[clamp(64px,8vw,112px)]">
        <div className="mx-auto w-full max-w-[1186px]">
          <FadeIn className="max-w-[720px]">
            <p className={EYEBROW}>Pendant la visite</p>
            <h2 id="benefits-title" className={`mt-4 ${H2}`}>
              Ce que vous pouvez vérifier sur place
            </h2>
          </FadeIn>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map((benefit, index) => (
              <li key={benefit.title}>
              <FadeIn delay={index * 0.06} className="h-full rounded-[22px] border border-forest/8 bg-[#f7f9f6] p-6">
                <span aria-hidden="true" className="flex size-11 items-center justify-center rounded-full bg-white text-bronze">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="size-5">
                    {benefit.icon}
                  </svg>
                </span>
                <h3 className="mt-5 font-sans text-[19px] font-semibold tracking-[-0.03em] text-forest">{benefit.title}</h3>
                <p className="mt-2 text-[15px] leading-[1.65] text-forest/65">{benefit.text}</p>
              </FadeIn>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 5 — Visit experience */}
      <section aria-labelledby="steps-title" className="bg-cream px-gutter py-[clamp(64px,8vw,112px)]">
        <div className="mx-auto w-full max-w-[1186px]">
          <FadeIn className="max-w-[720px]">
            <p className={EYEBROW}>La visite</p>
            <h2 id="steps-title" className={`mt-4 ${H2}`}>Voyez avant de vous décider</h2>
          </FadeIn>
          <ol className="mt-10 grid gap-4 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.number}>
              <FadeIn delay={index * 0.08} className="h-full rounded-[22px] bg-white p-7">
                <span className="font-sans text-[15px] font-semibold tracking-[0.06em] text-bronze">{step.number}</span>
                <h3 className="mt-4 font-sans text-[21px] font-semibold leading-[1.25] tracking-[-0.03em] text-forest">
                  {step.title}
                </h3>
                <p className="mt-3 text-[15px] leading-[1.65] text-forest/65">{step.text}</p>
              </FadeIn>
              </li>
            ))}
          </ol>
          <div className="mt-10">
            <VisitCta intent="Visite d’un appartement témoin" className={CTA_PRIMARY_DARK}>
              Planifier une visite
            </VisitCta>
          </div>
        </div>
      </section>

      {/* 6 — Current project. Explicitly separate from the delivered residences. */}
      <section aria-labelledby="hs7-title" className="bg-white px-gutter py-[clamp(64px,8vw,112px)]">
        <FadeIn className="mx-auto grid w-full max-w-[1186px] items-center gap-8 overflow-hidden rounded-[26px] border border-forest/10 bg-[#f7f9f6] md:grid-cols-[0.9fr_1.1fr]">
          <div className="relative aspect-[4/3] md:aspect-auto md:h-full md:min-h-[360px]">
            <Image
              src="/img/honest006.webp"
              alt="Façade contemporaine d'Honest Signature 7 à Guéliz Marrakech"
              fill
              loading="lazy"
              sizes="(max-width: 767px) 100vw, 45vw"
              className="object-cover"
            />
          </div>
          <div className="p-7 pt-0 md:p-10 md:pl-0">
            <p className="inline-flex rounded-full border border-bronze/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-bronze">
              Projet en cours · En construction
            </p>
            <h2 id="hs7-title" className="mt-5 font-sans text-[clamp(28px,3vw,38px)] font-semibold leading-[1.12] tracking-[-0.045em] text-forest">
              Honest Signature 7
            </h2>
            <p className={`mt-4 max-w-[520px] ${LEAD}`}>
              Après avoir vu les réalisations Honest, découvrez le prochain projet à 1 minute à pied du
              Plaza.
            </p>
            <p className="mt-3 text-[13px] text-forest/55">
              Les appartements témoins présentés plus haut appartiennent aux résidences Honest 1 à 4,
              déjà livrées.
            </p>
            <a
              href={ROUTES.residences}
              className="mt-7 inline-flex min-h-12 items-center gap-1.5 text-[15px] font-semibold text-forest transition-colors hover:text-bronze"
            >
              Découvrir Honest Signature 7 <span aria-hidden="true">→</span>
            </a>
          </div>
        </FadeIn>
      </section>

      {/* 7 — Conversion form */}
      <VisitRequestForm />

      {/* 8 — Final CTA */}
      <section className="bg-forest px-gutter py-[clamp(72px,9vw,120px)] text-center">
        <FadeIn className="mx-auto max-w-[820px]">
          <h2 className="font-sans text-[clamp(32px,4vw,52px)] font-semibold leading-[1.1] tracking-[-0.05em] text-cream">
            Une visite permet de voir ce que les photos ne montrent pas.
          </h2>
          <div className="mt-9">
            <VisitCta intent="Visite d’un appartement témoin" className={CTA_PRIMARY}>
              Planifier une visite
            </VisitCta>
          </div>
        </FadeIn>
      </section>

      <StickyVisitCta heroId={HERO_ID} />
    </>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-0">
      <dt className="font-sans text-[clamp(18px,2vw,24px)] font-semibold tracking-[-0.04em] text-forest">{value}</dt>
      <dd className="mt-1 text-[12.5px] leading-snug text-forest/58">{label}</dd>
    </div>
  );
}
