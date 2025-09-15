import { useState, useEffect } from 'react';
import { fmtHMS } from '@/utils/timeUtils';

export const CurrentTime = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="text-right">
      <div className="text-sm text-muted-foreground mb-1">現在時間</div>
      <div className="font-mono text-xl font-semibold text-primary animate-pulse">
        {fmtHMS(currentTime)}
      </div>
    </div>
  );
};