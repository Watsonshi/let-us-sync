import * as XLSX from 'xlsx';
import { SwimGroup } from '@/types/swimming';
import { parseMmSs } from './timeUtils';

const REQUIRED_HEADERS = ['項次', '組次', '年齡組', '性別', '比賽項目', '姓名', '單位', '報名成績'];

const DAY_RULES = [
  { key: 'd1', label: '第一天（114/09/19，五）', start: 1, end: 28 },
  { key: 'd2', label: '第二天（114/09/20，六）', start: 29, end: 82 },
  { key: 'd3', label: '第三天（114/09/21，日）', start: 83, end: 136 },
];

export const dayKeyOfEvent = (ev: number): string => {
  for (const d of DAY_RULES) {
    if (ev >= d.start && ev <= d.end) return d.key;
  }
  return '';
};

export const dayLabelOfKey = (k: string): string => {
  const d = DAY_RULES.find(x => x.key === k);
  return d ? d.label : '';
};

export const findHeaderIdx2D = (rows2D: any[][]): number => {
  const maxScan = Math.min(rows2D.length, 30);
  for (let i = 0; i < maxScan; i++) {
    const cols = rows2D[i].map(c => String(c ?? '').trim());
    let hit = 0;
    for (const need of REQUIRED_HEADERS) {
      if (cols.includes(need)) hit++;
    }
    if (hit >= 5) return i;
  }
  return -1;
};

export const rows2DToObjects = (rows2D: any[][]): Record<string, any>[] => {
  const hi = findHeaderIdx2D(rows2D);
  if (hi === -1) throw new Error('找不到標題列：未檢出「項次、組次、年齡組…」等欄位');
  
  const header = rows2D[hi].map(c => String(c ?? '').trim());
  const objs: Record<string, any>[] = [];
  
  for (let r = hi + 1; r < rows2D.length; r++) {
    const row = rows2D[r];
    if (!row || row.length === 0) continue;
    
    const obj: Record<string, any> = {};
    for (let c = 0; c < header.length; c++) {
      obj[header[c]] = (row[c] ?? '').toString();
    }
    objs.push(obj);
  }
  
  return objs;
};

export const buildGroupsFromRows = (rows: Record<string, any>[], fallback: number): SwimGroup[] => {
  const map = new Map();
  
  for (const r of rows) {
    const eventNo = parseInt((r['項次'] ?? '').toString().trim() || '0', 10);
    const heatStr = (r['組次'] ?? '').toString().trim();
    const age = (r['年齡組'] ?? '').toString().trim();
    const gender = (r['性別'] ?? '').toString().trim();
    const eventType = (r['比賽項目'] ?? '').toString().trim();
    const tSec = parseMmSs((r['報名成績'] ?? '').toString().trim());
    
    const [numStr, totalStr] = heatStr.split('/');
    const heatNum = parseInt(numStr || '0', 10);
    const heatTotal = parseInt(totalStr || '0', 10);
    
    const key = `${eventNo}|${heatNum}/${heatTotal}`;
    
    if (!map.has(key)) {
      map.set(key, {
        eventNo,
        heatNum,
        heatTotal,
        ageGroup: age,
        gender,
        eventType,
        times: [],
      });
    }
    
    if (tSec != null) {
      map.get(key).times.push(tSec);
    }
  }
  
  const arr = Array.from(map.values()).map(g => ({
    ...g,
    avgSeconds: g.times.length ? g.times.reduce((a: number, b: number) => a + b, 0) / g.times.length : null,
  }));
  
  // 處理無成績組別
  arr.forEach(g => {
    if (g.avgSeconds === null) {
      const sameEventGroups = arr.filter(other => 
        other.eventNo === g.eventNo && other.avgSeconds !== null
      );
      
      if (sameEventGroups.length > 0) {
        const totalAvg = sameEventGroups.reduce((sum, group) => sum + group.avgSeconds, 0) / sameEventGroups.length;
        g.avgSeconds = totalAvg;
      } else {
        g.avgSeconds = fallback;
      }
    }
  });
  
  arr.forEach(g => {
    g.dayKey = dayKeyOfEvent(g.eventNo);
    g.dayLabel = dayLabelOfKey(g.dayKey);
  });
  
  arr.sort((a, b) => a.eventNo - b.eventNo || a.heatNum - b.heatNum);
  
  return arr as SwimGroup[];
};

export const parseExcelFile = async (file: File, fallback: number): Promise<SwimGroup[]> => {
  if (file.name.toLowerCase().endsWith('.csv')) {
    const text = await file.text();
    const rows2D = parseCSV(text);
    const objs = rows2DToObjects(rows2D);
    return buildGroupsFromRows(objs, fallback);
  }
  
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const sheetName = wb.SheetNames.includes('All') ? 'All' : wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  
  let rows = XLSX.utils.sheet_to_json(ws, { defval: '' }) as Record<string, any>[];
  
  if (!rows.length || !(rows[0] && '項次' in rows[0])) {
    const rows2D = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][];
    rows = rows2DToObjects(rows2D);
  }
  
  return buildGroupsFromRows(rows, fallback);
};

const parseCSV = (text: string): string[][] => {
  const rows: string[][] = [];
  let i = 0, field = '', row: string[] = [], inQ = false;
  
  while (i < text.length) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQ = false;
        }
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQ = true;
      } else if (c === ',') {
        row.push(field);
        field = '';
      } else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(field);
        field = '';
        if (row.length > 1 || row[0] !== '') rows.push(row);
        row = [];
      } else {
        field += c;
      }
    }
    i++;
  }
  
  row.push(field);
  if (row.length) rows.push(row);
  
  return rows;
};