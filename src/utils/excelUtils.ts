import * as XLSX from 'xlsx';
import { SwimGroup } from '@/types/swimming';
import { parseMmSs } from './timeUtils';
import { isNewFormatExcel, parseNewFormatExcel } from './newFormatParser';
import { logger } from '@/lib/logger';

// 舊格式需要的標題欄位
const REQUIRED_HEADERS = ['項次', '組次', '年齡組', '性別', '比賽項目', '姓名', '單位', '報名成績'];

export const DAY_RULES = [
  { key: 'd1', label: '第一天（115/4/11，六）', start: 1, end: 110, month: 4, day: 11 },
  { key: 'd2', label: '第二天（115/4/12，日）', start: 111, end: 204, month: 4, day: 12 },
];

/** 根據 dayKey 取得該天的實際比賽日期 */
export const getDayDate = (dayKey: string): Date => {
  const rule = DAY_RULES.find(r => r.key === dayKey);
  if (rule) {
    const now = new Date();
    return new Date(now.getFullYear(), rule.month - 1, rule.day);
  }
  return new Date(); // fallback to today
};

/** 根據今天日期自動判斷對應的比賽天數 key，找不到則回傳第一天 */
export const getTodayDayKey = (): string => {
  const now = new Date();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  const match = DAY_RULES.find(r => r.month === m && r.day === d);
  return match ? match.key : '';
};

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
  logger.log('正在搜尋標題列，資料前10列：', rows2D.slice(0, 10));
  
  const maxScan = Math.min(rows2D.length, 30);
  for (let i = 0; i < maxScan; i++) {
    const cols = rows2D[i].map(c => String(c ?? '').trim());
    logger.log(`第${i}列內容:`, cols);
    
    let hit = 0;
    const foundHeaders: string[] = [];
    for (const need of REQUIRED_HEADERS) {
      if (cols.includes(need)) {
        hit++;
        foundHeaders.push(need);
      }
    }
    
    logger.log(`第${i}列匹配到 ${hit} 個標題:`, foundHeaders);
    
    // 降低匹配要求，只要找到關鍵欄位即可
    const keyHeaders = ['項次', '組次', '年齡組', '性別', '比賽項目'];
    let keyHit = 0;
    for (const key of keyHeaders) {
      if (cols.includes(key)) keyHit++;
    }
    
    if (keyHit >= 4) {
      logger.log(`在第${i}列找到標題列，關鍵欄位匹配: ${keyHit}/5`);
      return i;
    }
  }
  
  logger.error('未找到標題列，所有欄位掃描結果已輸出至控制台');
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
    const playerName = (r['姓名'] ?? '').toString().trim();
    const unit = (r['單位'] ?? '').toString().trim(); // 新增：讀取單位欄位
    const timeStr = (r['報名成績'] ?? '').toString().trim();
    const tSec = parseMmSs(timeStr);
    
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
        playerNames: [],
        playerData: [], // 新增：存儲選手姓名和成績的對應關係
      });
    }
    
    // 收集選手姓名（去重）
    if (playerName && !map.get(key).playerNames.includes(playerName)) {
      map.get(key).playerNames.push(playerName);
    }
    
    // 收集成績
    if (tSec != null) {
      map.get(key).times.push(tSec);
    }
    
    // 收集選手和成績的對應（不去重，每個選手都記錄）
    if (playerName) {
      map.get(key).playerData.push({
        name: playerName,
        unit: unit, // 新增：包含單位資訊
        time: tSec,
        timeStr: timeStr, // 保留原始字串格式
      });
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
  logger.log('開始解析檔案:', file.name);
  
  if (file.name.toLowerCase().endsWith('.csv')) {
    const text = await file.text();
    const rows2D = parseCSV(text);
    const objs = rows2DToObjects(rows2D);
    return buildGroupsFromRows(objs, fallback);
  }
  
  try {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    logger.log('Excel工作表列表:', wb.SheetNames);
    
    const sheetName = wb.SheetNames.includes('All') ? 'All' : wb.SheetNames.includes('賽程資料') ? '賽程資料' : wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    logger.log('使用工作表:', sheetName);
    
    // 轉換為 2D 陣列以檢測格式
    const rows2D = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][];
    logger.log('2D陣列前5行:', rows2D.slice(0, 5));
    
    // 檢查是否為新格式
    if (isNewFormatExcel(rows2D)) {
      logger.log('偵測到新格式 Excel，使用新格式解析器');
      return parseNewFormatExcel(file, fallback);
    }
    
    logger.log('使用舊格式解析器');
    
    // 先嘗試直接解析
    let rows = XLSX.utils.sheet_to_json(ws, { defval: '' }) as Record<string, any>[];
    logger.log('直接解析結果，前5行:', rows.slice(0, 5));
    
    // 檢查是否有正確的標題
    if (rows.length > 0 && rows[0] && '項次' in rows[0]) {
      logger.log('使用直接解析結果');
      return buildGroupsFromRows(rows, fallback);
    }
    
    // 如果直接解析失敗，使用2D陣列方式
    logger.log('直接解析失敗，嘗試2D陣列解析');
    rows = rows2DToObjects(rows2D);
    return buildGroupsFromRows(rows, fallback);
    
  } catch (error) {
    logger.error('Excel解析失敗:', error);
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