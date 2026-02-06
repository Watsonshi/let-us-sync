
# 實作計畫：管理者時間變更即時同步給所有使用者

## 目標
當管理者修改「實際結束時間」時，變更會即時同步顯示在所有使用者的頁面上。

## 目前狀況分析
- **現有儲存方式**：實際結束時間儲存在瀏覽器的 localStorage
- **問題**：每個使用者的瀏覽器各自獨立，管理者的變更無法傳達給其他人
- **現有權限**：已有管理員角色系統（user_roles 表 + has_role 函數）

## 解決方案：資料庫 + 即時同步

將實際結束時間從 localStorage 遷移到資料庫，並使用 Supabase Realtime 功能讓所有連線的使用者即時收到更新。

```text
┌─────────────┐     更新時間      ┌──────────────┐
│   管理者    │ ───────────────> │   資料庫     │
└─────────────┘                  │ actual_times │
                                 └──────┬───────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    │ Realtime 推播     │                   │
                    ▼                   ▼                   ▼
              ┌──────────┐        ┌──────────┐        ┌──────────┐
              │ 使用者 A │        │ 使用者 B │        │ 使用者 C │
              └──────────┘        └──────────┘        └──────────┘
```

---

## 實作步驟

### 步驟 1：建立資料庫表格

建立新表格 `actual_times` 來儲存實際結束時間：

| 欄位 | 類型 | 說明 |
|------|------|------|
| id | UUID | 主鍵 |
| event_no | INTEGER | 項次 |
| heat_num | INTEGER | 組次 |
| actual_end | TIMESTAMPTZ | 實際結束時間 |
| updated_by | UUID | 最後更新者 |
| created_at | TIMESTAMPTZ | 建立時間 |
| updated_at | TIMESTAMPTZ | 更新時間 |

**權限設定**：
- 所有人可讀取（SELECT）
- 僅管理員可寫入（INSERT/UPDATE/DELETE）

**即時同步**：啟用 Realtime 功能

### 步驟 2：更新前端程式碼

1. **建立新的同步工具** (`src/utils/actualTimeSync.ts`)
   - 提供 `saveActualTimeToDb`、`removeActualTimeFromDb`、`loadAllActualTimesFromDb` 函數
   - 取代原本的 localStorage 操作

2. **建立 Realtime Hook** (`src/hooks/useActualTimeSync.ts`)
   - 訂閱 `actual_times` 表的變更
   - 當資料變更時自動更新本地狀態

3. **修改 SwimmingSchedule.tsx**
   - 改用資料庫同步方式載入和儲存實際結束時間
   - 整合 Realtime 訂閱，即時接收更新
   - 非管理員時，輸入欄位設為唯讀

4. **清理舊程式碼**
   - 移除或保留 localStorage 作為離線備援（可選）

### 步驟 3：權限控制

- 非管理員使用者看到的「實際結束」欄位為**唯讀**
- 只有管理員可以修改時間
- 資料庫層面透過 RLS 確保安全

---

## 技術細節

### 資料庫 Migration SQL

```sql
-- 建立實際結束時間表
CREATE TABLE public.actual_times (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_no INTEGER NOT NULL,
  heat_num INTEGER NOT NULL,
  actual_end TIMESTAMPTZ NOT NULL,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (event_no, heat_num)
);

-- 啟用 RLS
ALTER TABLE public.actual_times ENABLE ROW LEVEL SECURITY;

-- 所有人可讀取
CREATE POLICY "Anyone can view actual times"
  ON public.actual_times FOR SELECT USING (true);

-- 僅管理員可寫入
CREATE POLICY "Only admins can insert actual times"
  ON public.actual_times FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update actual times"
  ON public.actual_times FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete actual times"
  ON public.actual_times FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- 啟用 Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.actual_times;
```

### Realtime 訂閱範例

```typescript
const channel = supabase
  .channel('actual-times-changes')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'actual_times' },
    (payload) => {
      // 根據事件類型更新本地狀態
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        // 更新對應組別的 actualEnd
      } else if (payload.eventType === 'DELETE') {
        // 移除對應組別的 actualEnd
      }
    }
  )
  .subscribe();
```

---

## 預期成果

1. 管理者修改實際結束時間後，所有正在瀏覽的使用者會**即時**看到更新
2. 時間資料持久保存在資料庫，重新整理頁面也不會遺失
3. 非管理員無法修改時間，確保資料一致性
4. 保持向後兼容，可選擇性遷移現有 localStorage 資料

---

## 需要修改的檔案

| 檔案 | 動作 |
|------|------|
| `supabase/migrations/` | 新增：建立 actual_times 表 |
| `src/utils/actualTimeSync.ts` | 新增：資料庫同步工具函數 |
| `src/hooks/useActualTimeSync.ts` | 新增：Realtime 訂閱 Hook |
| `src/pages/SwimmingSchedule.tsx` | 修改：整合資料庫同步邏輯 |
| `src/components/ScheduleTable.tsx` | 修改：非管理員時欄位唯讀 |
| `src/integrations/supabase/types.ts` | 自動更新：新表類型定義 |
