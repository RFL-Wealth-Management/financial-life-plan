// IFLP wizard form state, and the mapping from that state to the flat tag
// payload docxtemplater renders into templates/iflp.tagged.docx.
//
// This module is client-safe (no fs). docx-service imports only the payload
// type. As the form grows section by section, extend IflpFormState + the
// builder here, then hand-tag the matching {tags} in templates/iflp.tagged.docx
// (see docs/iflp-tagging.md).

// ---------------------------------------------------------------------------
// Form state. Field value types match the Storybook field components
// (src/components/fields) so they bind directly: numbers where the component
// takes number | null, strings for text.
// ---------------------------------------------------------------------------

export interface IflpClient {
  firstName: string;
  lastName: string;
  age: number | null;
}

export interface IflpFormState {
  planMonth: string;
  planYear: number;
  client1: IflpClient;
  client2: IflpClient;
  corporationName: string;
  householdIncome: number | null;
  priorities: string[];
}

export const emptyClient: IflpClient = { firstName: "", lastName: "", age: null };

export const initialIflpFormState: IflpFormState = {
  planMonth: "",
  planYear: new Date().getFullYear(),
  client1: { ...emptyClient },
  client2: { ...emptyClient },
  corporationName: "",
  householdIncome: null,
  priorities: [],
};

// ---------------------------------------------------------------------------
// Wizard steps. Only "people" renders real fields today; the rest are
// placeholders so the shell, progress, and generate button work end-to-end.
// ---------------------------------------------------------------------------

export interface IflpStep {
  id: string;
  title: string;
  blurb: string;
}

export const IFLP_STEPS: IflpStep[] = [
  { id: "people", title: "People & Profile", blurb: "Clients, corporation, and profile basics." },
  { id: "goals", title: "Goals & Success", blurb: "Priorities, target age, and what success looks like." },
  { id: "retirement", title: "Retirement & Savings", blurb: "Buckets, income alignment, monthly savings, benefits." },
  { id: "accounts", title: "Accounts & Education", blurb: "Registered/corporate accounts and education funding." },
  { id: "insurance", title: "Insurance", blurb: "Term life, critical illness, and disability." },
  { id: "implementation", title: "Implementation", blurb: "Transfers, lump-sum, and monthly contributions." },
];

// ---------------------------------------------------------------------------
// State -> doc payload
// ---------------------------------------------------------------------------

// Flat keys are the {tags} typed into templates/iflp.tagged.docx. Every value
// is a string because that is what lands in the document.
export interface IflpDocPayload {
  planMonth: string;
  planYear: string;
  client1Name: string;
  client2Name: string;
  welcomeGreeting: string;
  coverClients: string;
  corporationName: string;
  client1Age: string;
  householdIncome: string;
  priorities: string;
}

function fullName(c: IflpClient): string {
  return [c.firstName.trim(), c.lastName.trim()].filter(Boolean).join(" ");
}

function hasClient(c: IflpClient): boolean {
  return Boolean(c.firstName.trim() || c.lastName.trim());
}

// "$285,000" from 285000. Null -> "".
function formatCurrency(n: number | null): string {
  if (n == null || Number.isNaN(n)) return "";
  return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export function buildIflpDocPayload(state: IflpFormState): IflpDocPayload {
  const c1 = state.client1;
  const c2 = state.client2;
  const c1Full = fullName(c1);
  const c2Full = fullName(c2);
  const bothClients = hasClient(c2);

  const coverClients = bothClients ? `${c1Full} & ${c2Full}` : c1Full;

  const greetingNames = bothClients
    ? `${c1.firstName.trim()}, ${c2.firstName.trim()}`
    : c1.firstName.trim();
  const welcomeGreeting = greetingNames ? `Dear ${greetingNames} & Family,` : "";

  return {
    planMonth: state.planMonth.trim(),
    planYear: state.planYear ? String(state.planYear) : "",
    client1Name: c1Full,
    client2Name: c2Full,
    welcomeGreeting,
    coverClients,
    corporationName: state.corporationName.trim(),
    client1Age: c1.age == null ? "" : String(c1.age),
    householdIncome: formatCurrency(state.householdIncome),
    priorities: state.priorities.join(", "),
  };
}
