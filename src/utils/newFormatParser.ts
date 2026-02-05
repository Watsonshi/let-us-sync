import * as XLSX from 'xlsx';
import { SwimGroup } from '@/types/swimming';
import { parseMmSs } from './timeUtils';
import { dayKeyOfEvent, dayLabelOfKey } from './excelUtils';

// 新格式欄位名稱
const NEW_FORMAT_HEADERS = ['選手姓名', '項次', '比賽項目', '組別', '單位', '報名成績'];

/**
 * 檢查是否為新格式的 Excel 檔案
 */
export const isNewFormatExcel = (rows2D: any[][]): boolean => {
  const maxScan = Math.min(rows2D.length, 10);
  for (let i = 0; i < maxScan; i++) {
    const cols = rows2D[i].map(c => String(c ?? '').trim());
    let hit = 0;
    for (const need of NEW_FORMAT_HEADERS) {
      if (cols.includes(need)) hit++;
    }
    // 如果找到至少 4 個新格式欄位，視為新格式
    if (hit >= 4) return true;
  }
  return false;
};

/**
 * 從組別字串拆分出年齡組和性別
 * 例如: "11 & 12歲級女子組" → { ageGroup: "11 & 12歲級", gender: "女子組" }
 */
export const splitAgeGenderGroup = (groupStr: string): { ageGroup: string; gender: string } => {
  const genderPatterns = ['男子組', '女子組', '男女混合組'];
  
  for (const genderPattern of genderPatterns) {
    if (groupStr.includes(genderPattern)) {
      const ageGroup = groupStr.replace(genderPattern, '').trim();
      return { ageGroup, gender: genderPattern };
    }
  }
  
  // 如果沒有找到性別，嘗試其他模式
  const match = groupStr.match(/(.*?)(男子|女子|混合)/);
  if (match) {
    return {
      ageGroup: match[1].trim(),
      gender: match[2] + '組'
    };
  }
  
  return { ageGroup: groupStr, gender: '' };
};

interface RawPlayer {
  playerName: string;
  eventNo: number;
  eventType: string;
  groupCategory: string; // 原始組別欄位
  ageGroup: string;
  gender: string;
  unit: string;
  timeStr: string;
  timeSec: number | null;
}

/**
 * 解析新格式 Excel 檔案
 */
