export interface SwimGroup {
  eventNo: number;
  heatNum: number;
  heatTotal: number;
  ageGroup: string;
  gender: string;
  eventType: string;
  times: number[];
  avgSeconds: number;
  dayKey: string;
  dayLabel: string;
  actualStart?: Date;
  actualEnd?: Date;
  scheduledStart?: Date;
  scheduledEnd?: Date;
  playerNames?: string[]; // 新增：該組的選手姓名列表
}

export interface DayRule {
  key: string;
  label: string;
  start: number;
  end: number;
}

export interface FilterOptions {
  daySelect: string;
  ageGroupSelect: string;
  genderSelect: string;
  eventTypeSelect: string;
  playerSelect: string; // 選手名單篩選
  playerSearch: string; // 選手名稱搜尋
}

export interface PlayerData {
  heat: string;
  ageGroup: string;
  gender: string;
  eventType: string;
  playerName: string;
}

export interface ScheduleConfig {
  turnover: number;
  lunchStart: string;
  lunchEnd: string;
  fallback: string;
}