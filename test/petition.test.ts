import { existsSync } from "node:fs";
import { join } from "node:path";
import { PDFDocument } from "@cantoo/pdf-lib";
import { describe, expect, it } from "vitest";

import { loadFormsFromDir, loadPetitionFormsFromDir } from "../src/node";
import { renderNoticePdf } from "../src/pdf";
import { emptyForm, type NoticeFormData } from "../src/notice-types";
import { fillPetition, renderPetitionPdf } from "../src/petition";
import {
  emptyPetitionForm,
  petitionTypeFor,
  serviceMethodLabel,
  validatePetition,
  type PetitionFormData,
} from "../src/petition-types";

const notice = (extra: Partial<NoticeFormData> = {}): NoticeFormData => ({
  ...emptyForm(),
  landlordName: "Jane Landlord",
  landlordStreet: "1 Main St",
  landlordCity: "Kingston",
  landlordZip: "12401",
  landlordPhone: "845-555-0100",
  landlordEmail: "jane@example.com",
  tenantNames: ["Jordan Ellis", "Sam Ellis"],
  premisesStreet: "44 Chestnut St",
  premisesUnit: "Unit 2",
  premisesCity: "Kingston",
  premisesCounty: "Ulster",
  premisesZip: "12401",
  monthlyRent: "1800",
  rentDueDay: "1st",
  rentPeriods: [
    { period: "March 2026", amount: "1800" },
    { period: "April 2026", amount: "1800" },
  ],
  tenancyStartDate: "2025-03-10",
  noticeDate: "2026-05-10",
  terminationExpirationDate: "2026-04-30",
  signatureTypedName: "Jane Landlord",
  ...extra,
});

const petition = (extra: Partial<PetitionFormData> = {}): PetitionFormData => ({
  ...emptyPetitionForm(),
  court: "Kingston City Court",
  county: "Ulster",
  indexNumber: "LT-123-26",
  petitionerName: "Jane Landlord",
  serviceDate: "2026-05-12",
  leaseExpirationDate: "2026-04-30",
  ...extra,
});

describe("petition types", () => {
  it("maps a notice type to its petition", () => {
    expect(petitionTypeFor("nonpayment")).toBe("nonpayment");
    expect(petitionTypeFor("termination")).toBe("holdover");
  });

  it("labels service methods and passes unknown values through", () => {
    expect(serviceMethodLabel("personal")).toBe("Personal delivery to the tenant");
    expect(serviceMethodLabel("carrier pigeon")).toBe("carrier pigeon");
  });

  it("requires court, county, petitioner and service date", () => {
    expect(validatePetition(emptyPetitionForm(), "nonpayment")).toHaveLength(4);
  });

  it("also requires the lease expiration date for a holdover", () => {
    const errors = validatePetition({ ...petition(), leaseExpirationDate: "" }, "holdover");
    expect(errors).toEqual(["Enter the date the lease or rental agreement expired."]);
  });

  it("accepts a complete petition", () => {
    expect(validatePetition(petition(), "holdover")).toEqual([]);
  });
});

const formsDir = join(__dirname, "..", "forms");
const haveForms = ["petition-nonpayment.pdf", "petition-holdover.pdf", "five-day.pdf", "rent-demand.pdf", "terminate.pdf"].every(
  (f) => existsSync(join(formsDir, f)),
);

