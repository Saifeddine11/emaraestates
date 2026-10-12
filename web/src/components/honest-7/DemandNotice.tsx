import { cn } from '@/lib/cn';
import { DEMAND_CLAIM } from '@/lib/content/honest-signature-7';

/**
 * « Forte demande — +30 demandes reçues chaque jour », at the top of the
 * lead card, right above the question. It replaced the live ActivityNotice
 * on 2026-10-12: that band only counted this form, while most enquiries
 * arrive off-site (WhatsApp, phone, Meta forms).
 *
 * Static by design: the figure is DEMAND_CLAIM, the client's all-channels
 * daily average rounded down — a claim they must be able to substantiate,
 * not a measurement. Nothing here polls, animates a count, or implies one.
 */

/** The page's red, lightened: the band sits on the green glass of the lead card. */
const RED = 'text-[#ff8a7c]';

export function DemandNotice({ className }: { className?: string }) {
  if (DEMAND_CLAIM < 1) return null;

  return (
    <div className={className}>
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase leading-none tracking-[0.14em] text-cream/75">
        <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-[#ff8a7c]" />
        Forte demande
      </p>

      <p className="mt-2.5 flex items-center gap-3">
        <span className={cn('font-sans text-[46px] font-medium leading-[0.82] tracking-[-0.04em] tabular-nums', RED)}>+{DEMAND_CLAIM}</span>
        <span className="text-[12.5px] font-semibold uppercase leading-[1.3] tracking-[0.1em] text-cream">
          demandes reçues
          <br />
          chaque jour
        </span>
      </p>
    </div>
  );
}
