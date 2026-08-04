import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import fs from "fs";
import path from "path";
import type { IflpDocPayload } from "@/lib/iflp-form";

const TEMPLATE_PATH = path.join(
  process.cwd(),
  "templates",
  "fflp-template.docx"
);

// The hand-tagged duplicate (iflp-template.docx's highlighted placeholders
// replaced with {tags} in Word) — NOT the highlighted source itself, which
// docxtemplater cannot fill. See docs/iflp-tagging.md for the field->tag map.
const IFLP_TEMPLATE_PATH = path.join(
  process.cwd(),
  "templates",
  "iflp.tagged.docx"
);

interface ClientInput {
  client1FirstName: string;
  client1LastName: string;
  client2FirstName?: string;
  client2LastName?: string;
}

export function generateDocx(data: ClientInput, outputId: string): string {
  const templateContent = fs.readFileSync(TEMPLATE_PATH, "binary");
  const zip = new PizZip(templateContent);

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  const client1Full = `${data.client1FirstName} ${data.client1LastName}`;
  const hasClient2 = data.client2FirstName && data.client2LastName;
  const client2Full = hasClient2
    ? `${data.client2FirstName} ${data.client2LastName}`
    : "";

  const coverClients = hasClient2
    ? `${client1Full} & ${client2Full}`
    : client1Full;

  const welcomeGreeting = hasClient2
    ? `Dear ${data.client1FirstName}, ${data.client2FirstName} & Family,`
    : `Dear ${data.client1FirstName} & Family,`;

  doc.render({
    client1Name: client1Full,
    client2Name: client2Full,
    coverClients,
    welcomeGreeting,
  });

  const outputDir = path.join(process.cwd(), "output");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, `${outputId}.docx`);
  const buffer = doc.getZip().generate({
    type: "nodebuffer",
    compression: "DEFLATE",
  });
  fs.writeFileSync(outputPath, buffer);

  return outputPath;
}

/**
 * Render the IFLP document from a flat tag payload and return it as a buffer.
 *
 * Used by the wizard's "generate at any time" flow, so it streams the file
 * back rather than writing to disk or recording a documents row — persistence
 * is a later step. Missing values render as empty tags (nullGetter), so a
 * half-filled form still produces a document to eyeball.
 */
export function generateIflpBuffer(payload: IflpDocPayload): Buffer {
  const templateContent = fs.readFileSync(IFLP_TEMPLATE_PATH, "binary");
  const zip = new PizZip(templateContent);

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => "",
  });

  doc.render(payload);

  return doc.getZip().generate({
    type: "nodebuffer",
    compression: "DEFLATE",
  });
}