describe.skipIf(!haveForms)("petitions on the official forms", () => {
  const text = async (type: "nonpayment" | "holdover", n: NoticeFormData, p = petition()) => {
    const doc = await fillPetition(await loadPetitionFormsFromDir(formsDir), type, n, p, { today: "2026-05-14" });
    const form = doc.getForm();
    return (name: string) => form.getTextField(name).getText();
  };

  it("fills the nonpayment petition from the notice", async () => {
    const get = await text("nonpayment", notice());
    expect(get("Court")).toBe("Kingston City Court");
    expect(get("IndexNumber")).toBe("LT-123-26");
    expect(get("Tenants")).toBe("Jordan Ellis, Sam Ellis");
    expect(get("TotalRentDue")).toBe("3,600.00");
    expect(get("MonthlyRentAmount")).toBe("1,800.00");
    expect(get("BackRent2")).toBe("1,800.00");
    expect(get("UnitNumber")).toBe("2");
    expect(get("LandlordSignatureDate")).toBe("05/14/2026");
  });

  // Which of the three 30/60/90 buttons ended up on: 0 = 30, 1 = 60, 2 = 90.
  // Each is its own one-button field (see HOLDOVER_TIMEFRAME_FIELD).
  const selected = async (n: NoticeFormData) => {
    const doc = await fillPetition(await loadPetitionFormsFromDir(formsDir), "holdover", n, petition());
    const on = ["WrittenDemandServiceTimeframe", "WrittenDemandServiceTimeframe0", "WrittenDemandServiceTimeframe1"].map(
      (name) => {
        const w = doc.getForm().getRadioGroup(name).acroField.getWidgets()[0]!;
        const onValue = w.getOnValue();
        return onValue != null && w.getAppearanceState()?.toString() === onValue.toString();
      },
    );
    expect(on.filter(Boolean)).toHaveLength(1); // exactly one button, never none or several
    return on.indexOf(true);
  };

  // The form asks for the notice period the tenancy required, not the manual override.
  it("holdover: 30 days for under a year of occupancy", async () => {
    expect(await selected(notice({ tenancyStartDate: "2026-01-01" }))).toBe(0);
  });

  it("holdover: 60 days for one to two years of occupancy", async () => {
    expect(await selected(notice({ tenancyStartDate: "2025-03-10" }))).toBe(1);
  });

  it("holdover: 90 days for two years or more", async () => {
    expect(await selected(notice({ tenancyStartDate: "2023-03-10" }))).toBe(2);
  });

  it("holdover: 4A (unit is exempt) is checked only for an exempt unit", async () => {
    const forms = await loadPetitionFormsFromDir(formsDir);
    const is4A = async (goodCauseCovered: "yes" | "no") =>
      (await fillPetition(forms, "holdover", notice({ goodCauseCovered }), petition())).getForm().getCheckBox("4A").isChecked();
    expect(await is4A("no")).toBe(true);
    expect(await is4A("yes")).toBe(false);
  });

  it("nonpayment: 4E (nonpayment is the ground) is checked only for a covered unit", async () => {
    const forms = await loadPetitionFormsFromDir(formsDir);
    const is4E = async (goodCauseCovered: "yes" | "no") =>
      (await fillPetition(forms, "nonpayment", notice({ goodCauseCovered }), petition())).getForm().getCheckBox("4E").isChecked();
    expect(await is4E("yes")).toBe(true);
    expect(await is4E("no")).toBe(false);
  });

  it("renders the full packet with a statement of service and the notice as Exhibit A", async () => {
    const petForms = await loadPetitionFormsFromDir(formsDir);
    const noticeForms = await loadFormsFromDir(formsDir);
    const exhibit = await renderNoticePdf(noticeForms, "nonpayment", notice());
    const bytes = await renderPetitionPdf(petForms, "nonpayment", notice(), petition(), {
      exhibits: [{ label: "Exhibit A", bytes: exhibit }],
      noticeLabel: "14-Day Rent Demand",
    });
    const pages = (await PDFDocument.load(bytes)).getPageCount();
    // 8-page petition + 1 statement page + 8-page notice packet (5-day + 7-page demand)
    expect(pages).toBe(8 + 1 + 8);
  });

  it("skips an unreadable exhibit instead of failing", async () => {
    const petForms = await loadPetitionFormsFromDir(formsDir);
    const bytes = await renderPetitionPdf(petForms, "holdover", notice(), petition(), {
      exhibits: [{ label: "bad", bytes: new Uint8Array([1, 2, 3]) }],
    });
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(8 + 1);
  });
});
