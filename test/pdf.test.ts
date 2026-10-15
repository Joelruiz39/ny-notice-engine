import { existsSync } from "node:fs";
import { join } from "node:path";
import { PDFDocument } from "@cantoo/pdf-lib";
import { describe, expect, it } from "vitest";

import { loadFormsFromDir } from "../src/node";
import {
  amountOnly,
  fillCommon,
  renderNoticeDocuments,
  renderNoticePdf,
  splitPeriod,
  type FormBytes,
} from "../src/pdf";
import { emptyForm, type NoticeFormData } from "../src/notice-types";

const sample = (): NoticeFormData => ({
  ...emptyForm(),
  landlordName: "Jane Landlord",
  landlordStreet: "1 Main St",
  landlordCity: "Kingston",
  landlordZip: "12401",
  landlordPhone: "845-555-0100",
  landlordEmail: "jane@example.com",
  tenantNames: ["Jordan Ellis"],
  premisesStreet: "44 Chestnut St",
  premisesUnit: "Unit 2",
  premisesCity: "Kingston",
  premisesCounty: "Ulster",
  premisesZip: "12401",
  rentPeriods: [
    { period: "March 2026", amount: "1800" },
    { period: "April 2026", amount: "1800" },
  ],
  tenancyStartDate: "2025-01-01",
  noticeDate: "2026-05-10",
  signatureTypedName: "Jane Landlord",
});

/** A stand-in fillable PDF with the named text fields, for tests that do not need the real court form. */
async function standIn(names: string[]): Promise<PDFDocument> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const form = doc.getForm();
  names.forEach((name, i) => {
    const field = form.createTextField(name);
    field.addToPage(page, { x: 250, y: 740 - i * 18, width: 200, height: 14 });
  });
  return doc;
}

describe("splitPeriod", () => {
  it.each([
    ["March 2026", { month: "March", year: "26" }],
    ["2026-03", { month: "March", year: "26" }],
    ["march 2025", { month: "March", year: "25" }],
    ["", { month: "", year: "" }],
  ])("%s", (input, expected) => {
    expect(splitPeriod(input)).toEqual(expected);
  });
});

describe("amountOnly", () => {
  it("formats with two decimals and thousands separators", () => {
    expect(amountOnly("$1,800")).toBe("1,800.00");
    expect(amountOnly("3600.5")).toBe("3,600.50");
  });

  it("leaves zero and non-numbers blank", () => {
    expect(amountOnly("0")).toBe("");
    expect(amountOnly("abc")).toBe("");
  });
});

describe("fillCommon", () => {
  it("fills the header block and never repeats the word Unit", async () => {
    const doc = await standIn([
      "Landlord",
      "Tenants",
      "PropertyAddress",
      "ApartmentNumber",
      "LandlordName",
      "LandlordSignatureDate",
    ]);
    fillCommon(doc.getForm(), sample());
    const text = (n: string) => doc.getForm().getTextField(n).getText();

    expect(text("Landlord")).toBe("Jane Landlord");
    expect(text("Tenants")).toBe("Jordan Ellis");
    expect(text("PropertyAddress")).toBe("44 Chestnut St, Unit 2, Kingston, NY 12401 (County of Ulster)");
    expect(text("ApartmentNumber")).toBe("2");
    expect(text("LandlordSignatureDate")).toBe("05/10/2026");
  });

  it("ignores fields that a form revision does not have", async () => {
    const doc = await standIn(["Landlord"]);
    expect(() => fillCommon(doc.getForm(), sample())).not.toThrow();
  });
});

