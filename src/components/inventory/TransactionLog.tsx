import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

interface TransactionLogProps {
  truckId: string;
}

const typeColors: Record<string, string> = {
  received: "bg-green-100 text-green-700",
  used: "bg-blue-100 text-blue-700",
  wasted: "bg-red-100 text-red-700",
  adjusted: "bg-yellow-100 text-yellow-700",
  counted: "bg-purple-100 text-purple-700",
};

export function TransactionLog({ truckId }: TransactionLogProps) {
  const { data: transactions, isLoading } = useQuery({
    queryKey: ["all-transactions", truckId],
    queryFn: async () => {
      let query = supabase
        .from("inventory_transactions")
        .select("*, inventory_items(name, unit), profiles(full_name)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (truckId) query = query.eq("truck_id", truckId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Transaction History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Change</TableHead>
                <TableHead className="text-right">After</TableHead>
                <TableHead>By</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : !transactions || transactions.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No transactions yet.</TableCell></TableRow>
              ) : (
                transactions.map((tx: any) => (
                  <TableRow key={tx.id}>
                    <TableCell className="text-xs">{format(new Date(tx.created_at), "MMM d, h:mm a")}</TableCell>
                    <TableCell className="font-medium">{(tx.inventory_items as any)?.name}</TableCell>
                    <TableCell>
                      <Badge className={`${typeColors[tx.transaction_type] || ""} border-0 text-xs capitalize`}>
                        {tx.transaction_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {tx.quantity_change > 0 ? "+" : ""}{tx.quantity_change}
                    </TableCell>
                    <TableCell className="text-right font-mono">{tx.quantity_after}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{(tx.profiles as any)?.full_name || "—"}</TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">{tx.notes || "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
