import { SwimGroup } from '@/types/swimming';
import { Card } from '@/components/ui/card';

interface CurrentRaceCardProps {
  currentGroup: SwimGroup | null;
  inspectionGroup: SwimGroup | null;
}

export const CurrentRaceCard = ({ currentGroup, inspectionGroup }: CurrentRaceCardProps) => {
  if (!currentGroup && !inspectionGroup) {
    return null;
  }

  const formatGroupInfo = (group: SwimGroup | null) => {
    if (!group) return '無';
    return `項次 ${group.eventNo} ${group.heatNum}/${group.heatTotal}`;
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <div className="text-sm font-medium text-muted-foreground">目前比賽組別</div>
          <div className="text-2xl font-bold text-primary">
            {formatGroupInfo(currentGroup)}
          </div>
          {currentGroup && (
            <div className="text-sm text-muted-foreground">
              {currentGroup.ageGroup} {currentGroup.gender} {currentGroup.eventType}
            </div>
          )}
        </div>
        <div className="space-y-2">
          <div className="text-sm font-medium text-muted-foreground">準備進入檢錄組別</div>
          <div className="text-2xl font-bold text-primary">
            {formatGroupInfo(inspectionGroup)}
          </div>
          {inspectionGroup && (
            <div className="text-sm text-muted-foreground">
              {inspectionGroup.ageGroup} {inspectionGroup.gender} {inspectionGroup.eventType}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
