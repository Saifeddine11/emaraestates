import Image from 'next/image';
import { Reveal } from '@/components/motion/Reveal';
import { RecruitmentForm } from '@/components/forms/RecruitmentForm';
import { SectionLabel } from '@/components/ui/Section';

export function RecruitmentHero() {
  return (
    <section className="relative isolate overflow-hidden bg-forest px-[clamp(22px,4vw,60px)] pb-[72px] pt-[112px] md:min-h-svh md:pb-[88px]">
      <Image
        src="/img/hero-optimized.webp"
        alt=""
        fill
        priority
        sizes="100vw"
        className="-z-[3] object-cover [filter:saturate(0.88)_contrast(1.05)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-[2] bg-[linear-gradient(105deg,rgba(18,24,18,0.9)_0%,rgba(45,58,45,0.72)_52%,rgba(18,24,18,0.86)_100%),linear-gradient(180deg,rgba(18,24,18,0.18)_0%,rgba(18,24,18,0.78)_100%)]"
      />

      <div className="mx-auto grid w-full max-w-[1180px] items-start gap-[clamp(32px,4.5vw,64px)] lg:grid-cols-[minmax(0,0.92fr)_minmax(360px,0.95fr)]">
        <Reveal direction="left" className="lg:sticky lg:top-[120px] lg:pt-4">
          <SectionLabel tone="dark" className="text-[#f0ddba]">
            Recrutement
          </SectionLabel>
          <p className="font-serif text-[clamp(40px,5.8vw,72px)] font-light leading-[0.98] tracking-[-0.02em] text-cream">
            Emara Estates
          </p>
          <h1 className="mt-4 max-w-[560px] text-balance font-serif text-[clamp(26px,3.4vw,38px)] font-normal leading-[1.2] text-cream/[0.92]">
            Commercial immobilier à Marrakech
          </h1>
          <p className="mt-5 max-w-[480px] text-[clamp(16px,1.35vw,18px)] font-normal leading-[1.75] text-cream/[0.78]">
            Trois étapes courtes pour présenter votre profil.
          </p>
        </Reveal>

        <Reveal direction="up" delay={0.08}>
          <RecruitmentForm />
        </Reveal>
      </div>
    </section>
  );
}
