
# 外部即時資料抓取與比賽時間聯動計畫

## 1. 網頁分析結果

### 目標網頁結構
**網址：** `https://ctsa.utk.com.tw/CTSA/public/race/running_game.aspx`

從網頁 HTML 分析，可以抓取到兩個關鍵資訊：
- **即時檢錄項目：** `(43)15 ~ 17歲級女子組游泳 200公尺蛙式 計時決賽`
- **即時比賽項目：** `(41)13 & 14歲級女子組游泳 200公尺蛙式 計時決賰`

資料格式特點：
- 項次編號在括號內，如 `(43)` 代表項次 43
- 沒有顯示組次資訊（可能需要額外處理）

---

## 2. 技術可行性評估

| 評估項目 | 結果 | 說明 |
|---------|------|------|
| 網頁結構 | 可抓取 | 標準 ASP.NET 頁面，資料在 `<span>` 元素中 |
| 即時更新 | 需定時輪詢 | 網頁使用 UpdatePanel，需每隔數秒重新抓取 |
| 跨域問題 | 需後端處理 | 瀏覽器安全限制，必須透過 Edge Function |

---

## 3. 系統架構設計

```text
+------------------+     定時輪詢 (5-10秒)     +--------------------+
|   CTSA 官網      | <----------------------> | Edge Function      |
| (比賽協會網站)    |                          | (scrape-race-info) |
+------------------+                          +--------------------+
                                                       |
                                                       | 解析項次編號
                                                       v
                                              +--------------------+
                                              | Supabase 資料庫    |
                                              | race_sync_status   |
                                              | 儲存當前比賽項次    |
                                              +--------------------+
                                                       |
                                                       | Realtime 推播
                                                       v
                                              +--------------------+
                                              | 前端應用程式        |
                                              | 更新 CurrentRaceCard|
                                              | 自動寫入 actualEnd  |
                                              +--------------------+
```

---

## 4. 實作步驟

### 第一步：建立資料表 (Supabase Migration)
建立 `race_sync_status` 資料表，儲存從外部抓取的即時比賽狀態：

| 欄位 | 類型 | 說明 |
|------|------|------|
| id | uuid | 主鍵 |
| current_event_no | integer | 目前比賽項次 |
| inspection_event_no | integer | 目前檢錄項次 |
| raw_current_text | text | 原始比賽文字 |
| raw_inspection_text | text | 原始檢錄文字 |
| last_synced_at | timestamp | 最後同步時間 |
| source_url | text | 資料來源網址 |

### 第二步：建立 Edge Function (抓取資料)
建立 `supabase/functions/scrape-race-info/index.ts`：

功能：
1. 抓取 CTSA 網頁 HTML
2. 使用正則表達式解析項次編號，例如 `\((\d+)\)` 抓取 `(41)` 中的 `41`
3. 將結果寫入 `race_sync_status` 資料表
4. 可選：當項次變更時，自動更新前一項次的 `actual_times`

### 第三步：建立前端 Hook
建立 `src/hooks/useRaceSyncStatus.ts`：

功能：
1. 訂閱 `race_sync_status` 的 Realtime 更新
2. 當外部資料更新時，自動更新 `CurrentRaceCard` 顯示
3. 可選：自動觸發 `saveActualTime()` 更新前一組的實際結束時間

### 第四步：定時觸發機制
有兩種選擇：

**選項 A：前端定時呼叫（簡單）**
- 在前端設定 `setInterval` 每 10 秒呼叫 Edge Function
- 優點：簡單實作，不需要額外服務
- 缺點：只有當有用戶在線時才會同步

**選項 B：使用 Cron Job（進階）**
- 設定 Edge Function 為定時執行（需要外部服務）
- 優點：持續同步，不依賴用戶在線
- 缺點：需要額外設定

---

## 5. 資料對應邏輯

由於外部網頁只顯示項次，不顯示組次，需要特別處理：

```text
外部資料: (41)13 & 14歲級女子組游泳 200公尺蛙式 計時決賽
           ↓
解析結果: event_no = 41
           ↓
對應邏輯: 找到 event_no = 41 的所有組次
          當 event_no 變成 42 時 → 代表 event_no = 41 的所有組次都已完成
           ↓
自動更新: 將 event_no = 41 最後一組的 actual_end 設為當前時間
```

---

## 6. 技術細節

### Edge Function 抓取邏輯

```typescript
// 抓取網頁
const response = await fetch(sourceUrl);
const html = await response.text();

// 解析即時比賽項次
const currentMatch = html.match(/即時比賽項目[\s\S]*?\((\d+)\)/);
const currentEventNo = currentMatch ? parseInt(currentMatch[1]) : null;

// 解析即時檢錄項次
const inspectionMatch = html.match(/即時檢錄項目[\s\S]*?\((\d+)\)/);
const inspectionEventNo = inspectionMatch ? parseInt(inspectionMatch[1]) : null;
```

### 自動更新 actualEnd 邏輯

當偵測到項次變更時（例如從 41 變成 42）：
1. 查詢資料庫中 event_no = 41 的最後一個組次（heatNum 最大的）
2. 如果該組次沒有 actual_end，則設定為當前時間
3. 這樣可以自動記錄每個項次的結束時間

---

## 7. 注意事項與限制

| 項目 | 說明 |
|------|------|
| 組次資訊 | 外部網頁不顯示組次，無法精確對應到每一組 |
| 網頁變動 | 如果 CTSA 網頁結構改變，需要更新解析邏輯 |
| 同步延遲 | 預計有 5-15 秒的延遲（取決於輪詢頻率） |
| 網路問題 | 需要處理抓取失敗的情況 |

---

## 8. 預估影響

### 新增檔案
- `supabase/functions/scrape-race-info/index.ts` - Edge Function
- `src/hooks/useRaceSyncStatus.ts` - 前端同步 Hook
- `src/lib/api/raceSync.ts` - API 呼叫封裝

### 修改檔案
- `src/components/CurrentRaceCard.tsx` - 整合外部資料顯示
- `src/pages/SwimmingSchedule.tsx` - 加入自動同步邏輯

### 資料庫變更
- 新增 `race_sync_status` 資料表
- 新增相關 RLS 政策
