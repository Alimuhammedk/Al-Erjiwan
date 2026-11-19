// Reads what the owner pastes for the store map, and turns it into addresses that can only ever be Google Maps.
// Nothing the owner types is put on the page as it is: embed and open addresses are rebuilt from numbers, or taken
// only from a google.com address.

export type MapLocation = { embedUrl: string | null; openUrl: string };

const MAX_INPUT = 1000;
const MAX_PLACE = 100;

const digits = (s: string) =>
  s
    .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x06f0))
    .replace(/[٫]/g, ".");

// A broken %-sequence in a pasted address must not crash anything.
const decode = (s: string) => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

const isGoogle = (host: string) => host === "google.com" || host.endsWith(".google.com");
const isShort = (url: URL) => url.hostname === "maps.app.goo.gl" || (url.hostname === "goo.gl" && url.pathname.startsWith("/maps"));

const num = /^-?\d{1,3}(?:\.\d+)?$/;
function fromCoordinates(lat: string, lng: string): MapLocation | null {
  if (!num.test(lat) || !num.test(lng)) return null;
  const la = Number(lat);
  const lo = Number(lng);
  if (!(Math.abs(la) <= 90) || !(Math.abs(lo) <= 180)) return null;
  return {
    embedUrl: `https://maps.google.com/maps?q=${lat},${lng}&z=16&output=embed`,
    openUrl: `https://www.google.com/maps?q=${lat},${lng}`,
  };
}

function fromPlace(text: string): MapLocation | null {
  const place = text.replace(/[\u0000-\u001f<>"'`\\]/g, "").trim().slice(0, MAX_PLACE);
  if (!place) return null;
  const q = encodeURIComponent(place);
  return { embedUrl: `https://maps.google.com/maps?q=${q}&output=embed`, openUrl: `https://www.google.com/maps?q=${q}` };
}

function fromUrl(raw: string): MapLocation | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password) return null;
  if (isShort(url)) return { embedUrl: null, openUrl: `${url.origin}${url.pathname}` };
  if (!isGoogle(url.hostname)) return null;

  // the address from "Share > Embed a map" can be shown as it is, because it is a google.com address
  if (url.pathname.startsWith("/maps/embed")) return { embedUrl: url.toString(), openUrl: url.toString() };

  const full = digits(decode(url.pathname + url.search + url.hash));
  const at = /@(-?\d{1,3}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)/.exec(full);
  if (at) return fromCoordinates(at[1], at[2]);
  const pin = /!3d(-?\d{1,3}(?:\.\d+)?)!4d(-?\d{1,3}(?:\.\d+)?)/.exec(full);
  if (pin) return fromCoordinates(pin[1], pin[2]);
  for (const key of ["q", "ll", "query"]) {
    const value = digits(url.searchParams.get(key) ?? "");
    const pair = /^\s*(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/.exec(value);
    if (pair) return fromCoordinates(pair[1], pair[2]);
  }
  const place = /\/maps\/place\/([^/@]+)/.exec(url.pathname)?.[1];
  if (place) {
    try {
      return fromPlace(decodeURIComponent(place.replace(/\+/g, " ")));
    } catch {
      return null; // a broken %-sequence in the place name
    }
  }
  const q = url.searchParams.get("q") ?? url.searchParams.get("query");
  return q ? fromPlace(q) : null;
}

// What the owner pasted: coordinates, a Google Maps address, the "Embed a map" code, or a short Google link.
// Returns null for anything else (other sites, scripts, impossible numbers, very long text).
export function parseMapLocation(input: string): MapLocation | null {
  const text = input.trim();
  if (!text || text.length > MAX_INPUT) return null;

  const iframe = /<iframe[^>]*\ssrc=["']([^"']+)["']/i.exec(text);
  if (iframe) return fromUrl(iframe[1].trim());
  if (/[<>]/.test(text)) return null;

  const coords = /^\s*(-?[\d٠-٩۰-۹]{1,3}(?:[.٫][\d٠-٩۰-۹]+)?)\s*(?:[,،]|\s)\s*(-?[\d٠-٩۰-۹]{1,3}(?:[.٫][\d٠-٩۰-۹]+)?)\s*$/.exec(text);
  if (coords) return fromCoordinates(digits(coords[1]), digits(coords[2]));
  return fromUrl(text);
}
