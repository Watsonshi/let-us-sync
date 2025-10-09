import * as XLSX from 'xlsx';
import { SwimGroup } from '@/types/swimming';
import { parseMmSs } from './timeUtils';

const REQUIRED_HEADERS = ['項次', '組次', '年齡組', '性別', '比賽項目', '姓名', '單位', '報名成績'];

const DAY_RULES = [
  { key: 'd1', label: '第一天（114/09/19，五）', start: 1, end: 85 },
  { key: 'd2', label: '第二天（114/09/20，六）', start: 86, end: 111 },
  { key: 'd3', label: '第三天（114/09/21，日）', start: 112, end: 136 },
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
  console.log('正在搜尋標題列，資料前10列：', rows2D.slice(0, 10));
  
  const maxScan = Math.min(rows2D.length, 30);
  for (let i = 0; i < maxScan; i++) {
    const cols = rows2D[i].map(c => String(c ?? '').trim());
    console.log(`第${i}列內容:`, cols);
    
    let hit = 0;
    const foundHeaders: string[] = [];
    for (const need of REQUIRED_HEADERS) {
      if (cols.includes(need)) {
        hit++;
        foundHeaders.push(need);
      }
    }
    
    console.log(`第${i}列匹配到 ${hit} 個標題:`, foundHeaders);
    
    // 降低匹配要求，只要找到關鍵欄位即可
    const keyHeaders = ['項次', '組次', '年齡組', '性別', '比賽項目'];
    let keyHit = 0;
    for (const key of keyHeaders) {
      if (cols.includes(key)) keyHit++;
    }
    
    if (keyHit >= 4) {
      console.log(`在第${i}列找到標題列，關鍵欄位匹配: ${keyHit}/5`);
      return i;
    }
  }
  
  console.error('未找到標題列，所有欄位掃描結果已輸出至控制台');
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
    const playerName = (r['姓名'] ?? '').toString().trim(); // 新增：取得選手姓名
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
        playerNames: [], // 新增：選手姓名列表
      });
    }
    
    // 新增：收集選手姓名
    if (playerName && !map.get(key).playerNames.includes(playerName)) {
      map.get(key).playerNames.push(playerName);
    }
    
    if (tSec != null) {
      map.get(key).times.push(tSec);
    }
  }
  
  const arr = Array.from(map.values()).map(g => ({
    ...g,
    avgSeconds: g.times.length ? Math.max(...g.times) : null, // 改為使用最慢成績作為預估完賽時間
  }));
  
  // 處理無成績組別
  arr.forEach(g => {
    if (g.avgSeconds === null) {
      const sameEventGroups = arr.filter(other => 
        other.eventNo === g.eventNo && other.avgSeconds !== null
      );
      
      if (sameEventGroups.length > 0) {
        // 使用同項次其他組別的最慢成績作為預估
        const maxTime = Math.max(...sameEventGroups.map(group => group.avgSeconds));
        g.avgSeconds = maxTime;
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
  console.log('開始解析檔案:', file.name);
  
  if (file.name.toLowerCase().endsWith('.csv')) {
    const text = await file.text();
    const rows2D = parseCSV(text);
    const objs = rows2DToObjects(rows2D);
    return buildGroupsFromRows(objs, fallback);
  }
  
  try {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    console.log('Excel工作表列表:', wb.SheetNames);
    
    const sheetName = wb.SheetNames.includes('All') ? 'All' : wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    console.log('使用工作表:', sheetName);
    
    // 先嘗試直接解析
    let rows = XLSX.utils.sheet_to_json(ws, { defval: '' }) as Record<string, any>[];
    console.log('直接解析結果，前5行:', rows.slice(0, 5));
    
    // 檢查是否有正確的標題
    if (rows.length > 0 && rows[0] && '項次' in rows[0]) {
      console.log('使用直接解析結果');
      return buildGroupsFromRows(rows, fallback);
    }
    
    // 如果直接解析失敗，使用2D陣列方式
    console.log('直接解析失敗，嘗試2D陣列解析');
    const rows2D = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][];
    console.log('2D陣列前10行:', rows2D.slice(0, 10));
    
    rows = rows2DToObjects(rows2D);
    return buildGroupsFromRows(rows, fallback);
    
  } catch (error) {
    console.error('Excel解析失敗:', error);
    throw error;
  }
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