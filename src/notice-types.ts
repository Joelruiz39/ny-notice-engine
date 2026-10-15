// Shared types + date logic for New York (outside NYC) landlord notices.
// Not legal advice. See README.md.

export type NoticeType = "nonpayment" | "termination";

export type PropertySide = "left" | "right" | "front" | "back" | "middle";

export type TerminationBasis = "lease_expired" | "agreement_expired" | "landlord_ending";

export interface RentPeriod {
  period: string;
  amount: string;
}

export interface NoticeFormData {
  landlordName: string;
  landlordRole: "owner" | "agent";
  landlordStreet: string;
  landlordCity: string;
  landlordState: string;
  landlordZip: string;
  landlordPhone: string;
  landlordEmail: string;

  tenantNames: string[];

  premisesStreet: string;
  premisesUnit: string;
  premisesCity: string;
  premisesCounty: string;
  premisesZip: string;
  premisesRooms: string;
  premisesFloors: string;
  premisesSides: PropertySide[];
  propertyUse: "residence" | "business";

  monthlyRent: string;
  rentPeriods: RentPeriod[];
  includeFiveDay: boolean;
  rentDueDay: string;

  tenancyStartDate: string;
  terminationDaysOverride: "" | "30" | "60" | "90";
  terminationReason: string;
  terminationBasis: TerminationBasis;
  terminationExpirationDate: string;
  moveOutDate: string;

  goodCauseCovered: "yes" | "no";
  goodCauseExemption: string;

  noticeDate: string;
  serviceMethod: string;

  /** Landlord signature captured in the app: PNG data URL from the pad. */
  signatureDataUrl: string;
  /** Typed signature fallback (rendered in a script-like italic face). */
  signatureTypedName: string;
}

export const PROPERTY_SIDES: PropertySide[] = ["left", "right", "front", "back", "middle"];

/** Good Cause Eviction Law exemptions, lettered exactly as on the UCS form. */
export const GOOD_CAUSE_EXEMPTIONS: { code: string; short: string; text: string }[] = [
  {
    code: "A",
    short: "The village, town or city has not adopted good cause eviction",
    text: "Village/Town/City outside of New York City has not adopted good cause eviction under section 213 of the Real Property Law;",
  },
  {
    code: "B",
    short: "Small landlord (10 units or fewer)",
    text: 'Unit is owned by a "small landlord," as defined in subdivision 3 of section 211 of the Real Property Law, who owns no more than 10 units, or the number of units established as the maximum amount a "small landlord" can own by local law, as applicable. In connection with any eviction proceeding in which the landlord claims an exemption on the basis of being a small landlord, the landlord shall provide to the tenant the name of each natural person who owns or is a beneficial owner of the housing accommodation at issue, the number of units owned by each such natural person owner, and the addresses of any such units, excluding each natural person owner\'s principal residence (exemption under subdivision 1 of section 214 of the Real Property Law);',
  },
  {
    code: "C",
    short: "Owner-occupied building with 10 units or fewer",
    text: "Unit is located in an owner-occupied housing accommodation with no more than 10 units (exemption under subdivision 2 of section 214 of the Real Property Law);",
  },
  {
    code: "D",
    short: "Unit is already rent regulated",
    text: "Unit is subject to regulation of rents or evictions pursuant to local, state, or federal law (exemption under subdivision 5 of section 214 of the Real Property Law);",
  },
  {
    code: "E",
    short: "Income-restricted affordable unit",
    text: "Unit must be affordable to tenants at a specific income level pursuant to statute, regulation, restrictive declaration, or pursuant to a regulatory agreement with a local, state, or federal government entity (exemption under subdivision 6 of section 214 of the Real Property Law);",
  },
  {
    code: "F",
    short: "Condominium or cooperative unit",
    text: "Unit is on or within a housing accommodation owned as a condominium or cooperative, or unit is on or within a housing accommodation subject to an offering plan submitted to the office of the attorney general (exemption under subdivision 7 of section 214 of the Real Property Law);",
  },
  {
    code: "G",
    short: "New construction (certificate of occupancy within 30 years)",
    text: "Unit is in a housing accommodation that was issued a temporary or permanent certificate of occupancy within the past 30 years (only if building received the certificate on or after January 1st, 2009) (exemption under subdivision 8 of section 214 of the Real Property Law);",
  },
  {
    code: "H",
    short: "Seasonal use dwelling",
    text: "Unit is a seasonal use dwelling unit under subdivisions 4 and 5 of section 7-108 of the General Obligations Law (exemption under subdivision 9 of section 214 of the Real Property Law);",
  },
  {
    code: "I",
    short: "Hospital, care facility or senior residence",
    text: "Unit is in a hospital as defined in subdivision 1 of section 2801 of the Public Health Law, continuing care retirement community, assisted living residence, adult care facility, senior residential community that has submitted an offering plan to the attorney general, or not-for-profit independent retirement community that offers personal emergency response, housekeeping, transportation and meals to their residents (exemption under subdivision 10 of section 214 of the Real Property Law);",
  },
  {
    code: "J",
    short: "Manufactured home in a manufactured home park",
    text: "Unit is a manufactured home located on or in a manufactured home park as defined in section 233 of the Real Property Law (exemption under subdivision 11 of section 214 of the Real Property Law);",
  },
  {
    code: "K",
    short: "Hotel room or other transient use",
    text: "Unit is a hotel room or other transient use covered by the definition of a class B multiple dwelling under subdivision 9 of section 4 of the Multiple Dwelling Law (exemption under subdivision 12 of section 214 of the Real Property Law);",
  },
  {
    code: "L",
    short: "Dormitory",
    text: "Unit is a dormitory owned and operated by an institution of higher education or a school (exemption under subdivision 13 of section 214 of the Real Property Law);",
  },
  {
    code: "M",
    short: "Religious facility housing",
    text: "Unit is within and for use by a religious facility or institution (exemption under subdivision 14 of section 214 of the Real Property Law);",
  },
  {
    code: "N",
    short: "Rent above 245% of fair market rent",
    text: "Unit has a monthly rent that is greater than the percent of fair market rent established in a local law of a village, town, or city, other than New York City, adopting the provisions of Article 6-A of the Real Property Law, or 245 percent of the fair market rent, as applicable. Fair market rent refers to the figure published by the United States Department of Housing and Urban Development, for the county in which the housing accommodation is located, as shall be published by the Division of Housing and Community Renewal no later than August 1st in any given year (exemption under subdivision 15 of section 214 of the Real Property Law);",
  },
];

