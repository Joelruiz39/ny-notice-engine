// Fills the official NYS Unified Court System eviction petitions
// (LT-N2 nonpayment, LT-H2 holdover) from a notice the landlord already served.
// The form files are passed in (see PetitionFormBytes). Not legal advice.

import { PDFDocument, StandardFonts, degrees, rgb } from "@cantoo/pdf-lib";

import {
  amountOnly,
  check,
  removeButtons,
  selectOption,
  selectRadioByIndex,
  setText,
  splitPeriod,
  stampSignature,
  type AnyForm,
} from "./pdf";
import {
  formatShortDate,
  landlordAddressLine,
  premisesLine,
  requiredTerminationDays,
  stripUnitLabel,
  totalOwed,
  type NoticeFormData,
} from "./notice-types";
import { serviceMethodLabel, type PetitionFormData, type PetitionType } from "./petition-types";

/** The two official petition PDFs, as raw bytes. */
export interface PetitionFormBytes {
  nonpayment: Uint8Array;
  holdover: Uint8Array;
}

function tenantNames(notice: NoticeFormData): string[] {
  return notice.tenantNames.map((n) => n.trim()).filter(Boolean);
}

const isoToday = () => new Date().toISOString().slice(0, 10);

/**
 * On the holdover petition the 30 / 60 / 90 day choices are three separate
 * one-button fields, not one radio group, and their names do not say which is
 * which. Matched to the printed labels by position on page 1 of the form:
 * the button beside "30 days" is the unsuffixed field, "60 days" is "...0",
 * and "90 days" is "...1". If the court reissues the form, the test that reads
 * these buttons back will fail and this table must be rechecked.
 */
const HOLDOVER_TIMEFRAME_FIELD: Record<30 | 60 | 90, string> = {
  30: "WrittenDemandServiceTimeframe",
  60: "WrittenDemandServiceTimeframe0",
  90: "WrittenDemandServiceTimeframe1",
};

function fillShared(
  pdfForm: AnyForm,
  notice: NoticeFormData,
  petition: PetitionFormData,
  today: string,
) {
  const names = tenantNames(notice);
  setText(pdfForm, "Court", petition.court);
  selectOption(pdfForm, "County", petition.county);
  setText(pdfForm, "Landlord", notice.landlordName);
  setText(pdfForm, "Tenants", names.join(", "));
  setText(pdfForm, "PropertyAddress", premisesLine(notice));
  names.slice(0, 10).forEach((name, i) => setText(pdfForm, `Tenant${i + 1}`, name));
  setText(pdfForm, "IndexNumber", petition.indexNumber);
  setText(pdfForm, "MonthlyRentAmount", amountOnly(notice.monthlyRent));
  selectOption(pdfForm, "DayOfMonth", notice.rentDueDay);
  setText(pdfForm, "TotalRentDue", amountOnly(String(totalOwed(notice.rentPeriods))));

  // Verification / notary block.
  setText(pdfForm, "PetitionerName", petition.petitionerName || notice.landlordName);
  selectOption(pdfForm, "NotaryCounty", petition.notaryCounty || petition.county);

  // Landlord contact block repeated on the Good Cause pages.
  setText(pdfForm, "LandlordName", notice.landlordName);
  setText(pdfForm, "LandlordEmail", notice.landlordEmail);
  setText(pdfForm, "LandlordPhone", notice.landlordPhone);
  setText(pdfForm, "LandlordBusinessAddress", landlordAddressLine(notice));
  setText(pdfForm, "LandlordSignatureDate", formatShortDate(today));

  // Good Cause Eviction Law notice, identical to the pages on the notices.
  setText(pdfForm, "StreetName", notice.premisesStreet);
  setText(pdfForm, "UnitNumber", stripUnitLabel(notice.premisesUnit));
  setText(pdfForm, "CityTownVillage", notice.premisesCity);
  setText(pdfForm, "State", "New York");
  setText(pdfForm, "ZipCode", notice.premisesZip);
  const covered = notice.goodCauseCovered === "yes";
  selectRadioByIndex(pdfForm, "1", covered ? 0 : 1);
  if (!covered && notice.goodCauseExemption) {
    check(pdfForm, `2${notice.goodCauseExemption.toUpperCase()}`, true);
  }
  check(pdfForm, "3A", covered);
}

/**
 * Fills a petition and returns the document with its form fields still
 * editable (not yet flattened). Exported so the filled values can be tested.
 */
