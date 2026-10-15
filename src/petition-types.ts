// Types for the court eviction petition packet (NY outside NYC).
// Not legal advice. See README.md.

import type { NoticeType } from "./notice-types";

export type PetitionType = "nonpayment" | "holdover";

export const PETITION_LABELS: Record<PetitionType, string> = {
  nonpayment: "Nonpayment petition (LT-N2)",
  holdover: "Holdover petition (LT-H2)",
};

/** The petition that follows from the predicate notice the landlord served. */
export function petitionTypeFor(noticeType: NoticeType): PetitionType {
  return noticeType === "nonpayment" ? "nonpayment" : "holdover";
}

export const PETITION_SERVICE_METHODS = [
  { value: "personal", label: "Personal delivery to the tenant" },
  { value: "substituted", label: "Delivered to another person of suitable age" },
  { value: "conspicuous", label: "Affixed to the door and mailed" },
  { value: "certified_mail", label: "Certified mail" },
] as const;

/** Human label for a stored service-method value; unknown values pass through. */
export function serviceMethodLabel(value: string): string {
  return PETITION_SERVICE_METHODS.find((m) => m.value === value)?.label ?? value;
}

export interface PetitionFormData {
  /** e.g. "Utica City Court" */
  court: string;
  county: string;
  indexNumber: string;
  petitionerName: string;
  notaryCounty: string;
  /** Holdover only: the date the lease or rental agreement expired. */
  leaseExpirationDate: string;
  serviceMethod: string;
  serviceDate: string;
}

export function emptyPetitionForm(): PetitionFormData {
  return {
    court: "",
    county: "",
    indexNumber: "",
    petitionerName: "",
    notaryCounty: "",
    leaseExpirationDate: "",
    serviceMethod: "personal",
    serviceDate: "",
  };
}

export function validatePetition(form: PetitionFormData, type: PetitionType): string[] {
  const errors: string[] = [];
  if (!form.court.trim()) errors.push("Enter the court where the case will be filed.");
  if (!form.county.trim()) errors.push("Enter the county.");
  if (!form.petitionerName.trim()) errors.push("Enter the petitioner's name.");
  if (!form.serviceDate.trim()) errors.push("Enter the date the notice was served.");
  if (type === "holdover" && !form.leaseExpirationDate.trim()) {
    errors.push("Enter the date the lease or rental agreement expired.");
  }
  return errors;
}
