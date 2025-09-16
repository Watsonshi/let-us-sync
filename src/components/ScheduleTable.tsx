import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SwimGroup } from '@/types/swimming';
import { fmtHM, mmss } from '@/utils/timeUtils';
import { Clock, Trophy, Users, Target } from 'lucide-react';

interface ScheduleTableProps {
  groups: SwimGroup[];
  onActualEndChange: (groupIndex: number, time: string) => void;
}

export const ScheduleTable = ({ groups, onActualEndChange }: ScheduleTableProps) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const isCurrentEvent = (group: SwimGroup): boolean => {
    if (!group.scheduledStart || !group.scheduledEnd) return false;
    const start = group.actualStart ?? group.scheduledStart;
    const end = group.actualEnd ?? group.scheduledEnd;
    return currentTime >= start && currentTime < end;
  };

  const renderDayHeader = (dayLabel: string) => (
    <tr key={`header-${dayLabel}`}>
      <td colSpan={9} className="bg-gradient-primary text-primary-foreground font-bold px-4 py-3 text-center">
        <div className="flex items-center justify-center gap-2">
          <Trophy className="w-5 h-5" />
          {dayLabel}
        </div>
      </td>
    </tr>
  );


  let currentDay = '';
  
  return (
    <Card className="overflow-hidden shadow-custom-lg">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <tbody className="text-sm divide-y divide-border">
          {groups.map((group, index) => {
            const rows = [];
            
            // 添加天數標題
            if (group.dayLabel && group.dayLabel !== currentDay) {
              currentDay = group.dayLabel;
              rows.push(renderDayHeader(currentDay));
              rows.push(
                <tr key={`subheader-${currentDay}`} className="bg-secondary text-secondary-foreground text-sm font-medium">
                  <td className="px-4 py-2 border-r border-border">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      項次
                    </div>
                  </td>
                  <td className="px-4 py-2 border-r border-border">組次</td>
                  <td className="px-4 py-2 border-r border-border">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      年齡組
                    </div>
                  </td>
                  <td className="px-4 py-2 border-r border-border">性別</td>
                  <td className="px-4 py-2 border-r border-border">比賽項目</td>
                  <td className="px-4 py-2 border-r border-border">平均成績</td>
                  <td className="px-4 py-2 border-r border-border">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      預估開始
                    </div>
                  </td>
                  <td className="px-4 py-2 border-r border-border">預估結束</td>
                  <td className="px-4 py-2">實際結束</td>
                </tr>
              );
            }

              // 添加數據行
              const isCurrent = isCurrentEvent(group);
              rows.push(
                <tr 
                  key={`${group.eventNo}-${group.heatNum}-${group.heatTotal}`}
                  className={`
                    hover:bg-accent/50 transition-colors duration-200
                    ${isCurrent ? 'bg-gradient-highlight shadow-custom-glow border-l-4 border-l-warning' : ''}
                  `}
                >
                  <td className="px-4 py-3 font-semibold text-primary border-r border-border">
                    {group.eventNo}
                  </td>
                  <td className="px-4 py-3 border-r border-border">
                    <span className="bg-secondary px-2 py-1 rounded-full text-xs font-medium">
                      {group.heatNum}/{group.heatTotal}
                    </span>
                  </td>
                  <td className="px-4 py-3 border-r border-border">{group.ageGroup || '-'}</td>
                  <td className="px-4 py-3 border-r border-border">
                    <span className={`
                      px-2 py-1 rounded-full text-xs font-medium
                      ${group.gender === '男' ? 'bg-blue-100 text-blue-700' : 
                        group.gender === '女' ? 'bg-pink-100 text-pink-700' : 
                        'bg-gray-100 text-gray-700'}
                    `}>
                      {group.gender || '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3 border-r border-border font-medium">{group.eventType || '-'}</td>
                  <td className="px-4 py-3 font-mono text-info border-r border-border">
                    {mmss(group.avgSeconds)}
                  </td>
                  <td className="px-4 py-3 font-mono border-r border-border">
                    {group.scheduledStart ? fmtHM(group.scheduledStart) : '-'}
                  </td>
                  <td className="px-4 py-3 font-mono border-r border-border">
                    {group.scheduledEnd ? fmtHM(group.scheduledEnd) : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <Input
                      type="time"
                      className="w-28 h-8 text-sm"
                      value={group.actualEnd ? fmtHM(group.actualEnd) : ''}
                      onChange={(e) => onActualEndChange(index, e.target.value)}
                    />
                  </td>
                </tr>
              );

              return rows;
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
};