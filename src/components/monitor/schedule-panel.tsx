import { CalendarClock } from "lucide-react";
import { setAutoMonitor } from "@/app/dashboard/monitor-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

export type ScheduleInfo = {
  /** The brand's own on/off switch. */
  enabled: boolean;
  /** This deployment has CRON_SECRET and the service-role key set. */
  configured: boolean;
  /** ISO date the schedule next picks the brand up. */
  next: string | null;
};

/** Scheduled weekly monitoring: state, next run, and the brand's on/off switch. */
export function SchedulePanel({
  brandId,
  schedule,
  blocker,
}: {
  brandId: string;
  schedule: ScheduleInfo;
  blocker: string | null;
}) {
  const { enabled, configured, next } = schedule;
  const status = !configured
    ? {
        badge: <Badge variant="warn">Not set up</Badge>,
        text: "Scheduled runs aren't set up on this server yet (CRON_SECRET and SUPABASE_SERVICE_ROLE_KEY). Run the monitor manually for now.",
      }
    : !enabled
      ? { badge: <Badge variant="muted">Off</Badge>, text: "Runs only when you click “Run monitor now”." }
      : blocker
        ? {
            badge: <Badge variant="warn">Paused</Badge>,
            text: `On, but nothing will run until this is fixed: ${blocker}`,
          }
        : {
            badge: <Badge variant="good">On</Badge>,
            text:
              next && Date.parse(next) > Date.now()
                ? `Runs every 7 days. Next run on or after ${formatDate(next)}. A manual run also resets the clock.`
                : "Runs every 7 days. Next run: the next daily check (around 9:00 IST).",
          };

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-navy-100 bg-white px-5 py-4">
      <CalendarClock className="h-5 w-5 text-navy-400" aria-hidden />
      <span className="font-semibold">Scheduled weekly monitoring</span>
      {status.badge}
      <span className="min-w-0 flex-[1_1_260px] text-sm text-navy-400">{status.text}</span>
      <form action={setAutoMonitor}>
        <input type="hidden" name="brandId" value={brandId} />
        <input type="hidden" name="on" value={enabled ? "0" : "1"} />
        <Button type="submit" variant="outline">
          {enabled ? "Turn off" : "Turn on"}
        </Button>
      </form>
    </div>
  );
}
