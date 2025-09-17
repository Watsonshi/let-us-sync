import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SwimGroup } from '@/types/swimming';
import { fmtHM, mmss } from '@/utils/timeUtils';
import { Clock, Trophy, Users, Target, Hash, Timer, ChevronUp } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface ScheduleTableProps {
  groups: SwimGroup[];
  onActualEndChange: (groupIndex: number, time: string) => void;
}

export const ScheduleTable = ({ groups, onActualEndChange }: ScheduleTableProps) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showBackToTop, setShowBackToTop] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isCurrentEvent = (group: SwimGroup): boolean => {
    if (!group.scheduledStart || !group.scheduledEnd) return false;
    const start = group.actualStart ?? group.scheduledStart;
    const end = group.actualEnd ?? group.scheduledEnd;
    return currentTime >= start && currentTime < end;
  };

  // Mobile card view
  const renderMobileView = () => {
    let currentDay = '';
    const sections: JSX.Element[] = [];
    let currentDayGroups: SwimGroup[] = [];
    let currentDayIndices: number[] = [];

    groups.forEach((group, index) => {
      if (group.dayLabel && group.dayLabel !== currentDay) {
        // Process previous day if exists
        if (currentDayGroups.length > 0) {
          sections.push(renderMobileDaySection(currentDay, currentDayGroups, currentDayIndices));
        }
        
        currentDay = group.dayLabel;
        currentDayGroups = [group];
        currentDayIndices = [index];
      } else {
        currentDayGroups.push(group);
        currentDayIndices.push(index);
      }
    });

    // Process last day
    if (currentDayGroups.length > 0) {
      sections.push(renderMobileDaySection(currentDay, currentDayGroups, currentDayIndices));
    }

    return <div className="space-y-6">{sections}</div>;
  };

  const renderMobileDaySection = (dayLabel: string, dayGroups: SwimGroup[], indices: number[]) => (
    <div key={dayLabel} className="space-y-4">
      {/* Day Header */}
      <div className="bg-gradient-primary text-primary-foreground rounded-lg px-4 py-3">
        <div className="flex items-center justify-center gap-2">
          <Trophy className="w-5 h-5" />
          <h2 className="font-bold text-lg">{dayLabel}</h2>
        </div>
      </div>

      {/* Event Cards */}
      <div className="space-y-3">
        {dayGroups.map((group, idx) => {
          const originalIndex = indices[idx];
          const isCurrent = isCurrentEvent(group);
          
          return (
            <Card key={`${group.eventNo}-${group.heatNum}-${group.heatTotal}`} 
                  className={`${isCurrent ? 'border-warning shadow-custom-glow bg-gradient-highlight' : ''}`}>
              <CardContent className="p-4 space-y-3">
                {/* Top row: Event number and heat */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4 text-muted-foreground" />
                    <span className="font-semibold text-primary text-lg">{group.eventNo}</span>
                  </div>
                  <span className="bg-secondary px-2 py-1 rounded-full text-xs font-medium">
                    {group.heatNum}/{group.heatTotal}
                  </span>
                </div>

                {/* Event details */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">年齡組:</span>
                    <span className="font-medium">{group.ageGroup || '-'}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">性別:</span>
                    <span className={`
                      px-2 py-1 rounded-full text-xs font-medium
                      ${group.gender === '男' ? 'bg-blue-100 text-blue-700' : 
                        group.gender === '女' ? 'bg-pink-100 text-pink-700' : 
                        'bg-gray-100 text-gray-700'}
                    `}>
                      {group.gender || '-'}
                    </span>
                  </div>
                </div>

                {/* Event type */}
                <div className="text-sm">
                  <span className="text-muted-foreground">比賽項目:</span>
                  <span className="font-medium ml-2">{group.eventType || '-'}</span>
                </div>

                {/* Times section */}
                <div className="grid grid-cols-3 gap-3 text-sm border-t pt-3">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                      <Clock className="w-3 h-3" />
                      <span className="text-xs">預估開始</span>
                    </div>
                    <div className="font-mono text-sm">
                      {group.scheduledStart ? fmtHM(group.scheduledStart) : '-'}
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                      <Timer className="w-3 h-3" />
                      <span className="text-xs">預估結束</span>
                    </div>
                    <div className="font-mono text-sm">
                      {group.scheduledEnd ? fmtHM(group.scheduledEnd) : '-'}
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="text-xs text-muted-foreground mb-1">實際結束</div>
                    <Input
                      type="time"
                      className="w-full h-8 text-xs text-center"
                      value={group.actualEnd ? fmtHM(group.actualEnd) : ''}
                      onChange={(e) => onActualEndChange(originalIndex, e.target.value)}
                    />
                  </div>
                </div>

                {/* Average time */}
                <div className="flex items-center justify-center gap-2 text-sm border-t pt-3">
                  <span className="text-muted-foreground">平均成績:</span>
                  <span className="font-mono text-info font-medium">{mmss(group.avgSeconds)}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );

  // Desktop table view (original)
  const renderDesktopView = () => {
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
                rows.push(
                  <tr key={`header-${currentDay}`}>
                    <td colSpan={9} className="bg-gradient-primary text-primary-foreground font-bold px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Trophy className="w-5 h-5" />
                        {currentDay}
                      </div>
                    </td>
                  </tr>
                );
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

  return (
    <div className="relative">
      {isMobile ? renderMobileView() : renderDesktopView()}
      
      {/* 回到頂端按鈕 - 僅在手機版顯示 */}
      {isMobile && showBackToTop && (
        <Button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-50 rounded-full w-12 h-12 shadow-lg"
          size="icon"
        >
          <ChevronUp className="w-5 h-5" />
        </Button>
      )}
    </div>
  );
};