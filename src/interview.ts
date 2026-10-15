// Interview script: the fixed order of questions that fills every line of the
// PDF. All legal wording and date math stay in notice-types — this file only
// decides what to ask and how to store answers. Free-text answers are turned
// into structured values (by a person, a form, or an AI model) before they
// reach `apply`; nothing here calls an AI. Not legal advice.

import {
  GOOD_CAUSE_EXEMPTIONS,
  PROPERTY_SIDES,
  emptyForm,
  money,
  requiredTerminationDays,
  earliestMoveOutDate,
  formatLongDate,
  stripUnitLabel,
  type NoticeFormData,
  type NoticeType,
  type PropertySide,
} from "./notice-types";

export interface InterviewState {
  noticeType: NoticeType;
  form: NoticeFormData;
  guestEmail: string;
}

export function emptyInterviewState(): InterviewState {
  return { noticeType: "nonpayment", form: emptyForm(), guestEmail: "" };
}

export type StepKind =
  | "choice"
  | "text"
  | "date"
  | "money"
  | "address"
  | "premises"
  | "tenants"
  | "periods";

export interface ParsedAnswer {
  ok: boolean;
  message: string | null;
  text: string | null;
  date: string | null;
  amount: string | null;
  choice: string | null;
  address: { street: string; city: string; state: string; zip: string } | null;
  premises: { street: string; unit: string; city: string; county: string; zip: string } | null;
  names: string[] | null;
  periods: { period: string; amount: string }[] | null;
}

export function blankParsed(): ParsedAnswer {
  return {
    ok: true,
    message: null,
    text: null,
    date: null,
    amount: null,
    choice: null,
    address: null,
    premises: null,
    names: null,
    periods: null,
  };
}

export interface FallbackField {
  key: string;
  label: string;
  type?: "text" | "date";
  placeholder?: string;
}

export interface InterviewStep {
  id: string;
  section: string;
  kind: StepKind;
  /** Question asked in the chat. */
  question: (s: InterviewState) => string;
  hint?: (s: InterviewState) => string;
  choices?: { value: string; label: string }[];
  optional?: boolean;
  /** Composite answers get an explicit "looks right?" confirmation. */
  confirm?: boolean;
  placeholder?: string;
  fallbackFields: FallbackField[];
  apply: (s: InterviewState, a: ParsedAnswer) => InterviewState;
  fromFallback: (values: Record<string, string>) => ParsedAnswer;
  summary: (s: InterviewState) => string;
  filled: (s: InterviewState) => boolean;
  /** Hide this step when an earlier answer makes it irrelevant. */
  skipIf?: (s: InterviewState) => boolean;
}

const withForm = (s: InterviewState, patch: Partial<NoticeFormData>): InterviewState => ({
  ...s,
  form: { ...s.form, ...patch },
});

const t = (v: string | null | undefined) => (v ?? "").trim();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

/** A valid, deliverable-looking email address. */
export const isEmail = (v: string | null | undefined) => {
  const value = (v ?? "").trim();
  return value.length > 0 && value.length <= 254 && EMAIL_RE.test(value);
};

