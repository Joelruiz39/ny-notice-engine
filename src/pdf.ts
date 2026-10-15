// Fills the official NYS Unified Court System fillable landlord/tenant PDFs.
// The form files themselves are passed in (see FormBytes) so this module has no
// file-system or bundler dependency. Not legal advice. See README.md.

import { PDFDocument, StandardFonts, degrees, rgb } from "@cantoo/pdf-lib";

import {
  earliestMoveOutDate,
  formatShortDate,
  landlordAddressLine,
  parseDate,
  premisesLine,
  stripUnitLabel,
  totalOwed,
  type NoticeFormData,
  type NoticeType,
} from "./notice-types";

/** The three official fillable PDFs, as raw bytes. */
export interface FormBytes {
  fiveDay: Uint8Array;
  rentDemand: Uint8Array;
  terminate: Uint8Array;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function decode(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export type AnyForm = ReturnType<PDFDocument["getForm"]>;

export function setText(form: AnyForm, name: string, value: string) {
  if (!value) return;
  try {
    form.getTextField(name).setText(value);
  } catch {
    /* field absent on this revision of the form */
  }
}

export function check(form: AnyForm, name: string, on: boolean) {
  if (!on) return;
  try {
    form.getCheckBox(name).check();
  } catch {
    /* ignore */
  }
}

export function selectRadio(form: AnyForm, name: string, value: string) {
  try {
    form.getRadioGroup(name).select(value);
  } catch {
    /* ignore */
  }
}

/**
 * Selects the nth button of a radio group. Some UCS groups export the same
 * value ("Yes") from every widget, so selecting by value is ambiguous.
 */
export function selectRadioByIndex(form: AnyForm, name: string, index: number) {
  try {
    const group = form.getRadioGroup(name);
    const options = group.getOptions();
    const widgets = group.acroField.getWidgets();
    const widget = widgets[index];
    if (!widget) return;
    const onState = widget.getOnValue();
    if (onState) {
      widget.setAppearanceState(onState);
      group.acroField.setValue(onState);
    } else if (options[index]) {
      group.select(options[index]!);
    }
  } catch {
    /* ignore */
  }
}

export function removeButtons(form: AnyForm) {
  for (const field of form.getFields()) {
    if (field.constructor.name === "PDFButton") {
      try {
        form.removeField(field);
      } catch {
        /* ignore */
      }
    }
  }
}

export function selectOption(form: AnyForm, name: string, value: string) {
  if (!value) return;
  try {
    const dropdown = form.getDropdown(name);
    dropdown.select(value);
  } catch {
    setText(form, name, value);
  }
}

/** "March 2026", "2026-03", "3/2026" -> { month: "March", year: "26" } */
export function splitPeriod(period: string): { month: string; year: string } {
  const text = period.trim();
  if (!text) return { month: "", year: "" };
  const iso = parseDate(text.length === 7 ? `${text}-01` : text);
  if (iso) {
    return { month: MONTHS[iso.getUTCMonth()]!, year: String(iso.getUTCFullYear()).slice(-2) };
  }
  const month = MONTHS.find((m) => text.toLowerCase().includes(m.toLowerCase())) ?? "";
  const yearMatch = text.match(/(\d{4})|'(\d{2})/);
  const year = yearMatch ? (yearMatch[1] ?? yearMatch[2] ?? "").slice(-2) : "";
  return { month, year };
}

export function amountOnly(value: string): string {
  const n = Number(String(value).replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(n) || n === 0) return "";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function tenants(form: NoticeFormData): string[] {
  return form.tenantNames.map((n) => n.trim()).filter(Boolean);
}

/** Fields shared by the header block of all three UCS forms. */
export function fillCommon(pdfForm: AnyForm, data: NoticeFormData) {
  const names = tenants(data);
  setText(pdfForm, "Landlord", data.landlordName);
  setText(pdfForm, "Tenants", names.join(", "));
  setText(pdfForm, "PropertyAddress", premisesLine(data));
  setText(pdfForm, "ApartmentNumber", stripUnitLabel(data.premisesUnit));
  setText(pdfForm, "NumberOfRooms", data.premisesRooms);
  setText(pdfForm, "Floor", data.premisesFloors);
  check(pdfForm, "Left", data.premisesSides.includes("left"));
  check(pdfForm, "Right", data.premisesSides.includes("right"));
  check(pdfForm, "Front", data.premisesSides.includes("front"));
  check(pdfForm, "Back", data.premisesSides.includes("back"));
  check(pdfForm, "Middle", data.premisesSides.includes("middle"));
  selectRadio(pdfForm, "PropertyType", data.propertyUse === "business" ? "Business" : "Residence");
  names.slice(0, 12).forEach((name, i) => setText(pdfForm, `Tenant${i + 1}`, name));

  setText(pdfForm, "LandlordName", data.landlordName);
  setText(pdfForm, "LandlordPhone", data.landlordPhone);
  setText(pdfForm, "LandlordEmail", data.landlordEmail);
  setText(pdfForm, "LandlordAddress", landlordAddressLine(data));
  setText(pdfForm, "LandlordBusinessAddress", landlordAddressLine(data));
  setText(pdfForm, "LandlordSignatureDate", formatShortDate(data.noticeDate));
  setText(pdfForm, "LandlordwyerSignatureDate", formatShortDate(data.noticeDate));

  // Good Cause Eviction Law notice (last page) repeats the landlord block
  // under its own field names.
  setText(pdfForm, "LandlordName0", data.landlordName);
  setText(pdfForm, "LandlordPhone0", data.landlordPhone);
  setText(pdfForm, "LandlordEmail0", data.landlordEmail);
  setText(pdfForm, "LandlordBusinessAddress0", landlordAddressLine(data));
  setText(pdfForm, "LandlordSignatureDate0", formatShortDate(data.noticeDate));
}

async function buildFiveDay(forms: FormBytes, data: NoticeFormData) {
  const pdf = await PDFDocument.load(forms.fiveDay);
  const pdfForm = pdf.getForm();
  fillCommon(pdfForm, data);
  selectOption(pdfForm, "DayOfMonth", data.rentDueDay);
  const first = data.rentPeriods.find((p) => p.period.trim() || p.amount.trim());
  if (first) {
    const { month, year } = splitPeriod(first.period);
    selectOption(pdfForm, "BackRentMonth", month);
    setText(pdfForm, "BackRentYear", year);
  }
  setText(pdfForm, "TotalRentDue", amountOnly(String(totalOwed(data.rentPeriods))));
  return pdf;
}

async function buildRentDemand(forms: FormBytes, data: NoticeFormData) {
  const pdf = await PDFDocument.load(forms.rentDemand);
  const pdfForm = pdf.getForm();
  fillCommon(pdfForm, data);

  data.rentPeriods
    .filter((p) => p.period.trim() || p.amount.trim())
    .slice(0, 8)
    .forEach((p, i) => {
      const { month, year } = splitPeriod(p.period);
      setText(pdfForm, `BackRent${i + 1}`, amountOnly(p.amount));
      selectOption(pdfForm, `BackRentMonth${i + 1}`, month);
      setText(pdfForm, `BackRentYear${i + 1}`, year);
    });
  setText(pdfForm, "TotalRentDue", amountOnly(String(totalOwed(data.rentPeriods))));

  // Good Cause Eviction Law notice (pages 2-7 of the same official form).
  setText(pdfForm, "StreetName", data.premisesStreet);
  setText(pdfForm, "UnitNumber", stripUnitLabel(data.premisesUnit));
  setText(pdfForm, "CityTownVillage", data.premisesCity);
  setText(pdfForm, "State", "New York");
  setText(pdfForm, "ZipCode", data.premisesZip);
  const covered = data.goodCauseCovered === "yes";
  selectRadioByIndex(pdfForm, "1", covered ? 0 : 1);
  if (!covered && data.goodCauseExemption) {
    check(pdfForm, `2${data.goodCauseExemption.toUpperCase()}`, true);
  }
  // Not a rent-increase notice: "the rent is not being increased above the threshold".
  check(pdfForm, "3A", covered);
  // Non-payment of rent is the lawful reason under Article 6-A.
  check(pdfForm, "4E", covered);
  return pdf;
}

async function buildTerminate(forms: FormBytes, data: NoticeFormData) {
  const pdf = await PDFDocument.load(forms.terminate);
  const pdfForm = pdf.getForm();
  fillCommon(pdfForm, data);
  const basis = data.terminationBasis;
  selectRadioByIndex(
    pdfForm,
    "EvictionReason",
    basis === "lease_expired" ? 0 : basis === "agreement_expired" ? 1 : 2,
  );
  if (basis === "lease_expired") {
    setText(pdfForm, "LeaseExpirationDate", formatShortDate(data.terminationExpirationDate));
  }
  if (basis === "agreement_expired") {
    setText(
      pdfForm,
      "RentalAgreementExpirationDate",
      formatShortDate(data.terminationExpirationDate),
    );
  }
  setText(pdfForm, "MoveOutDate", formatShortDate(earliestMoveOutDate(data)));
  return pdf;
}

/**
 * The blank signature line sits immediately to the LEFT of the printed-name
 * field on every official form, so we anchor off the name field.
 */
const SIGNATURE_ANCHOR_FIELDS = ["LandlordName", "LandlordName0"];

/**
 * Draws the landlord's signature on the signature line that sits immediately
 * to the left of each signature-date field on the official forms.
 */
export async function stampSignature(pdf: PDFDocument, data: NoticeFormData) {
  const typed = data.signatureTypedName.trim();
  if (!data.signatureDataUrl && !typed) return;

  const pdfForm = pdf.getForm();
  let image: Awaited<ReturnType<PDFDocument["embedPng"]>> | null = null;
  if (data.signatureDataUrl.startsWith("data:image/png;base64,")) {
    try {
      image = await pdf.embedPng(decode(data.signatureDataUrl.split(",")[1] ?? ""));
    } catch {
      image = null;
    }
  }
  const italic = typed ? await pdf.embedFont(StandardFonts.TimesRomanItalic) : null;

  for (const name of SIGNATURE_ANCHOR_FIELDS) {
    let widgets;
    try {
      widgets = pdfForm.getTextField(name).acroField.getWidgets();
    } catch {
      continue;
    }
    for (const widget of widgets) {
      const rect = widget.getRectangle();
      const target = pdf.getPages().find((page) => {
        const annots = page.node.Annots()?.asArray() ?? [];
        return annots.some((ref) => {
          try {
            return pdf.context.lookup(ref) === widget.dict;
          } catch {
            return false;
          }
        });
      });
      if (!target) continue;

      const boxWidth = 185;
      const x = Math.max(42, rect.x - boxWidth - 14);
      if (image) {
        const scale = Math.min(boxWidth / image.width, 26 / image.height);
        target.drawImage(image, {
          x,
          y: rect.y + 2,
          width: image.width * scale,
          height: image.height * scale,
        });
      } else if (italic) {
        target.drawText(typed, {
          x,
          y: rect.y + 5,
          size: 13,
          font: italic,
          color: rgb(0.08, 0.11, 0.24),
        });
      }
    }
  }
}

export type NoticeDocumentKey = "five_day" | "rent_demand" | "terminate";

export interface RenderedDocument {
  key: NoticeDocumentKey;
  label: string;
  fileName: string;
  bytes: Uint8Array;
}

async function assemble(
  sources: PDFDocument[],
  data: NoticeFormData,
  options: { watermark: boolean },
  title: string,
): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  for (const source of sources) {
    await stampSignature(source, data);
    const sourceForm = source.getForm();
    removeButtons(sourceForm);
    sourceForm.flatten();
    const pages = await out.copyPages(source, source.getPageIndices());
    pages.forEach((page) => out.addPage(page));
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
      page.drawText("PREVIEW ONLY — NOT VALID FOR SERVICE", {
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

  out.setTitle(title);
  out.setProducer("ny-notice-engine");
  return out.save();
}

function slug(data: NoticeFormData): string {
  const who = (data.tenantNames.find((n) => n.trim()) ?? "notice")
    .trim()
    .replace(/[^a-z0-9]+/gi, "-");
  return (who || "notice").toLowerCase();
}

/**
 * Builds the notice from the official NYS Unified Court System fillable PDFs,
 * copying every filled page into a single document.
 */
export async function renderNoticePdf(
  forms: FormBytes,
  type: NoticeType,
  data: NoticeFormData,
  options: { watermark: boolean } = { watermark: false },
): Promise<Uint8Array> {
  const sources: PDFDocument[] = [];
  if (type === "nonpayment") {
    sources.push(await buildFiveDay(forms, data));
    sources.push(await buildRentDemand(forms, data));
  } else {
    sources.push(await buildTerminate(forms, data));
  }
  return assemble(
    sources,
    data,
    options,
    type === "nonpayment"
      ? "Written Demand for Past Due Rent"
      : "Written Notice to Terminate (Move Out)",
  );
}

/**
 * Same content as `renderNoticePdf`, but each legal document stays in its own
 * file, since the 5-day late rent notice and the 14-day demand are served
 * separately.
 */
export async function renderNoticeDocuments(
  forms: FormBytes,
  type: NoticeType,
  data: NoticeFormData,
  options: { watermark: boolean } = { watermark: false },
): Promise<RenderedDocument[]> {
  const who = slug(data);
  const docs: RenderedDocument[] = [];
  if (type === "nonpayment") {
    docs.push({
      key: "five_day",
      label: "5-day late rent notice",
      fileName: `ny-five-day-late-rent-notice-${who}.pdf`,
      bytes: await assemble(
        [await buildFiveDay(forms, data)],
        data,
        options,
        "Notice of Late Rent (5 Day)",
      ),
    });
    docs.push({
      key: "rent_demand",
      label: "14-day rent demand",
      fileName: `ny-rent-demand-${who}.pdf`,
      bytes: await assemble(
        [await buildRentDemand(forms, data)],
        data,
        options,
        "Written Demand for Past Due Rent",
      ),
    });
  } else {
    docs.push({
      key: "terminate",
      label: "Notice to terminate",
      fileName: `ny-notice-to-terminate-${who}.pdf`,
      bytes: await assemble(
        [await buildTerminate(forms, data)],
        data,
        options,
        "Written Notice to Terminate (Move Out)",
      ),
    });
  }
  return docs;
}