export async function fillPetition(
  forms: PetitionFormBytes,
  type: PetitionType,
  notice: NoticeFormData,
  petition: PetitionFormData,
  options: { today?: string } = {},
): Promise<PDFDocument> {
  const today = options.today ?? isoToday();
  const covered = notice.goodCauseCovered === "yes";
  const pdf = await PDFDocument.load(type === "nonpayment" ? forms.nonpayment : forms.holdover);
  const pdfForm = pdf.getForm();
  fillShared(pdfForm, notice, petition, today);

  if (type === "nonpayment") {
    notice.rentPeriods
      .filter((p) => p.period.trim() || p.amount.trim())
      .slice(0, 10)
      .forEach((p, i) => {
        const { month, year } = splitPeriod(p.period);
        setText(pdfForm, `BackRent${i + 1}`, amountOnly(p.amount));
        selectOption(pdfForm, `BackRentMonth${i + 1}`, month);
        setText(pdfForm, `BackRentYear${i + 1}`, year);
      });
    // Non-payment of rent is the lawful ground under Article 6-A.
    check(pdfForm, "4E", covered);
  } else {
    setText(
      pdfForm,
      "LeaseExpirationDate",
      formatShortDate(petition.leaseExpirationDate || notice.terminationExpirationDate),
    );
    // The notice period required for this tenancy (RPL 226-c), which is what the
    // 30/60/90 choice on the form asks for. Using only the manual override here
    // would print 30 days for every ordinary case.
    selectRadioByIndex(pdfForm, HOLDOVER_TIMEFRAME_FIELD[requiredTerminationDays(notice)], 0);
    // Question 4A reads "This unit is exempt from Article 6-A", so it is marked
    // only when the unit is exempt. Covered units need a reason from the list;
    // that choice is left for the landlord and is not guessed here.
    check(pdfForm, "4A", !covered);
  }
  return pdf;
}

/** A short cover sheet listing how and when the predicate notice was served. */
async function serviceStatementPage(
  out: PDFDocument,
  notice: NoticeFormData,
  petition: PetitionFormData,
  noticeLabel: string,
) {
  const page = out.addPage([612, 792]);
  const bold = await out.embedFont(StandardFonts.TimesRomanBold);
  const body = await out.embedFont(StandardFonts.TimesRoman);
  const lines: [string, string][] = [
    ["Predicate notice", noticeLabel],
    ["Date of the notice", formatShortDate(notice.noticeDate)],
    ["Date served", formatShortDate(petition.serviceDate)],
    ["Manner of service", serviceMethodLabel(petition.serviceMethod)],
    ["Tenants served", tenantNames(notice).join(", ")],
    ["Premises", premisesLine(notice)],
  ];
  page.drawText("STATEMENT OF SERVICE OF THE PREDICATE NOTICE", {
    x: 60,
    y: 700,
    size: 13,
    font: bold,
  });
  let y = 660;
  for (const [label, value] of lines) {
    page.drawText(`${label}:`, { x: 60, y, size: 11, font: bold });
    page.drawText(value || "—", { x: 220, y, size: 11, font: body });
    y -= 24;
  }
  page.drawText(
    "A copy of the predicate notice served on the respondent(s) is attached as Exhibit A.",
    { x: 60, y: y - 16, size: 11, font: body, color: rgb(0.2, 0.2, 0.2) },
  );
}

export interface PetitionExhibit {
  label: string;
  bytes: Uint8Array;
}

/**
 * Renders the complete filing packet: petition + verification, the statement of
 * service, and the served notice attached as an exhibit.
 */
export async function renderPetitionPdf(
  forms: PetitionFormBytes,
  type: PetitionType,
  notice: NoticeFormData,
  petition: PetitionFormData,
  options: {
    watermark?: boolean;
    exhibits?: PetitionExhibit[];
    noticeLabel?: string;
    today?: string;
  } = {},
): Promise<Uint8Array> {
  const source = await fillPetition(forms, type, notice, petition, options);
  await stampSignature(source, notice);
  const sourceForm = source.getForm();
  removeButtons(sourceForm);
  sourceForm.flatten();

  const out = await PDFDocument.create();
  const pages = await out.copyPages(source, source.getPageIndices());
  pages.forEach((page) => out.addPage(page));

  await serviceStatementPage(out, notice, petition, options.noticeLabel ?? "Predicate notice");

  for (const exhibit of options.exhibits ?? []) {
    try {
      const doc = await PDFDocument.load(exhibit.bytes);
      const copied = await out.copyPages(doc, doc.getPageIndices());
      copied.forEach((page) => out.addPage(page));
    } catch {
      /* skip an exhibit we cannot read */
    }
  }

  if (options.watermark) {
    const bold = await out.embedFont(StandardFonts.HelveticaBold);
    for (const page of out.getPages()) {
      const { width, height } = page.getSize();
      page.drawText("NOT VALID", {
        x: width * 0.1,
        y: height * 0.34,
        size: 84,
        font: bold,
        color: rgb(0.72, 0.14, 0.16),
        rotate: degrees(32),
        opacity: 0.22,
      });
      page.drawText("PREVIEW ONLY — NOT VALID FOR FILING", {
        x: width * 0.11,
        y: height * 0.28,
        size: 13,
        font: bold,
        color: rgb(0.72, 0.14, 0.16),
        rotate: degrees(32),
        opacity: 0.28,
      });
    }
  }

  out.setTitle(type === "nonpayment" ? "Nonpayment Petition" : "Holdover Petition");
  out.setProducer("ny-notice-engine");
  return out.save();
}
