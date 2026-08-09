import * as XLSX from "xlsx";

export interface ParsedQuestion {
  questionNumber: number;
  question: string;
  options: string[];
  correctOption: 1 | 2 | 3 | 4;
}

export interface ParseResult {
  questions: ParsedQuestion[];
  errors: string[];
}

const REQUIRED_HEADERS = ["Q.No", "Question", "Opt1", "Opt2", "Opt3", "Opt4", "Correct Opt"];
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

export function parseQuestionsWorkbook(buffer: Buffer): ParseResult {
  const errors: string[] = [];

  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    return { questions: [], errors: ["File exceeds the 2MB size limit"] };
  }

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "buffer" });
  } catch {
    return { questions: [], errors: ["The file is not a valid .xlsx workbook"] };
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { questions: [], errors: ["The workbook has no sheets"] };
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  if (rows.length === 0) {
    return { questions: [], errors: ["The sheet has no data rows"] };
  }

  // Validate headers against the first row's keys
  const actualHeaders = Object.keys(rows[0]);
  const missingHeaders = REQUIRED_HEADERS.filter((h) => !actualHeaders.includes(h));
  if (missingHeaders.length > 0) {
    return {
      questions: [],
      errors: [`Missing required column(s): ${missingHeaders.join(", ")}`],
    };
  }

  const questions: ParsedQuestion[] = [];
  const seenNumbers = new Set<number>();

  rows.forEach((row, index) => {
    const rowNum = index + 2; // +2 because row 1 is the header, data starts at row 2 in Excel

    const isBlankRow = REQUIRED_HEADERS.every((h) => String(row[h] ?? "").trim() === "");
    if (isBlankRow) return; // skip silently

    const qNoRaw = row["Q.No"];
    const questionText = String(row["Question"] ?? "").trim();
    const opt1 = String(row["Opt1"] ?? "").trim();
    const opt2 = String(row["Opt2"] ?? "").trim();
    const opt3 = String(row["Opt3"] ?? "").trim();
    const opt4 = String(row["Opt4"] ?? "").trim();
    const correctRaw = row["Correct Opt"];

    const qNo = Number(qNoRaw);
    if (!qNoRaw || isNaN(qNo) || qNo <= 0 || !Number.isInteger(qNo)) {
      errors.push(`Row ${rowNum}: Q.No must be a positive whole number`);
      return;
    }

    if (!questionText) {
      errors.push(`Row ${rowNum}: Question text is missing`);
      return;
    }

    const options = [opt1, opt2, opt3, opt4];
    if (options.some((o) => !o)) {
      errors.push(`Row ${rowNum}: All four options (Opt1-Opt4) are required`);
      return;
    }

    const correctOption = Number(correctRaw);
    if (![1, 2, 3, 4].includes(correctOption)) {
      errors.push(`Row ${rowNum}: Correct Opt must be 1, 2, 3, or 4`);
      return;
    }

    if (seenNumbers.has(qNo)) {
      errors.push(`Row ${rowNum}: Duplicate Q.No ${qNo}`);
      return;
    }
    seenNumbers.add(qNo);

    questions.push({
      questionNumber: qNo,
      question: questionText,
      options,
      correctOption: correctOption as 1 | 2 | 3 | 4,
    });
  });

  if (questions.length === 0 && errors.length === 0) {
    errors.push("No valid questions found in the file");
  }

  return { questions, errors };
}