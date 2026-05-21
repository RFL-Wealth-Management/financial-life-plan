import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import fs from "fs";
import path from "path";

const TEMPLATE_PATH = path.join(
  process.cwd(),
  "templates",
  "fflp-template.docx"
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
