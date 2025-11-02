export const pad2 = (n: number): string => String(n).padStart(2, '0');

export const fmtHM = (d: Date): string => 
  `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

export const fmtHMS = (d: Date): string => 
  `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;

export const parseMmSs = (str: string): number | null => {
  if (!str) return null;
  const m = String(str).trim().match(/^(\d{1,2}):(\d{2})(?:\.(\d{1,2}))?$/);
  if (!m) return null;
  const min = +m[1], sec = +m[2];
  const cs = m[3] ? +m[3].padEnd(2, '0') : 0;
  return min * 60 + sec + cs / 100;
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