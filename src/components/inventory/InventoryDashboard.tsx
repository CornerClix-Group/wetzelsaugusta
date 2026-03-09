import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, AlertTriangle, DollarSign, ArrowDownUp } from "lucide-react";

interface InventoryDashboardProps {
  truckId: string;
}

export function InventoryDashboard({ truckId }: InventoryDashboardProps) {
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

  const { data: recentTransactions } = useQuery({
    queryKey: ["recent-transactions", truckId],
    queryFn: async () => {
      let query = supabase
        .from("inventory_transactions")
        .select("*, inventory_items(name), profiles(full_name)")
        .order("created_at", { ascending: false })
        .limit(10);
      if (truckId) query = query.eq("truck_id", truckId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const totalItems = items?.length || 0;
  const belowPar = items?.filter((i: any) => i.current_quantity < i.par_level * 0.25) || [];
  const nearPar = items?.filter((i: any) => i.current_quantity >= i.par_level * 0.25 && i.current_quantity < i.par_level * 0.75) || [];
  const totalValue = items?.reduce((sum: number, i: any) => sum + (i.current_quantity * (i.cost_per_unit || 0)), 0) || 0;

  const getStockStatus = (qty: number, par: number) => {
    if (par <= 0) return { label: "No Par", color: "bg-muted text-muted-foreground" };
    const ratio = qty / par;
    if (ratio < 0.25) return { label: "Critical", color: "bg-red-100 text-red-700" };
    if (ratio < 0.75) return { label: "Low", color: "bg-yellow-100 text-yellow-700" };
    return { label: "Good", color: "bg-green-100 text-green-700" };
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
          </CardContent>
        </Card>
        <Card className={belowPar.length > 0 ? "border-destructive" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{belowPar.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{nearPar.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalValue.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Low Stock Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Low Stock Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            {[...belowPar, ...nearPar].length === 0 ? (
              <p className="text-sm text-muted-foreground">All items are at or above par levels.</p>
            ) : (
              <div className="space-y-2">
                {[...belowPar, ...nearPar].slice(0, 10).map((item: any) => {
                  const s = getStockStatus(item.current_quantity, item.par_level);
                  return (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <span>{item.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{item.current_quantity}/{item.par_level} {item.unit}</span>
                        <Badge className={`${s.color} border-0 text-xs`}>{s.label}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {!recentTransactions || recentTransactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent transactions.</p>
            ) : (
              <div className="space-y-2">
                {recentTransactions.slice(0, 8).map((tx: any) => (
                  <div key={tx.id} className="flex items-center justify-between text-sm">
                    <div>
                      <span className="font-medium">{(tx.inventory_items as any)?.name}</span>
                      <span className="text-muted-foreground ml-2">
                        {tx.transaction_type === "received" ? "+" : tx.transaction_type === "adjusted" ? "±" : "-"}
                        {Math.abs(tx.quantity_change)}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs capitalize">{tx.transaction_type}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
