const TOC_SHEET_NAME = getVariable("TOC_SHEET_NAME") || "目次";
const START_ROW = (() => {
  const configuration = getVariable("START_ROW");
  if (configuration != null) {
    return parseInt(configuration, 10);
  }
  return 1;
})();

function main() {
  const spreadsheetId = getVariable("SPREADSHEET_ID");
  if (spreadsheetId == null) {
    throw new Error("Set SPREADSHEET_ID parameter");
  }

  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const tocData = generateToc(spreadsheet);
  writeToc(spreadsheet, tocData);
}

function getTocSheet(spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet) {
  const result = spreadsheet.getSheetByName(TOC_SHEET_NAME);
  if (result !== null) {
    return result;
  }
  return spreadsheet.insertSheet(TOC_SHEET_NAME, 0);
}

function generateToc(spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet) {
  const allSheets = spreadsheet.getSheets();

  const targets = allSheets.filter(
    (sheet) => !sheet.isSheetHidden() && sheet.getName() !== TOC_SHEET_NAME
  );
  const tocData = targets.map(
    (target) =>
      `=HYPERLINK("#gid=${target.getSheetId()}", "${target.getSheetName()}")`
  );
  return tocData;
}

function writeToc(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  tocData: string[]
) {
  const tocSheet = getTocSheet(spreadsheet);
  tocSheet
    .getRange(START_ROW, 1, tocData.length)
    .setValues(tocData.map((item) => [item]));

  SpreadsheetApp.flush();
}

function getVariable(key: string) {
  if (PropertiesService !== undefined) {
    const scriptProperties = PropertiesService.getScriptProperties();
    return scriptProperties.getProperty(key);
  }

  return process.env[key];
}
