import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { CheckCircle2 } from "lucide-react";

interface ChecklistHistoryProps {
  truckId: string;
}

export function ChecklistHistory({ truckId }: ChecklistHistoryProps) {
  const { data: checklists } = useQuery({
    queryKey: ["checklist-history", truckId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("compliance_checklists")
        .select(`
          *,
          profiles:completed_by (full_name)
        `)
        .eq("truck_id", truckId)
        .order("checklist_date", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
  });

  const typeLabels: Record<string, string> = {
    opening: "Opening",
    prep: "Prep",
    quality: "Quality",
    food_safety: "Food Safety",
    temperature: "Temperature",
    closing: "Closing",
  };

  return (
    <div className="space-y-4">
      {checklists?.map((checklist) => (
        <Card key={checklist.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  {typeLabels[checklist.checklist_type] || checklist.checklist_type}
                </CardTitle>
                <CardDescription>
                  {format(new Date(checklist.checklist_date), "MMMM d, yyyy")}
                </CardDescription>
              </div>
              <Badge variant="secondary">
                Completed by {(checklist as any).profiles?.full_name || "Unknown"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Completed at {format(new Date(checklist.completed_at!), "h:mm a")}
            </p>
          </CardContent>
        </Card>
      ))}

      {!checklists || checklists.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No checklist history found
          </CardContent>
        </Card>
      )}
    </div>
  );
}
