import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { QSCEScorecard } from "./QSCEScorecard";
import { Skeleton } from "@/components/ui/skeleton";

interface QSCEHistoryProps {
  truckId: string;
}

export function QSCEHistory({ truckId }: QSCEHistoryProps) {
  const { data: visits, isLoading } = useQuery({
    queryKey: ["qsce-visits", truckId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("qsce_visits")
        .select("*")
        .eq("truck_id", truckId)
        .order("visit_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 w-full" />)}
      </div>
    );
  }

  if (!visits || visits.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No QSCE visits recorded yet. Start a new visit to begin tracking.
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {visits.map((visit: any) => (
        <QSCEScorecard
          key={visit.id}
          visit={{
            ...visit,
            compliance_issues: Array.isArray(visit.compliance_issues) ? visit.compliance_issues : [],
          }}
        />
      ))}
    </div>
  );
}
