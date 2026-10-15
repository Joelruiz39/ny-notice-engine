// Rule for deciding whether a New York address sits inside the five boroughs.
// Every form, deadline rule, and Good Cause exemption in this engine is
// written for New York State *outside* New York City — NYC cases go to Housing
// Court and use a different form set — so an NYC address must be caught before
// a notice is generated.

export type NycStatus = "nyc" | "outside" | "unknown";

/** The five counties that make up New York City. */
const NYC_COUNTIES = new Set(["bronx", "kings", "new york", "queens", "richmond"]);

/**
 * USPS city names that only exist inside the five boroughs. Queens mail is
 * addressed by neighborhood rather than "Queens", so every post-office name is
 * listed. Ambiguous names shared with upstate towns (e.g. "Greenwich") are
 * deliberately excluded — ZIP and county carry those cases.
 */
const NYC_CITIES = new Set([
  "new york", "new york city", "nyc", "manhattan",
  "bronx", "the bronx",
  "brooklyn",
  "staten island",
  "queens",
  "astoria", "long island city", "sunnyside", "woodside", "jackson heights",
  "elmhurst", "corona", "east elmhurst", "forest hills", "rego park",
  "flushing", "fresh meadows", "whitestone", "college point", "bayside",
  "little neck", "douglaston", "floral park queens", "glen oaks", "bellerose",
  "kew gardens", "richmond hill", "jamaica", "south richmond hill",
  "ozone park", "howard beach", "woodhaven", "ridgewood", "middle village",
  "maspeth", "glendale", "saint albans", "st albans", "springfield gardens",
  "cambria heights", "rosedale", "laurelton", "queens village", "hollis",
  "far rockaway", "arverne", "rockaway park", "rockaway beach", "breezy point",
  "oakland gardens", "flushing meadows", "jamaica estates", "briarwood",
  "sunnyside gardens", "east flushing",
]);

/**
 * Whole three-digit ZIP prefixes that lie entirely inside the city:
 * 100xx-102xx Manhattan, 103xx Staten Island, 104xx Bronx, 111xx/113xx/114xx/116xx
 * Queens, 112xx Brooklyn. The 110xx band is intentionally absent — it is mostly
 * Nassau County (Floral Park, Elmont, Franklin Square), so those ZIPs are listed
 * one by one below.
 */
const NYC_ZIP_PREFIXES = new Set([
  "100", "101", "102", "103", "104",
  "111", "112", "113", "114", "116",
]);

/** The only 110xx ZIPs inside Queens; everything else in that band is Nassau. */
const NYC_110_ZIPS = new Set(["11004", "11005"]);

const clean = (v: string | null | undefined) =>
  (v ?? "").toString().trim().toLowerCase().replace(/\s+/g, " ").replace(/[.,]/g, "");

/** Strips a trailing "county" so "Kings County" and "Kings" both match. */
const countyKey = (v: string | null | undefined) =>
  clean(v).replace(/\s+co(?:unty)?$/, "");

export function zipStatus(zip: string | null | undefined): NycStatus {
  const digits = (zip ?? "").replace(/\D/g, "").slice(0, 5);
  if (digits.length !== 5) return "unknown";
  if (NYC_110_ZIPS.has(digits)) return "nyc";
  if (digits.startsWith("110")) return "outside";
  if (NYC_ZIP_PREFIXES.has(digits.slice(0, 3))) return "nyc";
  return "outside";
}

/**
 * Decides whether an address is inside New York City. Any single strong signal
 * (county, city, or ZIP) is enough to flag it; "unknown" is returned only when
 * nothing usable was provided, and "unknown" never blocks a user.
 */
export function nycStatus(input: {
  city?: string | null;
  county?: string | null;
  zip?: string | null;
}): NycStatus {
  // ZIP is the strongest signal and the one USPS normalizes, so a valid ZIP
  // outside the boroughs settles it. This also keeps a landlord in Utica who
  // wrote "New York" in the county field from being flagged.
  const byZip = zipStatus(input.zip);
  if (byZip !== "unknown") return byZip;

  const county = countyKey(input.county);
  if (county && NYC_COUNTIES.has(county)) return "nyc";

  const city = clean(input.city);
  if (city && NYC_CITIES.has(city)) return "nyc";

  if (county || city) return "outside";
  return "unknown";
}

export const isNycAddress = (input: {
  city?: string | null;
  county?: string | null;
  zip?: string | null;
}) => nycStatus(input) === "nyc";
