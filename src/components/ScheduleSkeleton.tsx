import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/use-mobile';

export const ScheduleSkeleton = () => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="space-y-4">
        {/* Day header skeleton */}
        <Skeleton className="h-12 w-full rounded-lg" />
        {/* Card skeletons */}
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-12 rounded-full" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-4 w-32" />
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <Card className="overflow-hidden shadow-custom-lg">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <tbody>
            {/* Header skeleton */}
            <tr>
              <td colSpan={9}>
                <Skeleton className="h-12 w-full" />
              </td>
            </tr>
            <tr>
              <td colSpan={9}>
                <Skeleton className="h-10 w-full" />
              </td>
            </tr>
            {/* Row skeletons */}
            {Array.from({ length: 8 }).map((_, i) => (
              <tr key={i} className="border-b border-border">
                {Array.from({ length: 9 }).map((_, j) => (
                  <td key={j} className="px-4 py-3">
                    <Skeleton className="h-5 w-full" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