export const SERVICE_METHODS = [
  "Personal delivery to the tenant",
  "Substituted service on a person of suitable age and discretion, plus mailing",
  "Conspicuous place (affix) service, plus mailing",
  "Certified mail, return receipt requested",
  "First class mail with certificate of mailing",
];

export const NOTICE_LABELS: Record<NoticeType, string> = {
  nonpayment: "14-Day Rent Demand (with 5-Day Late Notice)",
  termination: "30 / 60 / 90-Day Notice of Termination",
};

export function emptyForm(): NoticeFormData {
  const today = new Date().toISOString().slice(0, 10);
  return {
    landlordName: "",
    landlordRole: "owner",
    landlordStreet: "",
    landlordCity: "",
    landlordState: "NY",
    landlordZip: "",
    landlordPhone: "",
    landlordEmail: "",
    tenantNames: [""],
    premisesStreet: "",
    premisesUnit: "",
    premisesCity: "",
    premisesCounty: "",
    premisesZip: "",
    premisesRooms: "",
    premisesFloors: "",
    premisesSides: [],
    propertyUse: "residence",
    monthlyRent: "",
    rentPeriods: [{ period: "", amount: "" }],
    includeFiveDay: true,
    rentDueDay: "1st",
    tenancyStartDate: "",
    terminationDaysOverride: "",
    terminationReason: "",
    terminationBasis: "landlord_ending",
    terminationExpirationDate: "",
    moveOutDate: "",
    goodCauseCovered: "no",
    goodCauseExemption: "B",
    noticeDate: today,
    serviceMethod: SERVICE_METHODS[0]!,
    signatureDataUrl: "",
    signatureTypedName: "",
  };
}

