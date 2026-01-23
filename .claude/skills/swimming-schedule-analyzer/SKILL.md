---
name: swimming-schedule-analyzer
description: Analyzes swimming competition schedule data, validates time calculations, and checks for data consistency issues
user-invocable: true
argument-hint: "[excel-file-path]"
allowed-tools:
  - Read
  - Bash
  - Grep
---

# Swimming Schedule Analyzer

專為游泳比賽賽程系統設計的分析工具。

## 功能

1. **驗證時間計算邏輯**
   - 檢查午休跳過是否正確
   - 驗證 turnover time 計算
   - 確認跨天邊界處理

2. **資料一致性檢查**
   - 組次編號連續性（1/5, 2/5, 3/5...）
   - 項次範圍與天數對應
   - 選手資料完整性

3. **效能分析**
   - 找出可能的效能瓶頸
   - 建議優化點

4. **自動生成測試資料**
   - 生成邊界條件測試案例
   - 產生壓力測試資料

## 使用方式

```bash
# 分析整個賽程系統
/swimming-schedule-analyzer

# 驗證特定 Excel 檔案
/swimming-schedule-analyzer public/schedule-data.xlsx
```

## 檢查項目

- ✅ 時間計算正確性（含午休）
- ✅ 空值安全處理
- ✅ 天數定義完整性（d1, d2, d3）
- ✅ CSV 解析正確性
- ✅ Math.max 空陣列處理
- ✅ React 效能優化機會
