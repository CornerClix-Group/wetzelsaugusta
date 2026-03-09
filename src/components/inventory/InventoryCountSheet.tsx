import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ClipboardCheck } from "lucide-react";

interface InventoryCountSheetProps {
  truckId: string;
}

export function InventoryCountSheet({ truckId }: InventoryCountSheetProps) {
  const queryClient = useQueryClient();
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const { data: items } = useQuery({
    queryKey: ["inventory-items", truckId],
    queryFn: async () => {
      let query = supabase.from("inventory_items").select("*, inventory_categories(name)").eq("is_active", true);
      if (truckId) query = query.eq("truck_id", truckId);
      const { data, error } = await query.order("name");
      if (error) throw error;
      return data;
    },
  });

  // Group by category
  const grouped = (items || []).reduce((acc: Record<string, any[]>, item: any) => {
    const cat = (item.inventory_categories as any)?.name || "Uncategorized";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const handleSubmit = async () => {
    const entries = Object.entries(counts).filter(([, v]) => v !== "" && v !== undefined);
    if (entries.length === 0) {
      toast.error("Enter at least one count");
      return;
    }

    setSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      let adjustments = 0;

      for (const [itemId, countStr] of entries) {
        const counted = parseFloat(countStr);
        if (isNaN(counted)) continue;

        const item = items?.find((i: any) => i.id === itemId);
        if (!item) continue;

        const diff = counted - (item as any).current_quantity;
        if (diff === 0) continue;

        // Record adjustment transaction
        await supabase.from("inventory_transactions").insert({
          item_id: itemId,
          transaction_type: "counted",
          quantity_change: diff,
          quantity_after: counted,
          performed_by: userData.user.id,
          notes: `Physical count adjustment (was ${(item as any).current_quantity}, counted ${counted})`,
          truck_id: (item as any).truck_id || null,
        } as any);

        // Update quantity
        await supabase.from("inventory_items").update({ current_quantity: counted } as any).eq("id", itemId);
        adjustments++;
      }

      toast.success(`Physical count complete — ${adjustments} item(s) adjusted`);
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      setCounts({});
    } catch (error: any) {
      toast.error(error.message || "Failed to submit count");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Physical Count Sheet</CardTitle>
          <Button onClick={handleSubmit} disabled={submitting}>
            <ClipboardCheck className="mr-1 h-4 w-4" />
            {submitting ? "Submitting..." : "Submit Count"}
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Enter actual counts for each item. Only items with entered counts will be adjusted.
          </p>

          {Object.entries(grouped).map(([category, catItems]) => (
            <div key={category} className="mb-6">
              <h3 className="font-semibold text-sm text-muted-foreground mb-2">{category}</h3>
              <div className="space-y-2">
                {catItems.map((item: any) => {
                  const counted = counts[item.id];
                  const diff = counted !== undefined && counted !== ""
                    ? parseFloat(counted) - item.current_quantity
                    : null;

                  return (
                    <div key={item.id} className="flex items-center gap-3 py-1">
                      <span className="flex-1 text-sm">{item.name}</span>
                      <span className="text-xs text-muted-foreground w-20 text-right">
                        System: {item.current_quantity}
                      </span>
                      <Input
                        type="number"
                        placeholder="Count"
                        value={counts[item.id] || ""}
                        onChange={e => setCounts(prev => ({ ...prev, [item.id]: e.target.value }))}
                        className="w-24 h-8 text-sm"
                        min="0"
                      />
                      {diff !== null && diff !== 0 && (
                        <Badge className={`text-xs ${diff > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"} border-0`}>
                          {diff > 0 ? "+" : ""}{diff}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {Object.keys(grouped).length === 0 && (
            <p className="text-center text-muted-foreground py-8">No inventory items. Add items first.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
