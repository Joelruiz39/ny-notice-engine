// Spanish overrides for the interview script. The data model and the official
// court PDF stay in English; only what the landlord reads changes.

import type { InterviewState, InterviewStep } from "./interview";
import { earliestMoveOutDate, parseDate, requiredTerminationDays } from "./notice-types";

export type Locale = "en" | "es";

export const SECTIONS_ES: Record<string, string> = {
  Notice: "Aviso",
  Landlord: "Propietario",
  Tenants: "Inquilinos",
  Premises: "Vivienda",
  "Rent owed": "Renta adeudada",
  "Good Cause": "Causa Justa",
  Tenancy: "Arrendamiento",
  Dates: "Fechas",
  Email: "Correo electrónico",
};

/** Exact-match translations for the short recap lines shown in the review list. */
const SUMMARY_ES: Record<string, string> = {
  "30 / 60 / 90-day termination": "Terminación de 30 / 60 / 90 días",
  "14-day rent demand": "Demanda de renta de 14 días",
  Owner: "Propietario",
  "Agent for the owner": "Agente del propietario",
  Residence: "Residencia",
  Business: "Negocio",
  Covered: "Cubierta",
  Exempt: "Exenta",
  "Lease expired": "El contrato venció",
  "Rental agreement expired": "El acuerdo de alquiler venció",
  "Landlord is ending the tenancy": "El propietario termina el arrendamiento",
};

interface StepEs {
  question?: string | ((s: InterviewState) => string);
  hint?: string;
  placeholder?: string;
  choices?: Record<string, string>;
  fields?: Record<string, string>;
  summary?: (s: InterviewState) => string;
}

