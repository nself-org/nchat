import { cn } from "@/lib/utils";
import { Skeleton, LineSkeleton } from "@/components/loading/skeleton";
import { UserRowSkeleton } from "@/components/loading/user-skeleton";

/**
 * Admin page loading skeleton
 * Shows admin navigation and dashboard content
 */
export default function AdminLoading() {
  return (
    <div className="flex h-screen bg-background">
      {/* Admin sidebar */}
      <AdminSidebarSkeleton />

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <AdminDashboardSkeleton />
      </div>
    </div>
  );
}

/**
 * Admin sidebar navigation skeleton
 */
function AdminSidebarSkeleton() {
  return (
    <div className="w-64 border-r bg-zinc-50 p-4 dark:bg-zinc-900/50">
      {/* Logo */}
      <div className="mb-6 flex items-center gap-2">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <LineSkeleton width={80} height={18} />
      </div>

      {/* Nav items */}
      <div className="space-y-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2",
              i === 0 && "bg-muted",
            )}
          >
            <Skeleton className="h-4 w-4 rounded" />
            <LineSkeleton width={80 + Math.random() * 40} height={14} />
          </div>
        ))}
      </div>

      {/* Bottom section */}
      <div className="absolute bottom-4 left-4 right-4">
        <div className="flex items-center gap-2 px-3 py-2">
          <Skeleton className="h-4 w-4 rounded" />
          <LineSkeleton width={60} height={14} />
        </div>
      </div>
    </div>
  );
}

/**
 * Admin dashboard content skeleton
 */
function AdminDashboardSkeleton() {
  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <LineSkeleton width={150} height={28} className="mb-2" />
        <LineSkeleton width={280} height={14} />
      </div>

      {/* Stats cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent users */}
        <div className="rounded-lg border p-4">
          <div className="mb-4 flex items-center justify-between">
            <LineSkeleton width={100} height={18} />
            <Skeleton className="h-8 w-20 rounded" />
          </div>
          <div className="space-y-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <UserRowSkeleton key={i} />
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div className="rounded-lg border p-4">
          <div className="mb-4 flex items-center justify-between">
            <LineSkeleton width={120} height={18} />
            <Skeleton className="h-8 w-20 rounded" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <ActivityItemSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Stats card skeleton
 */
function StatCardSkeleton() {
  return (
    <div className="rounded-lg border p-4">
      <div className="mb-2 flex items-center justify-between">
        <LineSkeleton width={60} height={12} />
        <Skeleton className="h-5 w-5 rounded" />
      </div>
      <LineSkeleton width={80} height={28} className="mb-1" />
      <LineSkeleton width={100} height={12} />
    </div>
  );
}

/**
 * Activity item skeleton
 */
function ActivityItemSkeleton() {
  return (
    <div className="flex items-start gap-3">
      <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1">
        <LineSkeleton width="80%" height={14} className="mb-1" />
        <LineSkeleton width={60} height={12} />
      </div>
    </div>
  );
}
