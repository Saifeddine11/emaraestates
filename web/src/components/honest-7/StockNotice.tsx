import { cn } from '@/lib/cn';
import { STOCK_LEFT } from '@/lib/content/honest-signature-7';

/**
 * « Dernières disponibilités — {STOCK_LEFT} derniers appartements disponibles », at the top of the
 * lead card, right above the question. It replaced the « +66 demandes reçues
 * chaque jour » band on 2026-10-14, at the client's request.
 *
 * Static by design: the figure is STOCK_LEFT, the client's own count of the
 * apartments still for sale, kept by hand in the content file. Nothing here
 * counts down, polls or animates: a number that moves by itself would be a
 * fabricated signal.
 */

/** The page's red, lightened: the band sits on the green glass of the lead card. */
const RED = 'text-[#ff8a7c]';

export function StockNotice({ className }: { className?: string }) {
  if (STOCK_LEFT < 1) return null;

  return (
    <div className={className}>
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase leading-none tracking-[0.14em] text-cream/75">
        <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-[#ff8a7c]" />
        Dernières disponibilités
      </p>

      <p className="mt-2.5 flex items-center gap-3">
        <span className={cn('font-sans text-[46px] font-medium leading-[0.82] tracking-[-0.04em] tabular-nums', RED)}>{STOCK_LEFT}</span>
        <span className="text-[12.5px] font-semibold uppercase leading-[1.3] tracking-[0.1em] text-cream">
          derniers appartements
          <br />
          disponibles
        </span>
      </p>
    </div>
  );
}
