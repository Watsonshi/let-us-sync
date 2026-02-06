import { SwimGroup } from '@/types/swimming';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, ExternalLink, Clock, Wifi, WifiOff } from 'lucide-react';
import { RaceSyncStatus, ScrapeResult } from '@/lib/api/raceSync';
import { formatDistanceToNow } from 'date-fns';
import { zhTW } from 'date-fns/locale';

interface CurrentRaceCardProps {
  currentGroup: SwimGroup | null;
  inspectionGroup: SwimGroup | null;
  // 外部同步相關
  syncStatus?: RaceSyncStatus | null;
  isSyncing?: boolean;
  isPolling?: boolean;
  lastScrapeResult?: ScrapeResult | null;
  onTriggerSync?: () => void;
  onStartPolling?: () => void;
  onStopPolling?: () => void;
  showSyncControls?: boolean;
}

export const CurrentRaceCard = ({
  currentGroup,
  inspectionGroup,
  syncStatus,
  isSyncing = false,
  isPolling = false,
  lastScrapeResult,
  onTriggerSync,
  onStartPolling,
  onStopPolling,
  showSyncControls = false,
}: CurrentRaceCardProps) => {
  const hasExternalSync = syncStatus !== null && syncStatus !== undefined;
  const hasLocalData = currentGroup !== null || inspectionGroup !== null;

  if (!hasExternalSync && !hasLocalData) {
    return null;
  }

  const formatGroupInfo = (group: SwimGroup | null) => {
    if (!group) return '無';
    return `項次 ${group.eventNo} ${group.heatNum}/${group.heatTotal}`;
  };

  const formatLastSyncTime = (lastSyncedAt: string | null | undefined) => {
    if (!lastSyncedAt) return '從未同步';
    try {
      return formatDistanceToNow(new Date(lastSyncedAt), { addSuffix: true, locale: zhTW });
    } catch {
      return '時間格式錯誤';
    }
  };

  // 決定顯示的項次資訊
  // 優先使用外部同步的資料，如果沒有則使用本地推算的資料
  const displayCurrentEventNo = syncStatus?.current_event_no ?? currentGroup?.eventNo ?? null;
  const displayInspectionEventNo = syncStatus?.inspection_event_no ?? inspectionGroup?.eventNo ?? null;

  return (
    <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      {/* 同步狀態標籤 */}
      {hasExternalSync && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {isPolling ? (
              <Badge variant="default" className="gap-1">
                <Wifi className="h-3 w-3" />
                即時同步中
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <WifiOff className="h-3 w-3" />
                同步已暫停
              </Badge>
            )}
            {syncStatus?.last_synced_at && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatLastSyncTime(syncStatus.last_synced_at)}
              </span>
            )}
          </div>
          
          {showSyncControls && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onTriggerSync}
                disabled={isSyncing}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? '同步中...' : '立即同步'}
              </Button>
              {isPolling ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onStopPolling}
                >
                  停止自動同步
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onStartPolling}
                >
                  開始自動同步
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 目前比賽組別 */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-muted-foreground">目前比賽組別</div>
          <div className="text-2xl font-bold text-primary">
            {hasExternalSync && displayCurrentEventNo ? (
              <span>項次 {displayCurrentEventNo}</span>
            ) : (
              formatGroupInfo(currentGroup)
            )}
          </div>
          {hasExternalSync && syncStatus?.raw_current_text ? (
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <ExternalLink className="h-3 w-3" />
              {syncStatus.raw_current_text}
            </div>
          ) : currentGroup ? (
            <div className="text-sm text-muted-foreground">
              {currentGroup.ageGroup} {currentGroup.gender} {currentGroup.eventType}
            </div>
          ) : null}
        </div>

        {/* 準備進入檢錄組別 */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-muted-foreground">準備進入檢錄組別</div>
          <div className="text-2xl font-bold text-primary">
            {hasExternalSync && displayInspectionEventNo ? (
              <span>項次 {displayInspectionEventNo}</span>
            ) : (
              formatGroupInfo(inspectionGroup)
            )}
          </div>
          {hasExternalSync && syncStatus?.raw_inspection_text ? (
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <ExternalLink className="h-3 w-3" />
              {syncStatus.raw_inspection_text}
            </div>
          ) : inspectionGroup ? (
            <div className="text-sm text-muted-foreground">
              {inspectionGroup.ageGroup} {inspectionGroup.gender} {inspectionGroup.eventType}
            </div>
          ) : null}
        </div>
      </div>

      {/* 同步錯誤訊息 */}
      {lastScrapeResult && !lastScrapeResult.success && lastScrapeResult.error && (
        <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-sm text-destructive">
            同步失敗：{lastScrapeResult.error}
          </p>
        </div>
      )}
    </Card>
  );
};