export function parseDate(value: string): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDays(value: string, days: number): string {
  const date = parseDate(value);
  if (!date) return "";
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function formatLongDate(value: string): string {
  const date = parseDate(value);
  if (!date) return "____________________";
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function money(value: string | number): string {
  const n = typeof value === "number" ? value : Number(String(value).replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(n)) return "$0.00";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

/** MM/DD/YYYY, the format the Unified Court System forms use. */
export function formatShortDate(value: string): string {
  const date = parseDate(value);
  if (!date) return "_____________";
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${mm}/${dd}/${date.getUTCFullYear()}`;
}

export function totalOwed(periods: RentPeriod[]): number {
  return periods.reduce((sum, p) => {
    const n = Number(String(p.amount).replace(/[^0-9.-]/g, ""));
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);
}

/**
 * RPL 226-c statutory minimum, measured by calendar anniversaries of the
 * occupancy start date: under 1 year = 30 days, 1 year but under 2 = 60 days,
 * 2 years or more = 90 days.
 */
export function statutoryTerminationDays(form: NoticeFormData): 30 | 60 | 90 {
  const start = parseDate(form.tenancyStartDate);
  const notice = parseDate(form.noticeDate);
  if (!start || !notice) return 30;
  // UTC throughout: local-time year arithmetic shifts the anniversary by an
  // hour across a daylight-saving change and can flip a notice served exactly
  // on the anniversary into the shorter tier.
  const anniversary = (n: number) => {
    const d = new Date(start.getTime());
    d.setUTCFullYear(d.getUTCFullYear() + n);
    return d;
  };
  if (notice.getTime() >= anniversary(2).getTime()) return 90;
  if (notice.getTime() >= anniversary(1).getTime()) return 60;
  return 30;
}

/** The notice period actually used: statutory minimum, or a longer manual override. */
export function requiredTerminationDays(form: NoticeFormData): 30 | 60 | 90 {
  const statutory = statutoryTerminationDays(form);
  const override = form.terminationDaysOverride ? Number(form.terminationDaysOverride) : 0;
  return (override > statutory ? override : statutory) as 30 | 60 | 90;
}

export function tenancyLengthLabel(form: NoticeFormData): string {
  const start = parseDate(form.tenancyStartDate);
  const notice = parseDate(form.noticeDate);
  if (!start || !notice) return "—";
  const months = Math.max(
    0,
    Math.floor((notice.getTime() - start.getTime()) / (30.44 * 24 * 3600 * 1000)),
  );
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (years === 0) return `${months} month${months === 1 ? "" : "s"}`;
  return `${years} year${years === 1 ? "" : "s"}${rest ? `, ${rest} month${rest === 1 ? "" : "s"}` : ""}`;
}

/**
 * Earliest lawful move-out date. The month the notice is served never counts:
 * counting begins on the first day of the following month, the statutory
 * 30/60/90 days are added, and the date is pushed to the last day of the month
 * that period lands in.
 */
export function earliestMoveOutDate(form: NoticeFormData): string {
  const notice = parseDate(form.noticeDate);
  if (!notice) return "";
  const days = requiredTerminationDays(form);
  const startOfNextMonth = new Date(
    Date.UTC(notice.getUTCFullYear(), notice.getUTCMonth() + 1, 1),
  );
  const landing = new Date(startOfNextMonth.getTime());
  landing.setUTCDate(landing.getUTCDate() + days - 1);
  const endOfMonth = new Date(
    Date.UTC(landing.getUTCFullYear(), landing.getUTCMonth() + 1, 0),
  );
  return endOfMonth.toISOString().slice(0, 10);
}

export function tenantList(names: string[]): string {
  const clean = names.map((n) => n.trim()).filter(Boolean);
  if (clean.length === 0) return "____________________";
  return clean.join(", ");
}

export function premisesLine(form: NoticeFormData): string {
  const unit = form.premisesUnit ? `, Unit ${stripUnitLabel(form.premisesUnit)}` : "";
  const county = form.premisesCounty ? ` (County of ${form.premisesCounty})` : "";
  return `${form.premisesStreet || "____________________"}${unit}, ${form.premisesCity || "__________"}, NY ${form.premisesZip || "_____"}${county}`;
}

/**
 * Strips a leading unit-label word (Unit / Apt / Apartment / Suite / Ste / #)
 * so the stored premises unit is just the bare identifier, e.g. "2" not "Unit 2".
 * Labels are added back by the templates that need them.
 */
export function stripUnitLabel(value: string): string {
  // The label must end at a word boundary (or run straight into a digit, as in
  // "Apt3B"), so a value like "North Wing" or "Steinway Annex" is left intact.
  return value
    .trim()
    .replace(/^(?:(?:unit|apt|apartment|suite|ste|no)(?=\b|\d)\.?\s*|#\s*)/i, "")
    .trim();
}

export function landlordAddressLine(form: NoticeFormData): string {
  return `${form.landlordStreet || "____________________"}, ${form.landlordCity || "__________"}, ${form.landlordState || "NY"} ${form.landlordZip || "_____"}`;
}

export function validateForm(type: NoticeType, form: NoticeFormData): string[] {
  const errors: string[] = [];
  if (!form.landlordName.trim()) errors.push("Landlord or agent name is required.");
  if (!form.landlordStreet.trim()) errors.push("Landlord mailing address is required.");
  if (!form.landlordCity.trim()) errors.push("Landlord city is required.");
  if (!form.landlordZip.trim()) errors.push("Landlord ZIP code is required.");
  if (!form.landlordPhone.trim()) errors.push("Landlord or agent phone number is required.");
  if (!form.landlordEmail.trim()) errors.push("Landlord or agent email is required.");
  if (!form.tenantNames.some((n) => n.trim())) errors.push("At least one tenant name is required.");
  if (!form.premisesStreet.trim()) errors.push("Premises street address is required.");
  if (!form.premisesCity.trim()) errors.push("Premises city is required.");
  if (!form.premisesZip.trim()) errors.push("Premises ZIP code is required.");
  if (!form.noticeDate) errors.push("Notice date is required.");
  if (type === "nonpayment") {
    if (totalOwed(form.rentPeriods) <= 0) {
      errors.push("Enter at least one rental period with an amount owed.");
    }
    if (form.rentPeriods.some((p) => p.amount.trim() && !p.period.trim())) {
      errors.push("Every amount owed needs a rental period label (e.g. March 2026).");
    }
  } else {
    if (!form.tenancyStartDate) errors.push("Tenancy start date is required.");
    if (form.tenancyStartDate && form.noticeDate) {
      const start = parseDate(form.tenancyStartDate);
      const notice = parseDate(form.noticeDate);
      if (start && notice && start.getTime() > notice.getTime()) {
        errors.push("Tenancy start date cannot be after the notice date.");
      }
    }
  }
  return errors;
}
