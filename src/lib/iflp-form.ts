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

export interface IflpChild {
  firstName: string;
  age: number | null;
}

export interface IflpFormState {
  planMonth: string;
  planYear: number;
  client1: IflpClient;
  client2: IflpClient;
  children: IflpChild[];
  corporationName: string;
  householdIncome: number | null;
  priorities: string[];
}

export const emptyClient: IflpClient = { firstName: "", lastName: "", age: null };

export const emptyChild: IflpChild = { firstName: "", age: null };

export const initialIflpFormState: IflpFormState = {
  planMonth: "",
  planYear: new Date().getFullYear(),
  client1: { ...emptyClient },
  client2: { ...emptyClient },
  children: [],
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
// Parties — the reuse primitive shared across steps
// ---------------------------------------------------------------------------
//
// A "party" is a client or the corporation — the entities every later-step table
// rows against (income alignment, CPP/OAS, accounts, insurance, transfers,
// funding). Step 1 (People & Profile) is the single source of truth: a name typed
// once here becomes a party, and later steps reference it by its stable `key`
// instead of re-entering the name. This mirrors the persisted model, where those
// tables carry a `party_id` (see PlanPartyRow and the `*_id` columns in types.ts).
//
// Derive parties from state wherever a step needs them — don't copy names into
// step-local fields, or step 1 stops being the source of truth.

export type PartyKey = "client1" | "client2" | "corporation";

export interface IflpParty {
  key: PartyKey;
  type: "client" | "corporation";
  /** Display name: the client's full name, or the corporation name. */
  name: string;
  /** First name for prose; "" for the corporation. */
  firstName: string;
  /** Age for client rows; null for the corporation. */
  age: number | null;
}

// The parties present in this plan, in document order: client 1 (once named),
// client 2 (only if a second client was entered), then the corporation (only if
// named). Absent parties are omitted, so a solo plan yields a single client and
// no phantom "Client 2" row anywhere downstream.
export function deriveParties(state: IflpFormState): IflpParty[] {
  const parties: IflpParty[] = [];
  if (hasClient(state.client1)) {
    parties.push({
      key: "client1",
      type: "client",
      name: fullName(state.client1),
      firstName: state.client1.firstName.trim(),
      age: state.client1.age,
    });
  }
  if (hasClient(state.client2)) {
    parties.push({
      key: "client2",
      type: "client",
      name: fullName(state.client2),
      firstName: state.client2.firstName.trim(),
      age: state.client2.age,
    });
  }
  const corp = state.corporationName.trim();
  if (corp) {
    parties.push({ key: "corporation", type: "corporation", name: corp, firstName: "", age: null });
  }
  return parties;
}

// Clients only (no corporation), for the "one row per client" tables — CPP/OAS,
// TFSA/RRSP/PPP, term life, etc.
export function deriveClients(state: IflpFormState): IflpParty[] {
  return deriveParties(state).filter((p) => p.type === "client");
}

// Option list for the "Client"/entity dropdown (SelectInput) in later-step
// tables: value is the stable party key, label is the name from step 1. Pass
// `clientsOnly` for tables that never row against the corporation.
export function partyOptions(
  state: IflpFormState,
  clientsOnly = false
): { label: string; value: PartyKey }[] {
  const parties = clientsOnly ? deriveClients(state) : deriveParties(state);
  return parties.map((p) => ({ label: p.name, value: p.key }));
}

// Resolve a stored party key back to its display name — for rendering a row a
// later step recorded as e.g. { party: "client1", amount: … }. Unknown/absent
// key -> "" (e.g. a row still pointing at a client that was removed).
export function partyName(state: IflpFormState, key: PartyKey): string {
  return deriveParties(state).find((p) => p.key === key)?.name ?? "";
}

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
  children: string;
  // Subject + verb for the intro sentence, agreeing with client count:
  // "Dan and Sam are" (two clients) or "Dan is" (one). The template supplies
  // the rest of the sentence ("… in a strong financial position …").
  clientsClause: string;
  // Whether the plan has at least one named child. Gates the Family education
  // goal table ({#hasChildren} … {/hasChildren}) so it drops out entirely when
  // there are no children.
  hasChildren: boolean;
  // Named children rendered as a possessive list for the Family goal row, e.g.
  // "Emma and Liam’s" / "Emma’s". Empty when there are no children.
  childrenNames: string;
  // Loop-ready party lists for the per-row tables. In the template, a table row
  // becomes a docxtemplater loop over one of these, e.g.
  //   {#clients}<cell>{name}</cell><cell>{cppAmount}</cell>{/clients}
  // so the row repeats once per client with the name reused from step 1 — and a
  // solo plan drops the second row automatically (no phantom "Client 2").
  // `parties` also includes the corporation for tables that row against it.
  clients: IflpParty[];
  parties: IflpParty[];
}

function fullName(c: IflpClient): string {
  return [c.firstName.trim(), c.lastName.trim()].filter(Boolean).join(" ");
}

function hasClient(c: IflpClient): boolean {
  return Boolean(c.firstName.trim() || c.lastName.trim());
}

// Renders children as "Emma (10), Liam (7)" for the {children} tag. Kids with
// no name are skipped; a named child with no age falls back to just the name.
// No children -> "".
function formatChildren(children: IflpChild[]): string {
  return children
    .map((c) => {
      const name = c.firstName.trim();
      if (!name) return "";
      return c.age == null ? name : `${name} (${c.age})`;
    })
    .filter(Boolean)
    .join(", ");
}

// Named (non-empty) child first names, in order.
function childNames(children: IflpChild[]): string[] {
  return children.map((c) => c.firstName.trim()).filter(Boolean);
}

// Possessive list for the Family goal row: ["Emma","Liam"] -> "Emma and Liam’s",
// ["Emma"] -> "Emma’s". The apostrophe is a typographic ’ to match the template
// copy. No children -> "".
function formatChildrenPossessive(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return `${names[0]}’s`;
  const last = names[names.length - 1];
  return `${names.slice(0, -1).join(", ")} and ${last}’s`;
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

  // Subject + verb for the intro sentence, using first names for a warmer read.
  const c1First = c1.firstName.trim();
  const c2First = c2.firstName.trim();
  const clientsClause = bothClients
    ? `${c1First} and ${c2First} are`
    : c1First
    ? `${c1First} is`
    : "";

  const names = childNames(state.children);

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
    children: formatChildren(state.children),
    clientsClause,
    hasChildren: names.length > 0,
    childrenNames: formatChildrenPossessive(names),
    clients: deriveClients(state),
    parties: deriveParties(state),
  };
}
