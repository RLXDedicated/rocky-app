import { FileBlob, SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const sourcePath = "C:\\Users\\Asus\\Downloads\\Roster RLX (1).xlsx";
const outputPath = "C:\\Users\\Asus\\Downloads\\Rocky Teams Reminder Pilot Paste.xlsx";

function safeText(value) {
  const text = String(value ?? "").trim();
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

const sourceFile = await FileBlob.load(sourcePath);
const sourceWorkbook = await SpreadsheetFile.importXlsx(sourceFile);
const sourceSheet = sourceWorkbook.worksheets.getItem("Roster Total");
const sourceValues = sourceSheet.getUsedRange().values;
const headers = sourceValues[0].map((value) => String(value ?? "").trim());
const nameIndex = headers.indexOf("Name");
const emailIndex = headers.indexOf("RLX Email");

if (nameIndex < 0 || emailIndex < 0) {
  throw new Error("The source roster must contain Name and RLX Email columns.");
}

const rows = sourceValues
  .slice(1)
  .filter((row) => typeof row[emailIndex] === "string" && row[emailIndex].includes("@"))
  .map((row) => [safeText(row[nameIndex]), safeText(row[emailIndex])]);

const workbook = Workbook.create();
const sheet = workbook.worksheets.add("Agents to paste");
sheet.showGridLines = false;
sheet.getRange("A1:B1").values = [["AgentName", "TeamsEmail"]];
sheet.getRange(`A2:B${rows.length + 1}`).values = rows;
sheet.getRange(`A1:B${rows.length + 1}`).format.font = { name: "Arial", size: 10 };
sheet.getRange("A1:B1").format = {
  fill: "#0F5132",
  font: { name: "Arial", size: 10, bold: true, color: "#FFFFFF" },
  horizontalAlignment: "center",
  verticalAlignment: "center",
};
sheet.getRange("A:A").format.columnWidth = 28;
sheet.getRange("B:B").format.columnWidth = 38;
sheet.freezePanes.freezeRows(1);
sheet.tables.add(`A1:B${rows.length + 1}`, true, "RockyPilotPasteAgents");
workbook.recalculate();

const check = await workbook.inspect({
  kind: "table",
  range: "Agents to paste!A1:B6",
  include: "values,formulas",
  tableMaxRows: 6,
  tableMaxCols: 2,
});
if (!check.ndjson.includes("TeamsEmail") || rows.length !== 57) {
  throw new Error("The paste workbook did not contain the expected 57 valid agents.");
}
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(`Created ${outputPath} with ${rows.length} agents.`);
