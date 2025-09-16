import { PlayerData } from '@/types/swimming';

export const parsePlayerCSV = (csvContent: string): PlayerData[] => {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const players: PlayerData[] = [];
  
  // 跳過表頭
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const columns = line.split(',');
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
        console.warn('解析CSV行失敗:', line, error);
      }
    }
  }
  
  return players;
};

export const getUniquePlayersFromCSV = (players: PlayerData[]): string[] => {
  const uniqueNames = [...new Set(players.map(p => p.playerName))];
  return uniqueNames.sort((a, b) => a.localeCompare(b, 'zh-TW'));
};