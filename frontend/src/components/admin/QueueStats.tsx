import { Skeleton, StatTile } from "@/components/ui";
import { shortAge } from "@/lib/format";
import { TICKET_PRIORITIES, type TicketStats } from "@/types/domain";

/** The numbers an ops lead scans first: how much is waiting, how urgent, and how old. */
export function QueueStats({ stats }: { stats: TicketStats | undefined }) {
  if (!stats) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  const urgent = stats.activeByPriority.Critical + stats.activeByPriority.High;
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <StatTile label="Needs attention" value={stats.active} hint={`${stats.total} tickets in total`} accent />
      <StatTile label="Critical + High" value={urgent} hint={TICKET_PRIORITIES.map((p) => `${stats.activeByPriority[p]} ${p.toLowerCase()}`).join(" · ")} />
      <StatTile label="Unassigned" value={stats.unassignedActive} hint="Active tickets nobody owns" />
      <StatTile label="Oldest waiting" value={stats.oldestActiveAt ? shortAge(stats.oldestActiveAt) : "—"} hint="Since it was opened" />
    </div>
  );
}
