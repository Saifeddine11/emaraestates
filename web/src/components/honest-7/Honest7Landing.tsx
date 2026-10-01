import { DossierLeadForm } from '@/components/honest-7/DossierLeadForm';
import { HERO_FORM_ID, FINAL_FORM_ID, SHOW_APARTMENTS_ID, ScrollCta, SectionView, StickyAvailabilityCta } from '@/components/honest-7/LandingActions';
import { LandingTracking } from '@/components/honest-7/LandingTracking';
import { PaymentTimeline } from '@/components/honest-7/PaymentTimeline';
import { Picture } from '@/components/honest-7/Picture';
import { AmenityStory } from '@/components/residence-boutique/AmenityStory';
import { ProofCarousel } from '@/components/residence-boutique/ProofCarousel';
import { Lines, Rise } from '@/components/residence-boutique/Reveal';
import {
  AMENITY_SCENES,
  MAP_IMAGE,
  SHOW_APARTMENTS,
} from '@/lib/content/honest-signature-7';
import { CONTACT, WHATSAPP } from '@/lib/site';
import { cn } from '@/lib/cn';

const SHELL = 'mx-auto w-full max-w-[1400px] px-gutter';
const EYEBROW = 'text-[12px] font-medium uppercase tracking-[.2em]';
const H2 = 'font-sans font-medium uppercase leading-[.94] tracking-[-.035em]';
const PRIMARY = 'flex min-h-14 cursor-pointer items-center justify-center rounded-full bg-gold px-6 text-center text-[13px] font-semibold uppercase tracking-[.06em] text-forest transition-[transform,background-color] duration-300 ease-step hover:-translate-y-0.5 hover:bg-[#dfc18b]';
const SECONDARY = 'flex min-h-14 cursor-pointer items-center justify-center rounded-full border border-cream/35 px-6 text-center text-[13px] font-semibold uppercase tracking-[.06em] text-cream transition-[transform,border-color,background-color] duration-300 ease-step hover:-translate-y-0.5 hover:border-cream hover:bg-cream/8';

const HERO_AMENITIES = ['Piscine', 'Piscine chauffée', 'Spa', 'Jacuzzi', 'Salle de sport', 'Sauna', 'Cinéma extérieur', 'Conciergerie'] as const;