export const parseNewFormatExcel = async (file: File, fallback: number): Promise<SwimGroup[]> => {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  
  console.log('新格式解析 - 工作表列表:', wb.SheetNames);
  
  // 優先使用 "All" 或第一個工作表
  const sheetName = wb.SheetNames.includes('All') ? 'All' : wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  
  console.log('新格式解析 - 使用工作表:', sheetName);
  
  // 轉換為 2D 陣列
  const rows2D = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][];
  
  // 找到標題列
  let headerIdx = -1;
  let headerCols: string[] = [];
  
  for (let i = 0; i < Math.min(rows2D.length, 20); i++) {
    const cols = rows2D[i].map(c => String(c ?? '').trim());
    let hit = 0;
    for (const need of NEW_FORMAT_HEADERS) {
      if (cols.includes(need)) hit++;
    }
    if (hit >= 4) {
      headerIdx = i;
      headerCols = cols;
      console.log(`新格式解析 - 在第 ${i} 列找到標題:`, cols);
      break;
    }
  }
  
  if (headerIdx === -1) {
    throw new Error('無法識別新格式的標題列');
  }
  
  // 取得各欄位索引
  const colIndex = {
    playerName: headerCols.indexOf('選手姓名'),
    eventNo: headerCols.indexOf('項次'),
    eventType: headerCols.indexOf('比賽項目'),
    groupCategory: headerCols.indexOf('組別'),
    unit: headerCols.indexOf('單位'),
    timeStr: headerCols.indexOf('報名成績'),
  };
  
  console.log('新格式解析 - 欄位索引:', colIndex);
  
  // 解析所有選手資料
  const allPlayers: RawPlayer[] = [];
  
  for (let r = headerIdx + 1; r < rows2D.length; r++) {
    const row = rows2D[r];
    if (!row || row.length === 0) continue;
    
    const playerName = String(row[colIndex.playerName] ?? '').trim();
    const eventNoRaw = String(row[colIndex.eventNo] ?? '').trim();
    const eventType = String(row[colIndex.eventType] ?? '').trim();
    const groupCategory = String(row[colIndex.groupCategory] ?? '').trim();
    const unit = String(row[colIndex.unit] ?? '').trim();
    const timeStr = String(row[colIndex.timeStr] ?? '').trim();
    
    // 跳過空行
    if (!playerName && !eventNoRaw) continue;
    
    const eventNo = parseInt(eventNoRaw, 10);
    if (isNaN(eventNo)) continue;
    
    const { ageGroup, gender } = splitAgeGenderGroup(groupCategory);
    
    // 解析報名成績（處理 99:99.99、40:39.99 等無效值）
    let timeSec: number | null = null;
    if (timeStr && !timeStr.includes('99:99') && !timeStr.includes('40:39')) {
      const parsed = parseMmSs(timeStr);
      // 過濾掉超過 30 分鐘的異常成績（1800 秒）
      if (parsed !== null && parsed <= 1800) {
        timeSec = parsed;
      }
    }
    
    allPlayers.push({
      playerName,
      eventNo,
      eventType,
      groupCategory,
      ageGroup,
      gender,
      unit,
      timeStr,
      timeSec,
    });
  }
  
  console.log(`新格式解析 - 共解析 ${allPlayers.length} 筆選手資料`);
  
  // 按 項次 + 年齡組 + 性別 分組，計算組次
  const groupKey = (p: RawPlayer) => `${p.eventNo}|${p.ageGroup}|${p.gender}`;
  const playersByGroup = new Map<string, RawPlayer[]>();
  
  for (const player of allPlayers) {
    const key = groupKey(player);
    if (!playersByGroup.has(key)) {
      playersByGroup.set(key, []);
    }
    playersByGroup.get(key)!.push(player);
  }
  
  // 為每個分組計算組次
  const swimGroups: SwimGroup[] = [];
  const LANES_PER_HEAT = 8; // 每組 8 條泳道
  
  for (const [key, players] of playersByGroup) {
    // 按報名成績排序（快→慢，無成績排最後）
    players.sort((a, b) => {
      if (a.timeSec === null && b.timeSec === null) return 0;
      if (a.timeSec === null) return 1;
      if (b.timeSec === null) return -1;
      return a.timeSec - b.timeSec;
    });
    
    // 計算需要幾組
    const totalHeats = Math.ceil(players.length / LANES_PER_HEAT);
    
    // 分配到各組
    for (let heatNum = 1; heatNum <= totalHeats; heatNum++) {
      const startIdx = (heatNum - 1) * LANES_PER_HEAT;
      const endIdx = Math.min(startIdx + LANES_PER_HEAT, players.length);
      const heatPlayers = players.slice(startIdx, endIdx);
      
      if (heatPlayers.length === 0) continue;
      
      const firstPlayer = heatPlayers[0];
      const times = heatPlayers
        .map(p => p.timeSec)
        .filter((t): t is number => t !== null);
      
      // 使用該組最慢成績作為預估時間
      const avgSeconds = times.length > 0 ? Math.max(...times) : fallback;
      
      const group: SwimGroup = {
        eventNo: firstPlayer.eventNo,
        heatNum,
        heatTotal: totalHeats,
        ageGroup: firstPlayer.ageGroup,
        gender: firstPlayer.gender,
        eventType: firstPlayer.eventType,
        times,
        avgSeconds,
        dayKey: dayKeyOfEvent(firstPlayer.eventNo),
        dayLabel: dayLabelOfKey(dayKeyOfEvent(firstPlayer.eventNo)),
        playerNames: heatPlayers.map(p => p.playerName),
        playerData: heatPlayers.map(p => ({
          name: p.playerName,
          unit: p.unit,
          time: p.timeSec,
          timeStr: p.timeStr,
        })),
      };
      
      swimGroups.push(group);
    }
  }
  
  // 處理無成績組別（使用同項次其他組的最慢成績）
  swimGroups.forEach(g => {
    if (g.avgSeconds === fallback) {
      const sameEventGroups = swimGroups.filter(other => 
        other.eventNo === g.eventNo && other.avgSeconds !== fallback
      );
      
      if (sameEventGroups.length > 0) {
        const maxTime = Math.max(...sameEventGroups.map(group => group.avgSeconds));
        g.avgSeconds = maxTime;
      }
    }
  });
  
  // 排序
  swimGroups.sort((a, b) => a.eventNo - b.eventNo || a.heatNum - b.heatNum);
  
  console.log(`新格式解析 - 共產生 ${swimGroups.length} 組比賽`);
  
  return swimGroups;
};
