import { PlayerData } from '@/types/swimming';

// 簡化的 CSV 解析器（處理引號和逗號）
const parseCSVLine = (text: string): string[][] => {
  const rows: string[][] = [];
  let i = 0, field = '', row: string[] = [], inQuote = false;

  while (i < text.length) {
    const c = text[i];
    if (inQuote) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuote = false;
        }
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuote = true;
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

export const parsePlayerCSV = (csvContent: string): PlayerData[] => {
  const rows = parseCSVLine(csvContent);
  const players: PlayerData[] = [];

  // 跳過表頭
  for (let i = 1; i < rows.length; i++) {
    const columns = rows[i];
    if (columns.length >= 5) {
      try {
        // 嘗試解碼中文字符，如果失敗就使用原始內容
        const heat = columns[0]?.trim() || '';
        const ageGroup = columns[1]?.trim() || '';
        const gender = columns[2]?.trim() || '';
        const eventType = columns[3]?.trim() || '';
        const playerName = columns[4]?.trim() || '';
        
        if (playerName && heat && ageGroup && gender && eventType) {
          players.push({
            heat,
            ageGroup,
            gender,
            eventType,
            playerName,
          });
        }
      } catch (error) {
        logger.warn('解析CSV行失敗:', columns, error);
      }
    }
  }
  
  return players;
};

export const getUniquePlayersFromCSV = (players: PlayerData[]): string[] => {
  const uniqueNames = [...new Set(players.map(p => p.playerName))];
  return uniqueNames.sort((a, b) => a.localeCompare(b, 'zh-TW'));
};