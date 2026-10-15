// Node-only helper: load the three official PDFs from a folder.
// Expected files: five-day.pdf, rent-demand.pdf, terminate.pdf
// (see forms/README.md for where to get them).

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { FormBytes } from "./pdf";
import type { PetitionFormBytes } from "./petition";

export async function loadPetitionFormsFromDir(dir: string): Promise<PetitionFormBytes> {
  const [nonpayment, holdover] = await Promise.all([
    readFile(join(dir, "petition-nonpayment.pdf")),
    readFile(join(dir, "petition-holdover.pdf")),
  ]);
  return { nonpayment, holdover };
}

export async function loadFormsFromDir(dir: string): Promise<FormBytes> {
  const [fiveDay, rentDemand, terminate] = await Promise.all([
    readFile(join(dir, "five-day.pdf")),
    readFile(join(dir, "rent-demand.pdf")),
    readFile(join(dir, "terminate.pdf")),
  ]);
  return { fiveDay, rentDemand, terminate };
}
