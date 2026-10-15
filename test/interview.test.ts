import { describe, expect, it } from "vitest";

import {
  INTERVIEW_SECTIONS,
  blankParsed,
  emptyInterviewState,
  isEmail,
  stepsFor,
  type InterviewState,
  type InterviewStep,
  type ParsedAnswer,
} from "../src/interview";
import { SECTIONS_ES, STEPS_ES, localizeStep } from "../src/interview-es";
import { validateForm } from "../src/notice-types";

const step = (state: InterviewState, id: string, signedIn = false): InterviewStep => {
  const found = stepsFor(state, signedIn).find((s) => s.id === id);
  if (!found) throw new Error(`step ${id} is not in the interview for this state`);
  return found;
};

const answer = (state: InterviewState, id: string, patch: Partial<ParsedAnswer>): InterviewState =>
  step(state, id).apply(state, { ...blankParsed(), ...patch });

const ids = (state: InterviewState, signedIn = false) => stepsFor(state, signedIn).map((s) => s.id);

/** Every step that can appear, whatever the answers. */
function allSteps(): InterviewStep[] {
  const base = emptyInterviewState();
  const states: InterviewState[] = [
    base,
    { ...base, form: { ...base.form, goodCauseCovered: "yes" } },
    { ...base, noticeType: "termination", form: { ...base.form, terminationBasis: "lease_expired" } },
    { ...base, noticeType: "termination" },
  ];
  const seen = new Map<string, InterviewStep>();
  for (const s of states) for (const st of stepsFor(s, false)) seen.set(st.id, st);
  return [...seen.values()];
}

describe("which questions are asked", () => {
  it("rent demand: asks about rent, not about the tenancy", () => {
    const list = ids(emptyInterviewState());
    expect(list).toContain("monthlyRent");
    expect(list).toContain("rentPeriods");
    expect(list).toContain("goodCauseCovered");
    expect(list).not.toContain("tenancyStartDate");
  });

  it("termination: asks about the tenancy, not about rent", () => {
    const state = { ...emptyInterviewState(), noticeType: "termination" as const };
    const list = ids(state);
    expect(list).toContain("tenancyStartDate");
    expect(list).toContain("terminationReason");
    expect(list).not.toContain("monthlyRent");
    expect(list).not.toContain("goodCauseCovered");
  });

  it("skips the exemption question when the unit is covered", () => {
    const base = emptyInterviewState();
    expect(ids(base)).toContain("goodCauseExemption");
    expect(ids({ ...base, form: { ...base.form, goodCauseCovered: "yes" } })).not.toContain("goodCauseExemption");
  });

  it("asks for an expiration date only when the lease or agreement expired", () => {
    const base = { ...emptyInterviewState(), noticeType: "termination" as const };
    expect(ids(base)).not.toContain("terminationExpirationDate");
    const expired = { ...base, form: { ...base.form, terminationBasis: "lease_expired" as const } };
    expect(ids(expired)).toContain("terminationExpirationDate");
  });

  it("does not ask for the email twice", () => {
    const base = emptyInterviewState();
    expect(ids(base)).toContain("guestEmail");
    expect(ids({ ...base, form: { ...base.form, landlordEmail: "jane@example.com" } })).not.toContain("guestEmail");
  });

  it("never asks a signed-in user for an email", () => {
    expect(ids(emptyInterviewState(), true)).not.toContain("guestEmail");
  });
});

describe("storing answers", () => {
  it.each([
    ["(845) 555-0142, maria@example.com", "(845) 555-0142", "maria@example.com"],
    ["maria@example.com, 845-555-0100", "845-555-0100", "maria@example.com"],
    ["845-555-0100 maria@example.com", "845-555-0100", "maria@example.com"],
    ["maria@example.com", "", "maria@example.com"],
  ])("contact %s", (raw, phone, email) => {
    const next = answer(emptyInterviewState(), "landlordContact", { text: raw });
    expect(next.form.landlordPhone).toBe(phone);
    expect(next.form.landlordEmail).toBe(email);
  });

  it("needs both a phone and an email before the contact step counts as answered", () => {
    const only = answer(emptyInterviewState(), "landlordContact", { text: "maria@example.com" });
    expect(step(only, "landlordContact").filled(only)).toBe(false);
  });

  it.each([
    ["3 rooms on the 2nd floor", "3", "2nd"],
    ["2 bedrooms, 1st floor", "2", "1st"],
    ["4", "4", ""],
    ["basement studio", "", "Basement"],
  ])("rooms and floor: %s", (raw, rooms, floors) => {
    const next = answer(emptyInterviewState(), "premisesRooms", { text: raw });
    expect(next.form.premisesRooms).toBe(rooms);
    expect(next.form.premisesFloors).toBe(floors);
  });

  it.each([
    ["the 1st", "1st"],
    ["2", "2nd"],
    ["the 3rd", "3rd"],
    ["11", "11th"],
    ["12", "12th"],
    ["13", "13th"],
    ["21", "21st"],
    ["22", "22nd"],
  ])("rent due day: %s -> %s", (raw, expected) => {
    expect(answer(emptyInterviewState(), "rentDueDay", { text: raw }).form.rentDueDay).toBe(expected);
  });

  it("stores only the identifier for a unit", () => {
    const next = answer(emptyInterviewState(), "premises", {
      premises: { street: "44 Chestnut St", unit: "Unit 2", city: "Kingston", county: "Ulster", zip: "12401" },
    });
    expect(next.form.premisesUnit).toBe("2");
  });

  it("understands sides, including 'rear'", () => {
    const next = answer(emptyInterviewState(), "premisesSides", { text: "front and rear, left" });
    expect(next.form.premisesSides.sort()).toEqual(["back", "front", "left"]);
  });

  it("keeps the old exemption when the answer is not a valid letter", () => {
    const next = answer(emptyInterviewState(), "goodCauseExemption", { choice: "Z" });
    expect(next.form.goodCauseExemption).toBe("B");
    expect(answer(emptyInterviewState(), "goodCauseExemption", { choice: "c" }).form.goodCauseExemption).toBe("C");
  });

  it("computes the move-out date as soon as a termination notice is dated", () => {
    let s: InterviewState = { ...emptyInterviewState(), noticeType: "termination" };
    s = answer(s, "tenancyStartDate", { date: "2025-03-10" });
    s = answer(s, "noticeDate", { date: "2026-05-10" });
    expect(s.form.moveOutDate).toBe("2026-07-31");
  });

  it("never reports a step as filled when its required answer is missing", () => {
    const empty = emptyInterviewState();
    for (const id of ["landlordName", "landlordAddress", "tenantNames", "premises", "premisesRooms", "monthlyRent", "rentPeriods"]) {
      expect(step(empty, id).filled(empty), id).toBe(false);
    }
  });
});

