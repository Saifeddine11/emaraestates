/**
 * Event IDs shared by the browser Pixel and the Conversions API.
 *
 * Meta counts a browser event and a server event as one conversion only when
 * both carry the same `event_name` and the same event ID. The ID is generated
 * here, once, then passed to `fbq(…, { eventID })` AND sent to the server in
 * the form payload — the server never invents its own for the same conversion.
 */

type Prefix = 'lead' | 'reveal';

function uuid(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
  }
}

/** e.g. `lead_3f0c…` — the server accepts `^<prefix>_[A-Za-z0-9-]{8,64}$`. */
export function createMetaEventId(prefix: Prefix): string {
  return `${prefix}_${uuid()}`;
}
