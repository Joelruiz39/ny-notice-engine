import { describe, expect, it } from "vitest";
import {
  earliestMoveOutDate,
  emptyForm,
  formatShortDate,
  premisesLine,
  requiredTerminationDays,
  statutoryTerminationDays,
  stripUnitLabel,
  totalOwed,
  validateForm,
  type NoticeFormData,
} from "../src/notice-types";

const mk = (tenancyStartDate: string, noticeDate: string, extra: Partial<NoticeFormData> = {}) => ({
  ...emptyForm(),
  tenancyStartDate,
  noticeDate,
  ...extra,
});

describe("statutoryTerminationDays (RPL 226-c tiers)", () => {
  it("is 30 days under one year of occupancy", () => {
    expect(statutoryTerminationDays(mk("2026-01-01", "2026-03-10"))).toBe(30);
  });

  it("is 30 days the day before the first anniversary", () => {
    expect(statutoryTerminationDays(mk("2025-03-10", "2026-03-09"))).toBe(30);
  });

  it("is 60 days on the first anniversary", () => {
    expect(statutoryTerminationDays(mk("2025-03-10", "2026-03-10"))).toBe(60);
  });

  it("is 90 days at two years or more", () => {
    expect(statutoryTerminationDays(mk("2024-03-10", "2026-03-10"))).toBe(90);
  });

  it("defaults to 30 when a date is missing", () => {
    expect(statutoryTerminationDays(mk("", "2026-03-10"))).toBe(30);
  });

  // The anniversary must not depend on the machine's time zone or daylight
  // saving changes. Run with: npm run test:ny
  it("treats the exact anniversary as 60 days across a daylight-saving change", () => {
    expect(statutoryTerminationDays(mk("2025-11-02", "2026-11-02"))).toBe(60);
    expect(statutoryTerminationDays(mk("2025-03-09", "2026-03-09"))).toBe(60);
  });
});

describe("requiredTerminationDays", () => {
  it("lets a longer override win", () => {
    expect(requiredTerminationDays(mk("2026-01-01", "2026-03-10", { terminationDaysOverride: "90" }))).toBe(90);
  });

  it("never lets an override go below the statutory minimum", () => {
    expect(requiredTerminationDays(mk("2025-03-10", "2026-03-10", { terminationDaysOverride: "30" }))).toBe(60);
  });
});

describe("earliestMoveOutDate", () => {
  it("30 days: counts from the first of next month, ends on the last day of that month", () => {
    expect(earliestMoveOutDate(mk("2026-01-01", "2026-03-10"))).toBe("2026-04-30");
  });

  it("60 days", () => {
    expect(earliestMoveOutDate(mk("2025-01-01", "2026-03-10"))).toBe("2026-05-31");
  });

  it("90 days", () => {
    expect(earliestMoveOutDate(mk("2023-01-01", "2026-03-10"))).toBe("2026-06-30");
  });

  it("rolls into the next year", () => {
    expect(earliestMoveOutDate(mk("2026-06-01", "2026-12-15"))).toBe("2027-01-31");
  });

  it("handles February in a non-leap year", () => {
    expect(earliestMoveOutDate(mk("2026-01-01", "2026-01-10"))).toBe("2026-03-31");
  });

  it("is empty without a notice date", () => {
    expect(earliestMoveOutDate(mk("2026-01-01", ""))).toBe("");
  });
});

describe("stripUnitLabel", () => {
  it.each([
    ["Unit 2", "2"],
    ["unit 2B", "2B"],
    ["Apt. 3B", "3B"],
    ["Apartment 4", "4"],
    ["Suite 100", "100"],
    ["Ste. 5", "5"],
    ["#4", "4"],
    ["# 4", "4"],
    ["2B", "2B"],
    ["  7  ", "7"],
    ["Unit2", "2"],
    ["Apt3B", "3B"],
  ])("%s -> %s", (input, expected) => {
    expect(stripUnitLabel(input)).toBe(expected);
  });

  it("does not eat the start of a word that merely begins with a label", () => {
    expect(stripUnitLabel("North Wing")).toBe("North Wing");
    expect(stripUnitLabel("Steinway Annex")).toBe("Steinway Annex");
    expect(stripUnitLabel("Aptos")).toBe("Aptos");
  });
});

describe("premisesLine", () => {
  const base = {
    ...emptyForm(),
    premisesStreet: "44 Chestnut St",
    premisesCity: "Kingston",
    premisesZip: "12401",
    premisesCounty: "Ulster",
  };

  it("does not repeat the word Unit", () => {
    expect(premisesLine({ ...base, premisesUnit: "Unit 2" })).toBe(
      "44 Chestnut St, Unit 2, Kingston, NY 12401 (County of Ulster)",
    );
  });

  it("adds the label when only the identifier was stored", () => {
    expect(premisesLine({ ...base, premisesUnit: "2" })).toBe(
      "44 Chestnut St, Unit 2, Kingston, NY 12401 (County of Ulster)",
    );
  });

  it("omits the unit and county when blank", () => {
    expect(premisesLine({ ...base, premisesCounty: "" })).toBe("44 Chestnut St, Kingston, NY 12401");
  });
});

describe("money helpers", () => {
  it("sums rent periods and ignores formatting", () => {
    expect(totalOwed([{ period: "March 2026", amount: "$1,800.00" }, { period: "April 2026", amount: "1800" }])).toBe(3600);
  });

  it("formats MM/DD/YYYY", () => {
    expect(formatShortDate("2026-03-09")).toBe("03/09/2026");
  });
});

describe("validateForm", () => {
  const complete = (): NoticeFormData => ({
    ...emptyForm(),
    landlordName: "Jane Landlord",
    landlordStreet: "1 Main St",
    landlordCity: "Kingston",
    landlordZip: "12401",
    landlordPhone: "845-555-0100",
    landlordEmail: "jane@example.com",
    tenantNames: ["Jordan Ellis"],
    premisesStreet: "44 Chestnut St",
    premisesCity: "Kingston",
    premisesZip: "12401",
    rentPeriods: [{ period: "March 2026", amount: "1800" }],
    tenancyStartDate: "2025-01-01",
    noticeDate: "2026-03-10",
  });

  it("accepts a complete rent demand", () => {
    expect(validateForm("nonpayment", complete())).toEqual([]);
  });

  it("accepts a complete termination notice", () => {
    expect(validateForm("termination", complete())).toEqual([]);
  });

  it("flags every missing required field on an empty form", () => {
    const errors = validateForm("nonpayment", { ...emptyForm(), noticeDate: "" });
    expect(errors.length).toBeGreaterThanOrEqual(10);
  });

  it("requires a period label for every amount owed", () => {
    const form = { ...complete(), rentPeriods: [{ period: "", amount: "1800" }] };
    expect(validateForm("nonpayment", form)).toContain(
      "Every amount owed needs a rental period label (e.g. March 2026).",
    );
  });

  it("rejects a tenancy that starts after the notice date", () => {
    const form = { ...complete(), tenancyStartDate: "2026-04-01" };
    expect(validateForm("termination", form)).toContain("Tenancy start date cannot be after the notice date.");
  });
});
