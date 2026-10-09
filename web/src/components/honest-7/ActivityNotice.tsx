'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { getActivity, getServerActivity, subscribeActivity } from '@/lib/activity';
import { cn } from '@/lib/cn';

/**
 * « Activité aujourd’hui — 10 demandes reçues aujourd’hui », at the top of the
 * lead card, right above the question.
 *
 * The figure is the number of requests the backend accepted today for this
 * project (lib/activity → /activity.php → contact.php). The band is absent
 * while that number is 0. When a request is accepted while the visitor is
 * here, "+1" rises next to the count, and the count changes once it has
 * played. Nothing else ever moves this number.
 *
 * Until the first answer the band's place is kept, empty — no figure, no
 * label: the page opens on the lead card (OpenOnForm), and the question under
 * the band must not move down under the visitor's finger when the count
 * arrives a second later.
 */

/** The page's red, lightened: the band sits on the green glass of the lead card. */
const RED = 'text-[#ff8a7c]';
/** Safety net: the count changes even if the browser never reports the end of the animation (1.2 s). */
const GAIN_FALLBACK_MS = 2500;

export function ActivityNotice({ className }: { className?: string }) {
  const { today, gain, settled } = useSyncExternalStore(subscribeActivity, getActivity, getServerActivity);
  // The gain whose "+1" has finished: until then the previous count stays on screen.
  const [played, setPlayed] = useState(0);
  const pending = gain && gain.id !== played ? gain : null;
  const count = pending ? pending.from : (today?.requests ?? 0);

  useEffect(() => {
    if (!pending) return;
    const timer = window.setTimeout(() => setPlayed(pending.id), GAIN_FALLBACK_MS);
    return () => window.clearTimeout(timer);
  }, [pending]);

  const shown = Boolean(today) && (count >= 1 || Boolean(pending));
  // Nothing received yet today (or no answer): no band, rather than a zero.
  if (!shown && settled) return null;

  return (
    <div data-activity={shown ? '' : undefined} data-activity-pending={shown ? undefined : ''} aria-hidden={shown ? undefined : true} className={className}>
      {/* Waiting for the first answer: the same lines, unseen, so the place kept is exactly the band's. */}
      <div className={shown ? 'motion-safe:animate-[hs7-fade-up_0.5s_var(--ease-step)_both]' : 'invisible'}>
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase leading-none tracking-[0.14em] text-cream/75">
          {/* "Live": a slow opacity pulse, nothing else. */}
          <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-[#ff8a7c] motion-safe:animate-[hs7-live-dot_2.6s_ease-in-out_infinite]" />
          Activité aujourd’hui
        </p>

        <p className="relative mt-2.5 flex items-center gap-3">
          <span
            key={`count-${played}`}
            data-activity-count
            className={cn(
              'font-sans text-[46px] font-medium leading-[0.82] tracking-[-0.04em] tabular-nums',
              RED,
              // The new count settles in once a "+1" has played; never on first paint.
              played > 0 && 'motion-safe:animate-[hs7-fade-up_0.45s_var(--ease-step)_both]',
            )}
          >
            {shown ? count : '\u00a0'}
          </span>
          <span className="text-[12.5px] font-semibold uppercase leading-[1.3] tracking-[0.1em] text-cream">
            {count === 1 ? 'demande reçue' : 'demandes reçues'}
            <br />
            aujourd’hui
          </span>

          {pending && (
            <span
              key={`plus-${pending.id}`}
              data-plus-one
              aria-hidden="true"
              onAnimationEnd={() => setPlayed(pending.id)}
              className={cn(
                'pointer-events-none absolute right-0 top-0 font-sans text-[24px] font-semibold leading-none tracking-[-0.02em] opacity-0',
                RED,
                'animate-[hs7-plus-one_1.2s_var(--ease-step)_both]',
              )}
            >
              +{pending.count}
            </span>
          )}
        </p>

        <p aria-live="polite" className="sr-only">
          {played > 0 && !pending ? `Nouvelle demande reçue : ${count} aujourd’hui.` : ''}
        </p>
      </div>
    </div>
  );
}