describe("isEmail", () => {
  it.each(["jane@example.com", "a.b+c@mail.co.uk"])("accepts %s", (v) => expect(isEmail(v)).toBe(true));
  it.each(["", "jane", "jane@", "jane@example", "jane @example.com", null, undefined])("rejects %s", (v) =>
    expect(isEmail(v as string | null | undefined)).toBe(false),
  );
});

describe("a complete interview produces a valid notice", () => {
  it("rent demand", () => {
    let s = emptyInterviewState();
    s = answer(s, "landlordName", { text: "Jane Landlord" });
    s = answer(s, "landlordAddress", { address: { street: "1 Main St", city: "Kingston", state: "NY", zip: "12401" } });
    s = answer(s, "landlordContact", { text: "845-555-0100, jane@example.com" });
    s = answer(s, "tenantNames", { names: ["Jordan Ellis"] });
    s = answer(s, "premises", {
      premises: { street: "44 Chestnut St", unit: "2", city: "Kingston", county: "Ulster", zip: "12401" },
    });
    s = answer(s, "premisesRooms", { text: "3 rooms on the 2nd floor" });
    s = answer(s, "monthlyRent", { amount: "1800" });
    s = answer(s, "rentDueDay", { text: "the 1st" });
    s = answer(s, "rentPeriods", { periods: [{ period: "March 2026", amount: "1800" }] });
    s = answer(s, "noticeDate", { date: "2026-05-10" });
    expect(validateForm(s.noticeType, s.form)).toEqual([]);
    // Every question left in the interview is answered.
    expect(stepsFor(s, false).filter((st) => !st.filled(s))).toEqual([]);
  });

  it("termination notice", () => {
    let s: InterviewState = { ...emptyInterviewState(), noticeType: "termination" };
    s = answer(s, "landlordName", { text: "Jane Landlord" });
    s = answer(s, "landlordAddress", { address: { street: "1 Main St", city: "Kingston", state: "NY", zip: "12401" } });
    s = answer(s, "landlordContact", { text: "845-555-0100, jane@example.com" });
    s = answer(s, "tenantNames", { names: ["Jordan Ellis"] });
    s = answer(s, "premises", {
      premises: { street: "44 Chestnut St", unit: "", city: "Kingston", county: "Ulster", zip: "12401" },
    });
    s = answer(s, "tenancyStartDate", { date: "2025-03-10" });
    s = answer(s, "noticeDate", { date: "2026-05-10" });
    expect(validateForm(s.noticeType, s.form)).toEqual([]);
  });
});

describe("Spanish overrides", () => {
  const known = new Map(allSteps().map((s) => [s.id, s]));

  it("has no translation for a question that no longer exists", () => {
    const stale = Object.keys(STEPS_ES).filter((id) => !known.has(id));
    expect(stale).toEqual([]);
  });

  it("translates every question", () => {
    const missing = [...known.keys()].filter((id) => !STEPS_ES[id]?.question);
    expect(missing).toEqual([]);
  });

  it("translates every choice and uses real choice values", () => {
    for (const [id, o] of Object.entries(STEPS_ES)) {
      const st = known.get(id);
      if (!st || !o.choices) continue;
      expect(Object.keys(o.choices).sort(), id).toEqual((st.choices ?? []).map((c) => c.value).sort());
    }
  });

  it("uses real field keys for fallback labels", () => {
    for (const [id, o] of Object.entries(STEPS_ES)) {
      const st = known.get(id);
      if (!st || !o.fields) continue;
      const keys = new Set(st.fallbackFields.map((f) => f.key));
      for (const k of Object.keys(o.fields)) expect(keys.has(k), `${id}.${k}`).toBe(true);
    }
  });

  it("covers every section", () => {
    expect(INTERVIEW_SECTIONS.filter((s) => !SECTIONS_ES[s])).toEqual([]);
  });

  it("leaves English untouched and changes the Spanish wording", () => {
    const s = emptyInterviewState();
    const en = step(s, "landlordName");
    expect(localizeStep(en, "en")).toBe(en);
    expect(localizeStep(en, "es").question(s)).not.toBe(en.question(s));
  });

  it("translates the move-out summary", () => {
    let s: InterviewState = { ...emptyInterviewState(), noticeType: "termination" };
    s = answer(s, "tenancyStartDate", { date: "2025-03-10" });
    s = answer(s, "noticeDate", { date: "2026-05-10" });
    const text = localizeStep(step(s, "noticeDate"), "es").summary(s);
    expect(text).toContain("aviso de 60 días");
    expect(text).toContain("julio");
  });
});
