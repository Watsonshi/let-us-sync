export const pad2 = (n: number): string => String(n).padStart(2, '0');

export const fmtHM = (d: Date): string => 
  `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

export const fmtHMS = (d: Date): string => 
  `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;

export const parseMmSs = (str: string): number | null => {
  if (!str) return null;
  const s = String(str).trim();
  
  // 標準格式 mm:ss 或 mm:ss.cc
  const m = s.match(/^(\d{1,2}):(\d{2})(?:\.(\d{1,2}))?$/);
  if (m) {
    const min = +m[1], sec = +m[2];
    const cs = m[3] ? +m[3].padEnd(2, '0') : 0;
    return min * 60 + sec + cs / 100;
  }
  
  // Excel 時間序列值（小數，代表一天的比例）
  // 例如 0.001504... = 130 秒 = 2:10
  const num = parseFloat(s);
  if (!isNaN(num) && num > 0 && num < 1) {
    const totalSeconds = num * 86400;
    if (totalSeconds > 0 && totalSeconds <= 1800) {
      return Math.round(totalSeconds * 100) / 100;
    }
  }
  
  // 純數字格式 "0210" → 2分10秒（格式 mmss.f）
  const mmssMatch = s.match(/^0?(\d{1,2})(\d{2})(?:\.(\d{1,2}))?$/);
  if (mmssMatch && s.length >= 3) {
    const min = +mmssMatch[1], sec = +mmssMatch[2];
    const cs = mmssMatch[3] ? +mmssMatch[3].padEnd(2, '0') : 0;
    if (sec < 60) {
      return min * 60 + sec + cs / 100;
    }
  }
  
  return null;
};

export const parseTimeInputToDate = (base: Date, hhmm: string): Date => {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(base);
  d.setHours(h, m, 0, 0);
  return d;
};

export const addSeconds = (d: Date, s: number): Date => {
  const nd = new Date(d);
  nd.setSeconds(nd.getSeconds() + s);
  return nd;
};

export const mmss = (s: number): string => {
  if (s == null || isNaN(s)) return '';
  const mm = Math.floor(s / 60);
  const ss = (s - mm * 60).toFixed(2).padStart(5, '0');
  return `${pad2(mm)}:${ss}`;
};