

## 在手機卡片中顯示選手姓名（右半部垂直排列）

### 概念

將目前的「年齡組 / 性別 / 項目」區域改為左右兩欄佈局：
- **左半部**：維持現有的年齡組、性別、項目資訊
- **右半部**：垂直排列顯示該組選手姓名

當篩選了特定參賽單位時，只顯示該單位的選手；未篩選時預設不顯示選手姓名。

### 佈局示意

```text
┌─────────────────────────────────┐
│  左半部              │ 右半部    │
│  👥 年齡組: 國小低年級 │ 王小明   │
│  🧑 性別: 女子組      │ 李小華   │
│  🌊 項目: 50公尺仰式  │ 張小美   │
└─────────────────────────────────┘
```

### 技術方案

**1. `src/pages/SwimmingSchedule.tsx`（1 行）**
- 傳遞 `unitFilter={filters.unitSelect}` prop 給 `<ScheduleTable>`

**2. `src/components/ScheduleTable.tsx`（約 25 行）**
- Props 新增 `unitFilter?: string`
- 將 Event details 區塊（第 131 行附近）從 `space-y-1.5` 改為 `flex gap-4`：
  - 左側 `div`（`flex-1`）：保留現有年齡組、性別、項目的垂直排列
  - 右側 `div`（`flex-1`）：當 `unitFilter` 不為 `'all'` 且有值時，從 `group.playerData` 篩選出 `unit === unitFilter` 的選手，垂直排列顯示姓名
- 右側選手名單使用小字體 `text-sm`，搭配 `text-muted-foreground` 保持視覺層次

### 改動範圍
- `src/pages/SwimmingSchedule.tsx`：1 行
- `src/components/ScheduleTable.tsx`：約 25 行

