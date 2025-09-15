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

export const moveOutOfLunch = (d: Date, Ls: Date, Le: Date): Date => 
  (d >= Ls && d < Le) ? new Date(Le) : d;

export const addSecondsSkippingLunch = (
  start: Date,
  secs: number,
  Ls: Date,
  Le: Date
): Date => {
  let s = moveOutOfLunch(new Date(start), Ls, Le);
  let e = addSeconds(s, secs);
  
  if (s < Ls && e > Ls) {
    const before = (Ls.getTime() - s.getTime()) / 1000;
    const remain = secs - before;
    e = addSeconds(Le, remain);
  } else if (s >= Ls && s < Le) {
    e = addSeconds(Le, secs);
  }
  
  return e;
};

export const advanceCursor = (prevEnd: Date, turnover: number, Ls: Date, Le: Date): Date =>
  moveOutOfLunch(addSeconds(prevEnd, turnover), Ls, Le);

export const mmss = (s: number): string => {
  if (s == null || isNaN(s)) return '';
  const mm = Math.floor(s / 60);
  const ss = (s - mm * 60).toFixed(2).padStart(5, '0');
  return `${pad2(mm)}:${ss}`;
};