describe("renderNoticePdf with stand-in forms", () => {
  const names = ["Landlord", "Tenants", "PropertyAddress", "LandlordName", "TotalRentDue", "MoveOutDate"];
  const forms = async (): Promise<FormBytes> => ({
    fiveDay: await (await standIn(names)).save(),
    rentDemand: await (await standIn(names)).save(),
    terminate: await (await standIn(names)).save(),
  });

  it("bundles the 5-day and 14-day notices into one PDF for a rent demand", async () => {
    const bytes = await renderNoticePdf(await forms(), "nonpayment", sample());
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe("%PDF-");
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(2);
  });

  it("produces one page for a termination notice", async () => {
    const bytes = await renderNoticePdf(await forms(), "termination", sample());
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
  });

  it("adds a watermark only when asked", async () => {
    const f = await forms();
    const clean = await renderNoticePdf(f, "termination", sample(), { watermark: false });
    const marked = await renderNoticePdf(f, "termination", sample(), { watermark: true });
    expect(marked.length).toBeGreaterThan(clean.length);
  });

  it("can return each legal document as its own file", async () => {
    const docs = await renderNoticeDocuments(await forms(), "nonpayment", sample());
    expect(docs.map((d) => d.key)).toEqual(["five_day", "rent_demand"]);
    expect(docs[1]?.fileName).toBe("ny-rent-demand-jordan-ellis.pdf");
  });
});

// The real court forms are public documents saved by hand into forms/ (see
// forms/README.md). When present, this checks that every field name the engine
// fills still exists in each PDF, so a renamed field fails loudly instead of
// leaving a blank line on a court form.
const formsDir = join(__dirname, "..", "forms");
const haveForms = ["five-day.pdf", "rent-demand.pdf", "terminate.pdf"].every((f) =>
  existsSync(join(formsDir, f)),
);

describe.skipIf(!haveForms)("official forms contract", () => {
  const n = (prefix: string, count: number) => Array.from({ length: count }, (_, i) => `${prefix}${i + 1}`);
  const header = [
    "Landlord", "Tenants", "PropertyAddress", "ApartmentNumber", "NumberOfRooms", "Floor",
    "PropertyType", "Left", "Right", "Front", "Back", "Middle", ...n("Tenant", 12),
    "LandlordName", "LandlordPhone", "LandlordEmail",
  ];
  const exemptions = "ABCDEFGHIJKLMN".split("").map((c) => `2${c}`);

  // Fields the engine fills. Some are filled "if present" because the three
  // forms name the same thing differently (e.g. LandlordAddress vs
  // LandlordBusinessAddress), so each list holds only names that must exist.
  const required: Record<keyof FormBytes, string[]> = {
    fiveDay: [...header, "LandlordAddress", "LandlordSignatureDate", "DayOfMonth", "BackRentMonth", "BackRentYear", "TotalRentDue"],
    rentDemand: [
      ...header, "LandlordBusinessAddress", "LandlordSignatureDate", "TotalRentDue",
      ...n("BackRent", 8), ...n("BackRentMonth", 8), ...n("BackRentYear", 8),
      "StreetName", "UnitNumber", "CityTownVillage", "State", "ZipCode", "1", "3A", "4E", ...exemptions,
      "LandlordName0", "LandlordPhone0", "LandlordEmail0", "LandlordBusinessAddress0", "LandlordSignatureDate0",
    ],
    terminate: [
      ...header, "LandlordBusinessAddress", "LandlordwyerSignatureDate", "EvictionReason",
      "LeaseExpirationDate", "RentalAgreementExpirationDate", "MoveOutDate",
    ],
  };

  it.each(Object.keys(required) as (keyof FormBytes)[])("%s has every field the engine fills", async (key) => {
    const forms = await loadFormsFromDir(formsDir);
    const doc = await PDFDocument.load(forms[key]);
    const present = new Set(doc.getForm().getFields().map((f) => f.getName()));
    const missing = required[key].filter((name) => !present.has(name));
    expect(missing).toEqual([]);
  });

  it("renders every notice type from the real forms", async () => {
    const forms = await loadFormsFromDir(formsDir);
    const pages = async (type: "nonpayment" | "termination") =>
      (await PDFDocument.load(await renderNoticePdf(forms, type, sample()))).getPageCount();
    expect(await pages("nonpayment")).toBe(8); // 1-page 5-day notice + 7-page demand with Good Cause notice
    expect(await pages("termination")).toBe(1);
  });
});