export function Honest7Landing() {
  return (
    <>
      <LandingTracking />
      <Header />
      <main id="main-content">
        <Hero />
        <ShowApartments />
        <Amenities />
        <Payment />
        <Location />
        <Fomo />
        <FinalForm />
      </main>
      <Footer />
      <StickyAvailabilityCta />
    </>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-[70] border-b border-forest/10 bg-shell/92 backdrop-blur-md">
      <div className={cn(SHELL, 'flex h-16 items-center justify-between gap-4 lg:h-[72px]')}>
        {/* eslint-disable-next-line @next/next/no-img-element -- responsive static-export asset */}
        <img src="/media/honest-7/logo-emara-forest-320.webp" alt="Emara Estates" width={320} height={180} className="h-9 w-auto lg:h-11" />
        <p className="hidden text-[12px] font-medium uppercase tracking-[.18em] text-forest/65 md:block">Guéliz • Marrakech</p>
        <ScrollCta target={HERO_FORM_ID} event="availability_cta_click" location="header" className="min-h-11 cursor-pointer rounded-full bg-forest px-4 text-[11px] font-semibold uppercase tracking-[.06em] text-cream sm:px-5 sm:text-[12px]">
          Recevoir le dossier
        </ScrollCta>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden bg-forest pb-14 pt-9 text-cream sm:pt-12 lg:pb-20 lg:pt-14">
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative bg, not LCP */}
      <img aria-hidden="true" alt="" src="/media/honest-7/facade-nuit-1080.webp" srcSet="/media/honest-7/facade-nuit-640.webp 640w, /media/honest-7/facade-nuit-1080.webp 1080w, /media/honest-7/facade-nuit-1600.webp 1600w" sizes="100vw" loading="eager" className="pointer-events-none absolute inset-0 size-full object-cover object-[50%_38%] opacity-[.18]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-b from-forest/60 via-forest/40 to-forest/90" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[.08] [background-image:linear-gradient(rgba(245,240,232,.16)_1px,transparent_1px),linear-gradient(90deg,rgba(245,240,232,.12)_1px,transparent_1px)] [background-size:64px_64px]" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 top-16 size-[390px] rounded-full border border-cream/10 motion-safe:animate-[rb-float-in_1.1s_var(--ease-step)_both]" />
      <div aria-hidden="true" className="pointer-events-none absolute right-[12%] top-16 hidden h-[70%] w-px rotate-[14deg] bg-gradient-to-b from-transparent via-gold/20 to-transparent lg:block" />

      <div className={cn(SHELL, 'relative')}>
        <p className="rb-in text-[12px] font-medium uppercase tracking-[.22em] text-gold [animation-delay:0ms]">
          Honest Signature 7 <span className="mx-2 text-cream/35">•</span> Guéliz <span className="mx-2 text-cream/35">•</span> Hyper-centre
        </p>

        <h1 id="hero-title" className="mt-5 font-sans text-[clamp(38px,9.5vw,78px)] font-medium uppercase leading-[.92] tracking-[-.05em] lg:text-[clamp(56px,5.8vw,92px)]">
          <span className="block overflow-hidden"><span className="rb-line block [animation-delay:100ms]">Une dernière</span></span>
          <span className="block overflow-hidden"><span className="rb-line block [animation-delay:220ms]">opportunité au</span></span>
          <span className="relative inline-block overflow-visible">
            <span className="block overflow-hidden"><span className="rb-line block text-gold [animation-delay:340ms]">cœur de Guéliz.</span></span>
            <svg aria-hidden="true" viewBox="0 0 420 18" preserveAspectRatio="none" className="absolute -bottom-2 left-0 h-3 w-full overflow-visible text-gold"><path className="rb-draw [animation-delay:600ms]" pathLength="1" d="M3 11C110 4 290 5 417 9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
          </span>
        </h1>
        <p className="rb-in mt-5 max-w-[640px] text-[clamp(16px,2.2vw,20px)] leading-[1.45] text-cream/75 [animation-delay:460ms]">Un des derniers terrains disponibles de l’hyper-centre accueille aujourd’hui Honest Signature 7.</p>

        <ul aria-label="Équipements et services" className="rb-in mt-8 grid grid-cols-2 gap-x-3 gap-y-2 border-y border-cream/14 py-4 [animation-delay:560ms] sm:grid-cols-4 lg:grid-cols-8 lg:gap-3">
          {HERO_AMENITIES.map((item) => (
            <li key={item} className="group relative flex min-h-11 items-center gap-2 text-[11px] font-medium uppercase leading-tight tracking-[.045em] text-cream/85">
              <AmenityIcon name={item} />
              <span className="relative">{item}{item === 'Conciergerie' && <span className="absolute -right-1 -top-3 text-[8px] tracking-[.13em] text-gold">Service</span>}</span>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-4">
          <p className="rb-in flex items-center gap-2 text-[13px] font-medium uppercase tracking-[.1em] text-cream/80 [animation-delay:700ms]">
            <span aria-hidden="true" className="text-gold">↗</span> À <span className="border-b border-gold pb-0.5 text-cream">1 minute</span> à pied du Plaza
          </p>
          <div className="rb-in rounded-full border border-gold/55 px-4 py-2 [animation-delay:780ms]">
            <span className="block text-[9px] font-medium uppercase tracking-[.17em] text-cream/65">À partir de</span>
            <span className="block whitespace-nowrap text-[21px] font-medium leading-tight text-gold">1,39 M MAD</span>
          </div>
        </div>

        <div className="rb-in mt-7 grid gap-3 sm:grid-cols-2 lg:max-w-[690px] [animation-delay:860ms]">
          <ScrollCta target={HERO_FORM_ID} event="hero_prices_cta_click" location="hero" className={PRIMARY}>Recevoir le dossier complet <span aria-hidden="true" className="ml-2">→</span></ScrollCta>
          <ScrollCta target={SHOW_APARTMENTS_ID} event="hero_show_apartment_click" location="hero" className={SECONDARY}>Voir les appartements témoins <span aria-hidden="true" className="ml-2">↓</span></ScrollCta>
        </div>

        <div className="relative z-10 mt-9 lg:mt-10">
          <div className="mx-auto max-w-[960px]"><DossierLeadForm placement="hero" id={HERO_FORM_ID} /></div>
        </div>
      </div>
    </section>
  );
}

function ShowApartments() {
  const slides = SHOW_APARTMENTS.map((room, index) => ({
    key: room.title,
    content: (
      <figure className="m-0">
        <div className="group relative aspect-[4/3] overflow-hidden rounded-[20px] bg-sand/35 lg:aspect-[16/10]">
          <Picture picture={room.picture} sizes="(min-width: 1024px) 58vw, (min-width: 641px) 64vw, 84vw" className="pointer-events-none transition-transform duration-[1200ms] ease-step group-hover:scale-[1.025]" />
          <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/55 to-transparent" />
          <figcaption className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 text-cream">
            <span className="font-sans text-[clamp(24px,3vw,40px)] font-medium uppercase tracking-[-.02em]">{room.title}</span>
            <span className="text-[13px] tabular-nums tracking-[.14em]">0{index + 1}</span>
          </figcaption>
        </div>
      </figure>
    ),
  }));
  return (
    <SectionView event="show_apartment_section_view" id={SHOW_APARTMENTS_ID} labelledBy="show-title" className="overflow-x-clip bg-cream py-band">
      <div className={SHELL}>
        <p className={cn(EYEBROW, 'text-olive')}>01 — Appartements témoins réels</p>
        <h2 id="show-title" className={cn(H2, 'mt-6 text-[clamp(48px,8vw,120px)] text-forest')}><Lines lines={['Ne l’imaginez pas.', <span key="entrez" className="font-serif font-normal normal-case italic text-olive">Entrez.</span>]} /></h2>
        <Rise className="mt-6 max-w-[600px]"><p className="text-[17px] leading-[1.55] text-forest/70">Découvrez des appartements témoins photographiés dans les résidences Honest déjà livrées.</p></Rise>
        <div className="mt-10 lg:mt-14"><ProofCarousel label="Visite des appartements témoins Honest" slides={slides} /></div>
        <div className="mt-12 grid gap-6 border-t border-forest/12 pt-8 md:grid-cols-[1fr_auto] md:items-end">
          <div><h3 className="font-sans text-[clamp(30px,4vw,54px)] font-medium uppercase leading-none tracking-[-.03em] text-forest">Vous vous y voyez ?</h3><p className="mt-3 text-[17px] text-forest/70">Découvrez les appartements actuellement disponibles.</p></div>
          <ScrollCta target={HERO_FORM_ID} event="show_apartment_cta_click" location="show_apartments" className={cn(PRIMARY, 'w-full bg-forest text-cream md:w-auto')}>Voir les prix & disponibilités <span aria-hidden="true" className="ml-2">→</span></ScrollCta>
        </div>
      </div>
    </SectionView>
  );
}

function Amenities() {
  return (
    <SectionView event="amenities_section_view" id="equipements" labelledBy="amenities-title" className="overflow-x-clip bg-shell py-band">
      <div className={SHELL}>
        <p className={cn(EYEBROW, 'text-olive')}>02 — Bien-être & services</p>
        <h2 id="amenities-title" className={cn(H2, 'mt-6 text-[clamp(42px,7vw,104px)] text-forest')}><Lines lines={['Votre résidence', 'ne s’arrête pas à', <span key="appartement" className="font-serif font-normal normal-case italic text-olive">votre appartement.</span>]} /></h2>
        <Rise className="mt-6"><p className="max-w-[520px] text-[18px] leading-[1.55] text-forest/70">Bien-être, services et Guéliz à votre porte.</p></Rise>
        <div className="mt-10 lg:mt-4"><AmenityStory scenes={AMENITY_SCENES} /></div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          <ServiceCard title="Conciergerie" label="Service" line="Un service pensé pour simplifier votre quotidien." />
          <ServiceCard title="Parking titré" label="Pratique" line="Un espace de stationnement titré au sein du projet." />
        </div>
        <p className="mt-6 text-[13px] text-forest/70">Visuels d’ambiance du projet, non contractuels.</p>
      </div>
    </SectionView>
  );
}

function ServiceCard({ title, label, line }: { title: string; label: string; line: string }) {
  return <Rise className="border-t border-forest/18 py-7"><div className="flex items-start gap-4"><AmenityIcon name={title} dark /><div><p className="text-[10px] font-medium uppercase tracking-[.18em] text-bronze">{label}</p><h3 className="mt-2 font-sans text-[clamp(28px,3vw,40px)] font-medium uppercase leading-none tracking-[-.03em] text-forest">{title}</h3><p className="mt-3 text-[16px] text-forest/70">{line}</p></div></div></Rise>;
}

function Payment() {
  return (
    <SectionView event="payment_section_view" id="paiement" labelledBy="payment-title" className="bg-shell py-band">
      <div className={SHELL}>
        <p className={cn(EYEBROW, 'text-olive')}>03 — Paiement progressif</p>
        <h2 id="payment-title" className={cn(H2, 'mt-6 text-[clamp(42px,7vw,104px)] text-forest')}><Lines lines={['Votre appartement.', <span key="paid" className="font-serif font-normal normal-case italic text-olive">Payé progressivement.</span>]} /></h2>
        <div className="mt-14 lg:mt-20"><PaymentTimeline /></div>
        <div className="mt-12 flex flex-col gap-5 border-t border-forest/12 pt-8 sm:flex-row sm:items-center sm:justify-between"><p className="text-[16px] text-forest/70">Livraison prévue : <strong className="font-medium text-forest">juin 2028</strong></p><ScrollCta target={HERO_FORM_ID} event="availability_cta_click" location="payment" className={cn(PRIMARY, 'w-full bg-forest text-cream sm:w-auto')}>Voir les appartements disponibles <span aria-hidden="true" className="ml-2">→</span></ScrollCta></div>
      </div>
    </SectionView>
  );
}

function Location() {
  return (
    <section id="localisation" aria-labelledby="location-title" className="overflow-hidden bg-forest py-band text-cream">
      <div className={cn(SHELL, 'grid items-center gap-12 lg:grid-cols-[.85fr_1.15fr] lg:gap-20')}>
        <div><p className={cn(EYEBROW, 'text-gold')}>04 — Guéliz hyper-centre</p><h2 id="location-title" className={cn(H2, 'mt-6 text-[clamp(42px,6.2vw,90px)]')}><Lines lines={['Pas « près de Guéliz ».', <span key="gueliz" className="font-serif font-normal normal-case italic text-gold">À Guéliz.</span>]} /></h2><Rise className="mt-10 border-t border-cream/15 pt-8"><p className="flex items-end gap-4"><span className="font-sans text-[clamp(130px,24vw,250px)] font-extralight leading-[.7] tracking-[-.08em]">1</span><span className="pb-1"><span className="block text-[12px] font-medium uppercase tracking-[.18em] text-gold">→ 1 minute</span><span className="mt-2 block text-[26px] font-medium uppercase leading-none">à pied du Plaza.</span></span></p></Rise></div>
        <Rise className="relative overflow-hidden rounded-[24px]"><div className="aspect-[4/3] bg-[#1f291f]"><Picture picture={MAP_IMAGE} sizes="(min-width: 1024px) 55vw, 100vw" className="object-[34%_40%]" /></div><p className="absolute left-4 top-4 rounded-full bg-shell/95 px-4 py-2 text-[11px] font-medium uppercase tracking-[.13em] text-forest">Honest Signature 7 → Plaza : 1 min</p></Rise>
      </div>
    </section>
  );
}

const CHOICES = ['Étage', 'Orientation', 'Surface', 'Configuration'];
function Fomo() {
  return (
    <section id="choix" aria-labelledby="fomo-title" className="bg-cream py-band">
      <div className={SHELL}>
        <p className={cn(EYEBROW, 'text-olive')}>05 — Disponibilités actuelles</p>
        <h2 id="fomo-title" className={cn(H2, 'mt-6 text-[clamp(40px,7vw,102px)] text-forest')}><Lines lines={['Vous pouvez encore choisir.', <span key="notforever" className="font-serif font-normal normal-case italic text-olive">Mais pas indéfiniment.</span>]} /></h2>
        <ul className="mt-12 grid grid-cols-2 border-t border-forest/12 lg:grid-cols-4">{CHOICES.map((choice, index) => <li key={choice} className="border-b border-forest/12 py-6 odd:border-r lg:border-b-0 lg:border-r lg:px-6 lg:first:pl-0 lg:last:border-r-0"><Rise delay={index * .07}><span className="text-[12px] tabular-nums text-bronze">0{index + 1}</span><p className="mt-4 font-sans text-[clamp(21px,2.2vw,32px)] font-medium uppercase leading-none tracking-[-.02em] text-forest">{choice}.</p></Rise></li>)}</ul>
        <div className="mt-12 flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between"><p className="font-serif text-[clamp(25px,3vw,40px)] italic leading-[1.15] text-forest">Chaque réservation peut réduire le choix restant.</p><ScrollCta target={FINAL_FORM_ID} event="availability_cta_click" location="fomo" className={cn(PRIMARY, 'w-full bg-forest text-cream sm:w-auto')}>Consulter les disponibilités <span aria-hidden="true" className="ml-2">→</span></ScrollCta></div>
      </div>
    </section>
  );
}

function FinalForm() {
  return (
    <section aria-labelledby="final-copy-title" className="bg-shell py-band">
      <div className={cn(SHELL, 'grid items-start gap-10 lg:grid-cols-[1fr_minmax(440px,600px)] lg:gap-20')}>
        <div className="lg:sticky lg:top-28"><p className={cn(EYEBROW, 'text-olive')}>06 — Votre appartement</p><h2 id="final-copy-title" className={cn(H2, 'mt-6 text-[clamp(38px,5.5vw,78px)] text-forest')}>Quel appartement est encore disponible <span className="font-serif font-normal normal-case italic text-olive">pour vous ?</span></h2><p className="mt-6 max-w-[500px] text-[18px] leading-[1.55] text-forest/70">Recevez la brochure, les plans, les prix et les disponibilités du projet.</p></div>
        <DossierLeadForm placement="final" id={FINAL_FORM_ID} />
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-forest pb-28 pt-12 text-cream/75 lg:pb-12">
      <div className={cn(SHELL, 'grid gap-8 text-[14px] md:grid-cols-[1.2fr_1fr_1.4fr]')}>
        <div>{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/img/logo.webp" alt="Emara Estates" width={1250} height={625} loading="lazy" className="h-11 w-auto" /><p className="mt-4">Commercialisation de Honest Signature 7, Guéliz, Marrakech.</p></div>
        <address className="not-italic"><a href={`tel:${CONTACT.phoneDisplay.replace(/\s/g, '')}`} className="block min-h-11 py-2 text-cream hover:underline">{CONTACT.phoneDisplay}</a><a href={`mailto:${CONTACT.email}`} className="block min-h-11 py-2 text-cream hover:underline">{CONTACT.email}</a><a href={WHATSAPP.bare} target="_blank" rel="noopener noreferrer" className="block min-h-11 py-2 text-cream hover:underline">WhatsApp ↗</a></address>
        <div><p>Vos coordonnées servent uniquement à vous recontacter au sujet de ce projet. Conformément à la loi 09-08, vous pouvez exercer vos droits à {CONTACT.email}.</p><p className="mt-3">© 2026 Emara Estates</p></div>
      </div>
    </footer>
  );
}

function AmenityIcon({ name, dark = false }: { name: string; dark?: boolean }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.35, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <span aria-hidden="true" className={cn('flex size-8 shrink-0 items-center justify-center rounded-full border transition-colors duration-300 group-hover:border-gold group-hover:text-gold', dark ? 'border-forest/20 text-olive' : 'border-cream/18 text-gold')}>
      <svg viewBox="0 0 24 24" className="size-4.5" {...common}>
        {name === 'Piscine' && <><path d="M3 9c2 0 2 2 4 2s2-2 4-2 2 2 4 2 2-2 4-2 2 2 2 2"/><path d="M3 14c2 0 2 2 4 2s2-2 4-2 2 2 4 2 2-2 4-2 2 2 2 2"/></>}
        {name === 'Piscine chauffée' && <><path d="M3 11c2 0 2 2 4 2s2-2 4-2 2 2 4 2 2-2 4-2 2 2 2 2"/><path d="M8 7c-1-1 1-2 0-3M12 7c-1-1 1-2 0-3M16 7c-1-1 1-2 0-3"/></>}
        {name === 'Spa' && <><path d="M12 20c4-2 7-5 7-9-4 0-7 2-7 6-1-4-3-6-7-6 0 4 3 7 7 9Z"/><path d="M12 17V7"/></>}
        {name === 'Jacuzzi' && <><path d="M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-3Z"/><path d="M8 9c-1-1 1-2 0-3M13 9c-1-1 1-2 0-3M18 9c-1-1 1-2 0-3"/></>}
        {name === 'Salle de sport' && <><path d="M7 9v6M17 9v6M4 10v4M20 10v4M7 12h10"/></>}
        {name === 'Sauna' && <><path d="M5 18h14M7 18V9h10v9M9 6c-1 1 1 2 0 3M13 5c-1 1 1 2 0 3"/></>}
        {name === 'Cinéma extérieur' && <><rect x="3" y="5" width="18" height="14" rx="1"/><path d="m10 9 5 3-5 3Z"/></>}
        {name === 'Conciergerie' && <><path d="M5 19h14M7 16h10M9 16v-4a3 3 0 0 1 6 0v4M12 7V5"/><path d="M10 5h4"/></>}
        {name === 'Parking titré' && <><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M10 17V7h3a3 3 0 0 1 0 6h-3"/></>}
      </svg>
    </span>
  );
}
