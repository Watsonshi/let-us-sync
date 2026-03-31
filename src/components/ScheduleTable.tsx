import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SwimGroup } from '@/types/swimming';
import { fmtHM, mmss } from '@/utils/timeUtils';
import { findCurrentEventIndex } from '@/utils/currentEventDetection';
import { Clock, Trophy, Users, Target, Hash, Timer, ChevronUp, Lock, UserRound, Waves } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/hooks/useAuth';

interface ScheduleTableProps {
  groups: SwimGroup[];
  onActualEndChange: (groupIndex: number, time: string) => void;
  unitFilter?: string;
}

export const ScheduleTable = ({ groups, onActualEndChange }: ScheduleTableProps) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showBackToTop, setShowBackToTop] = useState(false);
  const isMobile = useIsMobile();
  const { isAdmin } = useAuth();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 300);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const currentEventIndex = findCurrentEventIndex(groups, currentTime);
  const isCurrentEvent = (index: number) => index === currentEventIndex;

  // 為項次交替計算背景色
  const eventBgClass = (eventNo: number, isCurrent: boolean) => {
    if (isCurrent) return '';
    return eventNo % 2 === 0 ? 'bg-muted/30' : '';
  };

  // Mobile card view
  const renderMobileView = () => {
    let currentDay = '';
    const sections: JSX.Element[] = [];
    let currentDayGroups: SwimGroup[] = [];
    let currentDayIndices: number[] = [];

    groups.forEach((group, index) => {
      if (group.dayLabel && group.dayLabel !== currentDay) {
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

    if (currentDayGroups.length > 0) {
      sections.push(renderMobileDaySection(currentDay, currentDayGroups, currentDayIndices));
    }

    return <div className="space-y-4">{sections}</div>;
  };

  const renderMobileDaySection = (dayLabel: string, dayGroups: SwimGroup[], indices: number[]) => {
    // 按項次分組
    const eventGroups: { eventNo: number; items: { group: SwimGroup; idx: number }[] }[] = [];
    let lastEventNo = -1;

    dayGroups.forEach((group, i) => {
      if (group.eventNo !== lastEventNo) {
        eventGroups.push({ eventNo: group.eventNo, items: [] });
        lastEventNo = group.eventNo;
      }
      eventGroups[eventGroups.length - 1].items.push({ group, idx: indices[i] });
    });

    return (
      <div key={dayLabel} className="space-y-3">
        {/* Day Header */}
        <div className="bg-gradient-primary text-primary-foreground rounded-lg px-4 py-3">
          <div className="flex items-center justify-center gap-2">
            <Trophy className="w-5 h-5" />
            <h2 className="font-bold text-lg">{dayLabel}</h2>
          </div>
        </div>

        {/* Event Groups */}
        {eventGroups.map((eg, egIdx) => (
          <div key={eg.eventNo} className="space-y-2">
            {/* 項次標題行 */}
            <div className="flex items-center gap-2 px-2 pt-2">
              <div className="h-px flex-1 bg-border" />
              <span className="text-sm font-semibold text-muted-foreground px-2">
                項次 {eg.eventNo} — {eg.items[0]?.group.ageGroup} {eg.items[0]?.group.gender} {eg.items[0]?.group.eventType}
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {eg.items.map(({ group, idx }) => {
              const isCurrent = isCurrentEvent(idx);
              return (
                <Card key={`${group.eventNo}-${group.heatNum}-${group.heatTotal}`}
                      className={`transition-all duration-200 ${isCurrent ? 'border-warning shadow-custom-glow bg-gradient-highlight ring-2 ring-warning/30' : eventBgClass(eg.eventNo, false)}`}>
                  <CardContent className="p-4 space-y-3">
                    {/* Top row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Hash className="w-4 h-4 text-primary" />
                        <span className="font-semibold text-primary text-lg">{group.eventNo}</span>
                        {isCurrent && (
                          <span className="text-xs bg-warning/20 text-warning px-2 py-0.5 rounded-full font-medium animate-pulse">
                            進行中
                          </span>
                        )}
                      </div>
                      <span className="bg-secondary text-secondary-foreground px-2 py-1 rounded-full text-xs font-medium">
                        {group.heatNum}/{group.heatTotal}
                      </span>
                    </div>

                    {/* Event details */}
                    <div className="space-y-1.5 text-base">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">年齡組:</span>
                        <span className="font-medium">{group.ageGroup || '-'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <UserRound className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">性別:</span>
                        <span className={`px-2 py-0.5 rounded-full text-sm font-medium
                          ${group.gender === '男' ? 'bg-primary/10 text-primary' : 
                            group.gender === '女' ? 'bg-destructive/10 text-destructive' : 
                            'bg-muted text-muted-foreground'}`}>
                          {group.gender || '-'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Waves className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">項目:</span>
                        <span className="font-medium">{group.eventType || '-'}</span>
                      </div>
                    </div>

                    {/* Times */}
                    <div className="grid grid-cols-2 gap-3 text-base border-t border-border pt-3">
                      <div className="text-center min-w-0">
                        <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm">預估開始</span>
                        </div>
                        <div className="font-mono text-base">{group.scheduledStart ? fmtHM(group.scheduledStart) : '-'}</div>
                      </div>
                      <div className="text-center min-w-0">
                        <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                          <Timer className="w-4 h-4" />
                          <span className="text-sm">預估結束</span>
                        </div>
                        <div className="font-mono text-base">{group.scheduledEnd ? fmtHM(group.scheduledEnd) : '-'}</div>
                      </div>
                      <div className="text-center min-w-0">
                        <div className="text-sm text-muted-foreground mb-1">預估完賽</div>
                        <div className="font-mono text-info font-medium text-base">{mmss(group.avgSeconds)}</div>
                      </div>
                      <div className="text-center col-span-2 min-w-0 flex flex-col items-center">
                        <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                          實際結束
                          {!isAdmin && <Lock className="w-3.5 h-3.5" />}
                        </div>
                        {isAdmin ? (
                          <Input
                            type="time"
                            className="max-w-[180px] w-full min-w-0 h-10 text-base text-center px-2"
                            value={group.actualEnd ? fmtHM(group.actualEnd) : ''}
                            onChange={(e) => onActualEndChange(idx, e.target.value)}
                          />
                        ) : (
                          <div className="font-mono text-base h-10 flex items-center justify-center text-muted-foreground">
                            {group.actualEnd ? fmtHM(group.actualEnd) : '-'}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  // Desktop table view
  const renderDesktopView = () => {
    let currentDay = '';
    let lastEventNo = -1;

    return (
      <Card className="overflow-hidden shadow-custom-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <tbody className="text-sm">
            {groups.map((group, index) => {
              const rows = [];

              // Day header
              if (group.dayLabel && group.dayLabel !== currentDay) {
                currentDay = group.dayLabel;
                lastEventNo = -1;
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
                  <tr key={`subheader-${currentDay}`} className="bg-secondary text-secondary-foreground text-xs font-semibold uppercase tracking-wider">
                    <td className="px-4 py-2.5 border-r border-border/50">
                      <div className="flex items-center gap-1.5">
                        <Target className="w-3.5 h-3.5" />
                        項次
                      </div>
                    </td>
                    <td className="px-4 py-2.5 border-r border-border/50">組次</td>
                    <td className="px-4 py-2.5 border-r border-border/50">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        年齡組
                      </div>
                    </td>
                    <td className="px-4 py-2.5 border-r border-border/50">性別</td>
                    <td className="px-4 py-2.5 border-r border-border/50">比賽項目</td>
                    <td className="px-4 py-2.5 border-r border-border/50">預估完賽</td>
                    <td className="px-4 py-2.5 border-r border-border/50">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        預估開始
                      </div>
                    </td>
                    <td className="px-4 py-2.5 border-r border-border/50">預估結束</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1">
                        實際結束
                        {!isAdmin && <Lock className="w-3 h-3" />}
                      </div>
                    </td>
                  </tr>
                );
              }

              // 項次分隔標題行
              if (group.eventNo !== lastEventNo) {
                const isNewEvent = lastEventNo !== -1;
                lastEventNo = group.eventNo;
                if (isNewEvent) {
                  rows.push(
                    <tr key={`event-sep-${group.eventNo}`}>
                      <td colSpan={9} className="h-1 bg-border/60" />
                    </tr>
                  );
                }
              }

              const isCurrent = isCurrentEvent(index);
              rows.push(
                <tr
                  key={`${group.eventNo}-${group.heatNum}-${group.heatTotal}`}
                  className={`
                    transition-colors duration-200
                    ${isCurrent 
                      ? 'bg-gradient-highlight shadow-custom-glow border-l-4 border-l-warning' 
                      : `hover:bg-accent/50 ${eventBgClass(group.eventNo, false)}`}
                  `}
                >
                  <td className="px-4 py-2.5 font-semibold text-primary border-r border-border/30">
                    {group.eventNo}
                  </td>
                  <td className="px-4 py-2.5 border-r border-border/30">
                    <span className="bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full text-xs font-medium">
                      {group.heatNum}/{group.heatTotal}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 border-r border-border/30">{group.ageGroup || '-'}</td>
                  <td className="px-4 py-2.5 border-r border-border/30">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium
                      ${group.gender === '男' ? 'bg-primary/10 text-primary' : 
                        group.gender === '女' ? 'bg-destructive/10 text-destructive' : 
                        'bg-muted text-muted-foreground'}`}>
                      {group.gender || '-'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 border-r border-border/30 font-medium">{group.eventType || '-'}</td>
                  <td className="px-4 py-2.5 font-mono text-info border-r border-border/30">{mmss(group.avgSeconds)}</td>
                  <td className="px-4 py-2.5 font-mono border-r border-border/30">
                    {group.scheduledStart ? fmtHM(group.scheduledStart) : '-'}
                  </td>
                  <td className="px-4 py-2.5 font-mono border-r border-border/30">
                    {group.scheduledEnd ? fmtHM(group.scheduledEnd) : '-'}
                  </td>
                  <td className="px-4 py-2.5">
                    {isAdmin ? (
                      <Input
                        type="time"
                        className="w-28 h-8 text-sm"
                        value={group.actualEnd ? fmtHM(group.actualEnd) : ''}
                        onChange={(e) => onActualEndChange(index, e.target.value)}
                      />
                    ) : (
                      <span className="font-mono text-muted-foreground">
                        {group.actualEnd ? fmtHM(group.actualEnd) : '-'}
                      </span>
                    )}
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
