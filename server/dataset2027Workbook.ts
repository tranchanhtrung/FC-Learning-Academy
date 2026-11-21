import * as XLSX from 'xlsx';
import { build2027DatasetRows } from '../src/data/dataset2027.ts';

export function build2027DatasetWorkbook(): XLSX.WorkBook {
  const sheets = build2027DatasetRows();
  const wb = XLSX.utils.book_new();
  (Object.keys(sheets) as Array<keyof typeof sheets>).forEach((sheetName) => {
    const ws = XLSX.utils.json_to_sheet(sheets[sheetName]);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });
  return wb;
}

export function create2027TemplateBuffer(): Buffer {
  const wb = build2027DatasetWorkbook();
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}
