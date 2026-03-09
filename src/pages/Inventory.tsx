import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InventoryDashboard } from "@/components/inventory/InventoryDashboard";
import { ItemsTable } from "@/components/inventory/ItemsTable";
import { TransactionLog } from "@/components/inventory/TransactionLog";
import { InventoryDocuments } from "@/components/inventory/InventoryDocuments";
import { InventoryCountSheet } from "@/components/inventory/InventoryCountSheet";

export default function Inventory() {
  const [selectedTruckId, setSelectedTruckId] = useState<string>("");

  const { data: trucks } = useQuery({
    queryKey: ["trucks"],
    queryFn: async () => {
      const { data, error } = await supabase.from("trucks").select("*").eq("status", "active").order("name");
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Inventory Management</h1>
          <p className="text-muted-foreground mt-1">Track stock levels, transactions, and documents</p>
        </div>
        <select
          className="border rounded-md px-3 py-2 bg-background text-foreground"
          value={selectedTruckId}
          onChange={e => setSelectedTruckId(e.target.value)}
        >
          <option value="">All Locations</option>
          {trucks?.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="count">Physical Count</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <InventoryDashboard truckId={selectedTruckId} />
        </TabsContent>

        <TabsContent value="items">
          <ItemsTable truckId={selectedTruckId} />
        </TabsContent>

        <TabsContent value="transactions">
          <TransactionLog truckId={selectedTruckId} />
        </TabsContent>

        <TabsContent value="count">
          <InventoryCountSheet truckId={selectedTruckId} />
        </TabsContent>

        <TabsContent value="documents">
          <InventoryDocuments truckId={selectedTruckId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