export const STEPS_ES: Record<string, StepEs> = {
  noticeType: {
    question: "¿Qué aviso necesita hoy?",
    hint: "Elija la demanda de renta si el inquilino debe dinero, o el aviso de terminación si va a finalizar el arrendamiento.",
    choices: {
      nonpayment: "Demanda de renta de 14 días (con aviso de atraso de 5 días)",
      termination: "Terminación de 30 / 60 / 90 días",
    },
    fields: { choice: "Tipo de aviso (nonpayment o termination)" },
  },
  landlordRole: {
    question: "¿Firma usted como propietario o como agente administrador del propietario?",
    choices: { owner: "Propietario / dueño", agent: "Agente del propietario" },
    fields: { choice: "propietario o agente" },
  },
  landlordName: {
    question: "¿Qué nombre debe aparecer en el aviso como la persona que lo entrega?",
    placeholder: "María Álvarez",
    fields: { text: "Nombre completo" },
  },
  landlordAddress: {
    question:
      "¿Qué dirección postal debe usar el inquilino para comunicarse con usted? Calle, ciudad y código postal es suficiente.",
    placeholder: "12 Market St, Kingston NY 12401",
    fields: { street: "Calle", city: "Ciudad", state: "Estado", zip: "Código postal" },
  },
  landlordContact: {
    question:
      "¿Qué teléfono y correo electrónico debe usar el inquilino para coordinar el pago? Ambos son obligatorios.",
    fields: { phone: "Teléfono", email: "Correo electrónico" },
  },
  tenantNames: {
    question: "¿Quiénes son los inquilinos nombrados en el contrato? Menciónelos a todos.",
    fields: {
      n1: "Inquilino 1",
      n2: "Inquilino 2 (opcional)",
      n3: "Inquilino 3 (opcional)",
    },
  },
  premises: {
    question: "¿Cuál es la dirección completa de la unidad alquilada, incluyendo el apartamento?",
    fields: {
      street: "Calle",
      unit: "Unidad / apto (opcional)",
      city: "Ciudad / pueblo",
      county: "Condado",
      zip: "Código postal",
    },
  },
  premisesRooms: {
    question:
      "El formulario de la corte pide una descripción corta de la unidad: ¿cuántos cuartos tiene y en qué piso está?",
    placeholder: "3 cuartos en el 2do piso",
    fields: { rooms: "Número de cuartos", floors: "Piso(s)" },
  },
  premisesSides: {
    question:
      "¿En qué lado del edificio está la unidad? Puede indicar más de uno — izquierda, derecha, frente, atrás o medio.",
    placeholder: "frente y derecha",
    fields: { text: "Lado(s)" },
  },
  propertyUse: {
    question: "¿La propiedad se usa como residencia o como negocio?",
    choices: { residence: "Residencia", business: "Negocio" },
    fields: { choice: "residencia o negocio" },
  },
  monthlyRent: {
    question: "¿Cuál es la renta mensual de esta unidad?",
    fields: { amount: "Renta mensual" },
  },
  rentDueDay: {
    question: "Según el contrato, ¿qué día de cada mes vence la renta?",
    placeholder: "el 1ro",
    fields: { text: "Día en que vence la renta" },
  },
  rentPeriods: {
    question:
      "¿Qué períodos de renta están sin pagar y cuánto se debe por cada uno? Las cortes lo requieren detallado.",
    placeholder: "marzo y abril de 2026 a 1,800 cada uno",
    fields: {
      p1: "Período 1",
      a1: "Monto 1",
      p2: "Período 2 (opcional)",
      a2: "Monto 2 (opcional)",
      p3: "Período 3 (opcional)",
      a3: "Monto 3 (opcional)",
    },
  },
  goodCauseCovered: {
    question:
      "La demanda de renta debe llevar adjunto el aviso de la Ley de Desalojo por Causa Justa. ¿Está esta unidad cubierta por la Ley de Desalojo por Causa Justa (Artículo 6-A)?",
    hint: "La mayoría de los propietarios pequeños fuera de la Ciudad de Nueva York están exentos — por ejemplo si tiene 10 unidades o menos, o si el municipio no ha adoptado la ley.",
    choices: { no: "No — la unidad está exenta", yes: "Sí — la unidad está cubierta" },
    fields: { choice: "sí o no" },
  },
  goodCauseExemption: {
    question: "¿Qué exención aplica? Marcaré esa casilla en el aviso adjunto.",
    fields: { choice: "Letra de exención (A-N)" },
  },
  tenancyStartDate: {
    question:
      "¿Cuándo se mudó el inquilino o tomó posesión por primera vez? Esto determina si se requieren 30, 60 o 90 días de aviso.",
    placeholder: "junio de 2023",
    fields: { date: "Fecha de inicio del arrendamiento" },
  },
  terminationReason: {
    question: "¿Por qué no puede quedarse el inquilino? El formulario de la corte tiene tres casillas.",
    choices: {
      landlord_ending: "El propietario termina el contrato o acuerdo de alquiler",
      lease_expired: "El contrato escrito venció",
      agreement_expired: "El acuerdo de alquiler (verbal o escrito) venció",
    },
    fields: { choice: "landlord_ending, lease_expired o agreement_expired" },
  },
  terminationExpirationDate: {
    question: "¿En qué fecha venció?",
    placeholder: "31 de mayo de 2026",
    fields: { date: "Fecha de vencimiento" },
  },
  noticeDate: {
    question: "¿Qué fecha firmará y entregará este aviso? Hoy está bien.",
    placeholder: "hoy",
    fields: { date: "Fecha del aviso" },
    summary: (s: InterviewState) => {
      if (s.noticeType !== "termination" || !s.form.noticeDate) return s.form.noticeDate;
      const moveOut = parseDate(earliestMoveOutDate(s.form));
      const long = moveOut
        ? moveOut.toLocaleDateString("es-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
            timeZone: "UTC",
          })
        : "—";
      return `${s.form.noticeDate} — aviso de ${requiredTerminationDays(s.form)} días; el inquilino debe desocupar para el ${long}`;
    },
  },
  guestEmail: {
    question: "La última — ¿a qué correo le envío el enlace de descarga?",
    hint: "El correo es obligatorio para enviarle el enlace de descarga.",
    fields: { text: "Correo electrónico" },
  },
};

export function translateSummary(text: string, locale: Locale): string {
  if (locale === "en") return text;
  return SUMMARY_ES[text] ?? text;
}

/** Wrap a step so everything the landlord reads is in their language. */
export function localizeStep(step: InterviewStep, locale: Locale): InterviewStep {
  if (locale === "en") return step;
  const o = STEPS_ES[step.id];
  const section = SECTIONS_ES[step.section] ?? step.section;
  const localized: InterviewStep = {
    ...step,
    section,
    summary: (s) => translateSummary(step.summary(s), locale),
  };
  if (!o) return localized;

  if (o.summary) {
    const sum = o.summary;
    localized.summary = (s) => sum(s);
  }
  if (o.question) {
    const q = o.question;
    localized.question = typeof q === "function" ? q : () => q;
  }
  if (o.hint) {
    const h = o.hint;
    localized.hint = () => h;
  }
  if (o.placeholder) localized.placeholder = o.placeholder;
  if (o.choices && step.choices) {
    localized.choices = step.choices.map((c) => ({
      ...c,
      label: o.choices?.[c.value] ?? c.label,
    }));
  }
  if (o.fields) {
    localized.fallbackFields = step.fallbackFields.map((f) => ({
      ...f,
      label: o.fields?.[f.key] ?? f.label,
    }));
  }
  return localized;
}