const ALL_STEPS: (InterviewStep & { appliesTo?: NoticeType; guestOnly?: boolean })[] = [
  {
    id: "noticeType",
    section: "Notice",
    kind: "choice",
    question: () => "Which notice do you need today?",
    hint: () =>
      "Pick the rent demand if the tenant owes money, or the termination notice if you are ending the tenancy.",
    choices: [
      { value: "nonpayment", label: "14-day rent demand (with 5-day late notice)" },
      { value: "termination", label: "30 / 60 / 90-day termination" },
    ],
    fallbackFields: [{ key: "choice", label: "Notice type (nonpayment or termination)" }],
    apply: (s, a) => ({
      ...s,
      noticeType: a.choice === "termination" ? "termination" : "nonpayment",
    }),
    fromFallback: (v) => ({ ...blankParsed(), choice: t(v["choice"]) }),
    summary: (s) =>
      s.noticeType === "termination" ? "30 / 60 / 90-day termination" : "14-day rent demand",
    filled: () => true,
  },
  {
    id: "landlordRole",
    section: "Landlord",
    kind: "choice",
    question: () => "Are you signing as the owner, or as the managing agent for the owner?",
    choices: [
      { value: "owner", label: "Landlord / owner" },
      { value: "agent", label: "Agent for the owner" },
    ],
    fallbackFields: [{ key: "choice", label: "owner or agent" }],
    apply: (s, a) => withForm(s, { landlordRole: a.choice === "agent" ? "agent" : "owner" }),
    fromFallback: (v) => ({ ...blankParsed(), choice: t(v["choice"]) }),
    summary: (s) => (s.form.landlordRole === "agent" ? "Agent for the owner" : "Owner"),
    filled: () => true,
  },
  {
    id: "landlordName",
    section: "Landlord",
    kind: "text",
    question: () => "What name should appear on the notice as the person serving it?",
    placeholder: "Maria Alvarez",
    fallbackFields: [{ key: "text", label: "Full name" }],
    apply: (s, a) => withForm(s, { landlordName: t(a.text) }),
    fromFallback: (v) => ({ ...blankParsed(), text: t(v["text"]) }),
    summary: (s) => s.form.landlordName,
    filled: (s) => Boolean(s.form.landlordName.trim()),
  },
  {
    id: "landlordAddress",
    section: "Landlord",
    kind: "address",
    confirm: true,
    question: () =>
      "What mailing address should the tenant use to reach you? Street, city and ZIP is enough.",
    placeholder: "12 Market St, Kingston NY 12401",
    fallbackFields: [
      { key: "street", label: "Street" },
      { key: "city", label: "City" },
      { key: "state", label: "State", placeholder: "NY" },
      { key: "zip", label: "ZIP" },
    ],
    apply: (s, a) =>
      withForm(s, {
        landlordStreet: t(a.address?.street),
        landlordCity: t(a.address?.city),
        landlordState: t(a.address?.state) || "NY",
        landlordZip: t(a.address?.zip),
      }),
    fromFallback: (v) => ({
      ...blankParsed(),
      address: {
        street: t(v["street"]),
        city: t(v["city"]),
        state: t(v["state"]) || "NY",
        zip: t(v["zip"]),
      },
    }),
    summary: (s) =>
      [s.form.landlordStreet, s.form.landlordCity, `${s.form.landlordState} ${s.form.landlordZip}`]
        .filter((p) => p.trim())
        .join(", "),
    filled: (s) =>
      Boolean(s.form.landlordStreet.trim() && s.form.landlordCity.trim() && s.form.landlordZip.trim()),
  },
  {
    id: "landlordContact",
    section: "Landlord",
    kind: "text",
    question: () =>
      "What phone number and email should the tenant use to arrange payment? Both are required.",
    placeholder: "(845) 555-0142, maria@example.com",
    fallbackFields: [
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
    ],
    apply: (s, a) => {
      const raw = t(a.text);
      const email = raw.match(/[\w.+-]+@[\w-]+\.[\w.]+/)?.[0] ?? "";
      // Whatever is left is the phone. Strip separators from both ends so
      // "maria@example.com, 845-555-0100" does not leave a leading comma.
      const phone = raw.replace(email, "").replace(/^[\s,;]+|[\s,;]+$/g, "");
      return withForm(s, { landlordPhone: phone, landlordEmail: email });
    },
    fromFallback: (v) => ({
      ...blankParsed(),
      text: [t(v["phone"]), t(v["email"])].filter(Boolean).join(", "),
    }),
    summary: (s) => [s.form.landlordPhone, s.form.landlordEmail].filter(Boolean).join(" · "),
    filled: (s) => Boolean(s.form.landlordPhone.trim() && s.form.landlordEmail.trim()),
  },
  {
    id: "tenantNames",
    section: "Tenants",
    kind: "tenants",
    confirm: true,
    question: () => "Who are the tenants named on the lease? List everyone.",
    placeholder: "Jordan Ellis and Sam Ellis",
    fallbackFields: [
      { key: "n1", label: "Tenant 1" },
      { key: "n2", label: "Tenant 2 (optional)" },
      { key: "n3", label: "Tenant 3 (optional)" },
    ],
    apply: (s, a) => {
      const names = (a.names ?? []).map((n) => n.trim()).filter(Boolean);
      return withForm(s, { tenantNames: names.length ? names : [""] });
    },
    fromFallback: (v) => ({
      ...blankParsed(),
      names: [t(v["n1"]), t(v["n2"]), t(v["n3"])].filter(Boolean),
    }),
    summary: (s) => s.form.tenantNames.filter((n) => n.trim()).join(", "),
    filled: (s) => s.form.tenantNames.some((n) => n.trim()),
  },
  {
    id: "premises",
    section: "Premises",
    kind: "premises",
    confirm: true,
    question: () => "What is the full address of the rented unit, including apartment number?",
    placeholder: "44 Chestnut St Apt 2B, New Paltz NY 12561, Ulster County",
    fallbackFields: [
      { key: "street", label: "Street" },
      { key: "unit", label: "Unit / apt (optional)" },
      { key: "city", label: "City / town" },
      { key: "county", label: "County" },
      { key: "zip", label: "ZIP" },
    ],
    apply: (s, a) =>
      withForm(s, {
        premisesStreet: t(a.premises?.street),
        premisesUnit: stripUnitLabel(t(a.premises?.unit)),
        premisesCity: t(a.premises?.city),
        premisesCounty: t(a.premises?.county),
        premisesZip: t(a.premises?.zip),
      }),
    fromFallback: (v) => ({
      ...blankParsed(),
      premises: {
        street: t(v["street"]),
        unit: stripUnitLabel(t(v["unit"])),
        city: t(v["city"]),
        county: t(v["county"]),
        zip: t(v["zip"]),
      },
    }),
    summary: (s) =>
      [
        s.form.premisesStreet + (s.form.premisesUnit ? ` Unit ${s.form.premisesUnit}` : ""),
        s.form.premisesCity,
        `NY ${s.form.premisesZip}`,
      ]
        .filter((p) => p.trim())
        .join(", "),
    filled: (s) =>
      Boolean(s.form.premisesStreet.trim() && s.form.premisesCity.trim() && s.form.premisesZip.trim()),
  },
  {
    id: "premisesRooms",
    section: "Premises",
    kind: "text",
    question: () =>
      "The court form asks for a short description of the unit: how many rooms does it have, and what floor is it on?",
    placeholder: "3 rooms on the 2nd floor",
    fallbackFields: [
      { key: "rooms", label: "Number of rooms" },
      { key: "floors", label: "Floor(s)" },
    ],
    apply: (s, a) => {
      const raw = t(a.text);
      const rooms = raw.match(/(\d+)\s*(?:bed)?rooms?/i)?.[1] ?? raw.match(/^\s*(\d+)\b/)?.[1] ?? "";
      const floors =
        raw.match(/(\d+(?:st|nd|rd|th)?)\s*floor/i)?.[1] ??
        (/\bbasement\b/i.test(raw) ? "Basement" : "");
      return withForm(s, { premisesRooms: rooms, premisesFloors: floors });
    },
    fromFallback: (v) => ({
      ...blankParsed(),
      text: `${t(v["rooms"])} rooms on the ${t(v["floors"])} floor`,
    }),
    summary: (s) =>
      [s.form.premisesRooms && `${s.form.premisesRooms} rooms`, s.form.premisesFloors && `floor ${s.form.premisesFloors}`]
        .filter(Boolean)
        .join(", "),
    filled: (s) => Boolean(s.form.premisesRooms.trim()),
  },
  {
    id: "premisesSides",
    section: "Premises",
    kind: "text",
    optional: true,
    question: () =>
      "Which side of the building is the unit on? You can say more than one — left, right, front, back or middle.",
    placeholder: "front and right",
    fallbackFields: [{ key: "text", label: "Side(s)" }],
    apply: (s, a) => {
      const raw = t(a.text).toLowerCase();
      const sides = PROPERTY_SIDES.filter((side) => raw.includes(side)) as PropertySide[];
      if (raw.includes("rear") && !sides.includes("back")) sides.push("back");
      return withForm(s, { premisesSides: sides });
    },
    fromFallback: (v) => ({ ...blankParsed(), text: t(v["text"]) }),
    summary: (s) => s.form.premisesSides.join(", "),
    filled: () => true,
  },
  {
    id: "propertyUse",
    section: "Premises",
    kind: "choice",
    question: () => "Is the property used as a residence or a business?",
    choices: [
      { value: "residence", label: "Residence" },
      { value: "business", label: "Business" },
    ],
    fallbackFields: [{ key: "choice", label: "residence or business" }],
    apply: (s, a) =>
      withForm(s, { propertyUse: a.choice === "business" ? "business" : "residence" }),
    fromFallback: (v) => ({ ...blankParsed(), choice: t(v["choice"]) }),
    summary: (s) => (s.form.propertyUse === "business" ? "Business" : "Residence"),
    filled: () => true,
  },
  {
    id: "monthlyRent",
    section: "Rent owed",
    appliesTo: "nonpayment",
    kind: "money",
    question: () => "What is the monthly rent for this unit?",
    placeholder: "1800",
    fallbackFields: [{ key: "amount", label: "Monthly rent" }],
    apply: (s, a) => withForm(s, { monthlyRent: t(a.amount) }),
    fromFallback: (v) => ({ ...blankParsed(), amount: t(v["amount"]) }),
    summary: (s) => (s.form.monthlyRent ? money(s.form.monthlyRent) : ""),
    filled: (s) => Boolean(s.form.monthlyRent.trim()),
  },
  {
    id: "rentDueDay",
    section: "Rent owed",
    appliesTo: "nonpayment",
    kind: "text",
    question: () => "Under the lease, by what day of each month is rent due?",
    placeholder: "the 1st",
    fallbackFields: [{ key: "text", label: "Day rent is due" }],
    apply: (s, a) => {
      const n = t(a.text).match(/\d+/)?.[0];
      const suffix = (d: number) =>
        d % 10 === 1 && d !== 11 ? "st" : d % 10 === 2 && d !== 12 ? "nd" : d % 10 === 3 && d !== 13 ? "rd" : "th";
      return withForm(s, { rentDueDay: n ? `${n}${suffix(Number(n))}` : t(a.text) });
    },
    fromFallback: (v) => ({ ...blankParsed(), text: t(v["text"]) }),
    summary: (s) => s.form.rentDueDay,
    filled: (s) => Boolean(s.form.rentDueDay.trim()),
  },
  {
    id: "rentPeriods",
    section: "Rent owed",
    appliesTo: "nonpayment",
    kind: "periods",
    confirm: true,
    question: () =>
      "Which rental periods are unpaid, and how much is owed for each? Courts expect this itemized.",
    placeholder: "March and April 2026 at 1,800 each",
    fallbackFields: [
      { key: "p1", label: "Period 1" },
      { key: "a1", label: "Amount 1" },
      { key: "p2", label: "Period 2 (optional)" },
      { key: "a2", label: "Amount 2 (optional)" },
      { key: "p3", label: "Period 3 (optional)" },
      { key: "a3", label: "Amount 3 (optional)" },
    ],
    apply: (s, a) => {
      const periods = (a.periods ?? [])
        .map((p) => ({ period: t(p.period), amount: t(p.amount) }))
        .filter((p) => p.period || p.amount);
      return withForm(s, { rentPeriods: periods.length ? periods : [{ period: "", amount: "" }] });
    },
    fromFallback: (v) => ({
      ...blankParsed(),
      periods: [
        { period: t(v["p1"]), amount: t(v["a1"]) },
        { period: t(v["p2"]), amount: t(v["a2"]) },
        { period: t(v["p3"]), amount: t(v["a3"]) },
      ].filter((p) => p.period || p.amount),
    }),
    summary: (s) =>
      s.form.rentPeriods
        .filter((p) => p.period || p.amount)
        .map((p) => `${p.period} ${money(p.amount)}`)
        .join(" · "),
    filled: (s) => s.form.rentPeriods.some((p) => p.amount.trim()),
  },
  {
    id: "goodCauseCovered",
    section: "Good Cause",
    appliesTo: "nonpayment",
    kind: "choice",
    question: () =>
      "The rent demand must have the Good Cause Eviction Law notice attached. Is this unit covered by the Good Cause Eviction Law (Article 6-A)?",
    hint: () =>
      "Most small landlords outside New York City are exempt — for example if you own 10 units or fewer, or the town has not adopted good cause.",
    choices: [
      { value: "no", label: "No — the unit is exempt" },
      { value: "yes", label: "Yes — the unit is covered" },
    ],
    fallbackFields: [{ key: "choice", label: "yes or no" }],
    apply: (s, a) => withForm(s, { goodCauseCovered: a.choice === "yes" ? "yes" : "no" }),
    fromFallback: (v) => ({ ...blankParsed(), choice: t(v["choice"]) }),
    summary: (s) => (s.form.goodCauseCovered === "yes" ? "Covered" : "Exempt"),
    filled: () => true,
  },
  {
    id: "goodCauseExemption",
    section: "Good Cause",
    appliesTo: "nonpayment",
    kind: "choice",
    question: () => "Which exemption applies? I'll check that box on the attached notice.",
    choices: GOOD_CAUSE_EXEMPTIONS.map((e) => ({ value: e.code, label: `${e.code}. ${e.short}` })),
    fallbackFields: [{ key: "choice", label: "Exemption letter (A-N)" }],
    apply: (s, a) => {
      const code = t(a.choice).toUpperCase().slice(0, 1);
      const match = GOOD_CAUSE_EXEMPTIONS.find((e) => e.code === code);
      return withForm(s, { goodCauseExemption: match?.code ?? s.form.goodCauseExemption });
    },
    fromFallback: (v) => ({ ...blankParsed(), choice: t(v["choice"]) }),
    summary: (s) => {
      const e = GOOD_CAUSE_EXEMPTIONS.find((x) => x.code === s.form.goodCauseExemption);
      return e ? `${e.code}. ${e.short}` : "";
    },
    filled: () => true,
    skipIf: (s) => s.form.goodCauseCovered === "yes",
  },
  {
    id: "tenancyStartDate",
    section: "Tenancy",
    appliesTo: "termination",
    kind: "date",
    question: () =>
      "When did the tenant move in or first take occupancy? This sets whether 30, 60 or 90 days' notice is required.",
    placeholder: "June 2023",
    fallbackFields: [{ key: "date", label: "Tenancy start date", type: "date" }],
    apply: (s, a) => withForm(s, { tenancyStartDate: t(a.date) }),
    fromFallback: (v) => ({ ...blankParsed(), date: t(v["date"]) }),
    summary: (s) => s.form.tenancyStartDate,
    filled: (s) => Boolean(s.form.tenancyStartDate),
  },
  {
    id: "terminationReason",
    section: "Tenancy",
    appliesTo: "termination",
    kind: "choice",
    question: () => "Why can't the tenant stay? The court form has three boxes.",
    choices: [
      { value: "landlord_ending", label: "The landlord is ending the lease or rental agreement" },
      { value: "lease_expired", label: "The written lease expired" },
      { value: "agreement_expired", label: "The verbal/written rental agreement expired" },
    ],
    fallbackFields: [{ key: "choice", label: "landlord_ending, lease_expired or agreement_expired" }],
    apply: (s, a) => {
      const c = t(a.choice);
      const basis =
        c === "lease_expired" || c === "agreement_expired" ? c : "landlord_ending";
      return withForm(s, { terminationBasis: basis });
    },
    fromFallback: (v) => ({ ...blankParsed(), choice: t(v["choice"]) }),
    summary: (s) =>
      s.form.terminationBasis === "lease_expired"
        ? "Lease expired"
        : s.form.terminationBasis === "agreement_expired"
          ? "Rental agreement expired"
          : "Landlord is ending the tenancy",
    filled: () => true,
  },
  {
    id: "terminationExpirationDate",
    section: "Tenancy",
    appliesTo: "termination",
    kind: "date",
    question: () => "What date did it expire?",
    placeholder: "May 31 2026",
    fallbackFields: [{ key: "date", label: "Expiration date", type: "date" }],
    apply: (s, a) => withForm(s, { terminationExpirationDate: t(a.date) }),
    fromFallback: (v) => ({ ...blankParsed(), date: t(v["date"]) }),
    summary: (s) => s.form.terminationExpirationDate,
    filled: (s) => Boolean(s.form.terminationExpirationDate),
    skipIf: (s) => s.form.terminationBasis === "landlord_ending",
  },
  {
    id: "noticeDate",
    section: "Dates",
    kind: "date",
    question: () => "What date will you sign and serve this notice? Today is fine.",
    placeholder: "today",
    fallbackFields: [{ key: "date", label: "Date of notice", type: "date" }],
    apply: (s, a) => {
      const next = withForm(s, { noticeDate: t(a.date) });
      if (next.noticeType !== "termination") return next;
      return withForm(next, { moveOutDate: earliestMoveOutDate(next.form) });
    },
    fromFallback: (v) => ({ ...blankParsed(), date: t(v["date"]) }),
    summary: (s) =>
      s.noticeType === "termination" && s.form.noticeDate
        ? `${s.form.noticeDate} — ${requiredTerminationDays(s.form)}-day notice, tenant must move out by ${formatLongDate(earliestMoveOutDate(s.form))}`
        : s.form.noticeDate,
    filled: (s) => Boolean(s.form.noticeDate),
  },
  {
    id: "guestEmail",
    section: "Email",
    guestOnly: true,
    // The landlord email asked earlier doubles as the download-link address.
    skipIf: (s) => isEmail(s.form.landlordEmail),
    kind: "text",
    question: () => "Last one — where should I email your download link?",
    hint: () => "A valid email is required so we can send you the download link.",
    placeholder: "you@example.com",
    fallbackFields: [{ key: "text", label: "Email" }],
    apply: (s, a) => ({ ...s, guestEmail: t(a.text) }),
    fromFallback: (v) => ({ ...blankParsed(), text: t(v["text"]) }),
    summary: (s) => s.guestEmail,
    filled: (s) => isEmail(s.guestEmail),
  },
];

export function stepsFor(state: InterviewState, signedIn: boolean): InterviewStep[] {
  return ALL_STEPS.filter(
    (s) =>
      (!s.appliesTo || s.appliesTo === state.noticeType) &&
      (!s.guestOnly || !signedIn) &&
      !(s.skipIf?.(state) ?? false),
  );
}

export const INTERVIEW_SECTIONS = [
  "Notice",
  "Landlord",
  "Tenants",
  "Premises",
  "Rent owed",
  "Good Cause",
  "Tenancy",
  "Dates",
  "Email",
];
