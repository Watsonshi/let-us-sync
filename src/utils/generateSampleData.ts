// 這個檔案用來從 Excel 檔案生成完整的 sample-data.json
import { parseExcelFile } from './excelUtils';

export const generateSampleDataFromExcel = async () => {
  try {
    // 載入原始 Excel 檔案
    const response = await fetch('/解析結果.xlsx');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const blob = await response.blob();
    const file = new File([blob], '解析結果.xlsx');
    
    // 解析 Excel 檔案
    const groups = await parseExcelFile(file, 360);
    
    // 轉換回原始資料格式
    const rawData: any[] = [];
    
    groups.forEach(group => {
      // 每個組別可能有多個參賽者，我們需要重建原始資料結構
      const participantCount = Math.max(group.times?.length || 1, 1);
      
      for (let i = 0; i < participantCount; i++) {
        rawData.push({
          "項次": group.eventNo,
          "組次": `${group.heatNum}/${group.heatTotal}`,
          "年齡組": group.ageGroup,
          "性別": group.gender,
          "比賽項目": group.eventType,
          "姓名": `參賽者${group.eventNo}-${group.heatNum}-${i + 1}`,
          "單位": `單位${i + 1}`,
          "報名成績": group.times && group.times[i] ? 
            `${Math.floor(group.times[i] / 60).toString().padStart(2, '0')}:${(group.times[i] % 60).toFixed(2).padStart(5, '0')}` : 
            ""
        });
      }
    });
    
    console.log('生成的資料筆數:', rawData.length);
    console.log('項次範圍:', Math.min(...rawData.map(d => d.項次)), '-', Math.max(...rawData.map(d => d.項次)));
    
    return rawData;
  } catch (error) {
    console.error('生成範例資料失敗:', error);
    throw error;
  }
};