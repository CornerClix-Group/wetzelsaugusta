import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Edit2, Trash2 } from "lucide-react";
import { AddEditItemDialog } from "./AddEditItemDialog";
import { RecordTransactionDialog } from "./RecordTransactionDialog";
import { toast } from "sonner";

interface ItemsTableProps {
  truckId: string;
}

export function ItemsTable({ truckId }: ItemsTableProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [addingItem, setAddingItem] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [transactionItem, setTransactionItem] = useState<any>(null);

  const { data: items, isLoading } = useQuery({
    queryKey: ["inventory-items", truckId],
    queryFn: async () => {
      let query = supabase.from("inventory_items").select("*, inventory_categories(name)").eq("is_active", true);
      if (truckId) query = query.eq("truck_id", truckId);
      const { data, error } = await query.order("name");
      if (error) throw error;
      return data;
    },
  });

  const filtered = items?.filter((i: any) =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    (i.inventory_categories as any)?.name?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const getStockBadge = (qty: number, par: number) => {
    if (par <= 0) return <Badge variant="outline" className="text-xs">No Par</Badge>;
    const ratio = qty / par;
    if (ratio < 0.25) return <Badge className="bg-red-100 text-red-700 border-0 text-xs">Critical</Badge>;
    if (ratio < 0.75) return <Badge className="bg-yellow-100 text-yellow-700 border-0 text-xs">Low</Badge>;
    return <Badge className="bg-green-100 text-green-700 border-0 text-xs">Good</Badge>;
  };

  const handleDelete = async (itemId: string) => {
    const { error } = await supabase.from("inventory_items").update({ is_active: false } as any).eq("id", itemId);
    if (error) {
      toast.error("Failed to remove item");
    } else {
      toast.success("Item removed");
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Inventory Items</CardTitle>
          <Button size="sm" onClick={() => setAddingItem(true)}>
            <Plus className="mr-1 h-4 w-4" /> Add Item
          </Button>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Par</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      {isLoading ? "Loading..." : "No items found. Add your first inventory item."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-muted-foreground">{(item.inventory_categories as any)?.name || "—"}</TableCell>
                      <TableCell className="text-right font-mono">{item.current_quantity}</TableCell>
                      <TableCell className="text-right font-mono">{item.par_level}</TableCell>
                      <TableCell>{getStockBadge(item.current_quantity, item.par_level)}</TableCell>
                      <TableCell className="text-muted-foreground">{item.unit}</TableCell>
                      <TableCell className="text-right">${(item.cost_per_unit || 0).toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setTransactionItem(item)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingItem(item)}>
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(item.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {addingItem && (
        <AddEditItemDialog truckId={truckId} onClose={() => setAddingItem(false)} />
      )}
      {editingItem && (
        <AddEditItemDialog truckId={truckId} item={editingItem} onClose={() => setEditingItem(null)} />
      )}
      {transactionItem && (
        <RecordTransactionDialog item={transactionItem} onClose={() => setTransactionItem(null)} />
      )}
    </>
  );
}
