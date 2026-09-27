import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const sourcePath = "C:\\Users\\Asus\\Downloads\\Roster RLX (1).xlsx";
const outputPath = "C:\\Users\\Asus\\Downloads\\Rocky Teams Reminder Pilot Import.xlsx";

function safeText(value) {
  const text = String(value ?? "").trim();
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

const sourceFile = await FileBlob.load(sourcePath);
const sourceWorkbook = await SpreadsheetFile.importXlsx(sourceFile);
const sourceSheet = sourceWorkbook.worksheets.getItem("Roster Total");
const sourceValues = sourceSheet.getUsedRange().values;
const sourceHeaders = sourceValues[0].map((value) => String(value ?? "").trim());
const nameIndex = sourceHeaders.indexOf("Name");
const emailIndex = sourceHeaders.indexOf("RLX Email");

if (nameIndex < 0 || emailIndex < 0) {
  throw new Error("The source roster must contain Name and RLX Email columns.");
}

const importRows = sourceValues
  .slice(1)
  .filter((row) => typeof row[emailIndex] === "string" && row[emailIndex].includes("@"))
  .map((row) => [
    safeText(row[nameIndex]),
    safeText(row[emailIndex]),
    false,
    "Test",
    null,
    0,
    null,
    0,
  ]);

const workbook = Workbook.create();
const sheet = workbook.worksheets.add("Pilot agents");
sheet.showGridLines = false;

sheet.getRange("A1:H1").values = [[
  "AgentName",
  "TeamsEmail",
  "Active",
  "PilotStatus",
  "LastReminderAt",
  "RemindersToday",
  "LastInteractionAt",
  "IgnoredReminderCount",
]];
sheet.getRange(`A2:H${importRows.length + 1}`).values = importRows;

sheet.getRange(`A1:H${importRows.length + 1}`).format.font = { name: "Arial", size: 10 };
sheet.getRange("A1:H1").format = {
  fill: "#0F5132",
  font: { name: "Arial", size: 10, bold: true, color: "#FFFFFF" },
  horizontalAlignment: "center",
  verticalAlignment: "center",
};
sheet.getRange(`A1:H${importRows.length + 1}`).format.verticalAlignment = "center";
sheet.getRange(`A1:H${importRows.length + 1}`).format.borders = { preset: "insideHorizontal", style: "thin", color: "#E5E7EB" };
sheet.getRange(`E2:E${importRows.length + 1}`).format.numberFormat = "yyyy-mm-dd hh:mm";
sheet.getRange(`G2:G${importRows.length + 1}`).format.numberFormat = "yyyy-mm-dd hh:mm";
sheet.getRange(`C2:C${importRows.length + 1}`).dataValidation = { rule: { type: "list", values: ["TRUE", "FALSE"] } };
sheet.getRange(`D2:D${importRows.length + 1}`).dataValidation = { rule: { type: "list", values: ["Test", "Ready", "Paused"] } };
sheet.getRange("A:A").format.columnWidth = 28;
sheet.getRange("B:B").format.columnWidth = 38;
sheet.getRange("C:D").format.columnWidth = 16;
sheet.getRange("E:E").format.columnWidth = 20;
sheet.getRange("F:F").format.columnWidth = 18;
sheet.getRange("G:G").format.columnWidth = 20;
sheet.getRange("H:H").format.columnWidth = 22;
sheet.freezePanes.freezeRows(1);
sheet.tables.add(`A1:H${importRows.length + 1}`, true, "RockyPilotAgents");

workbook.recalculate();
const inspection = await workbook.inspect({
  kind: "table",
  range: `Pilot agents!A1:H6`,
  include: "values,formulas",
  tableMaxRows: 6,
  tableMaxCols: 8,
});
if (!inspection.ndjson.includes("AgentName") || importRows.length !== 57) {
  throw new Error("The pilot import workbook did not contain the expected schema and 57 valid agents.");
}
const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!",
  options: { useRegex: true, maxResults: 50 },
  summary: "formula error scan",
});
if (errors.ndjson.includes("#")) {
  throw new Error("The generated import workbook contains formula errors.");
}

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(`Created ${outputPath} with ${importRows.length} inactive test agents.`);
