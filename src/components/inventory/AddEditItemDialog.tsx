import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Save } from "lucide-react";

interface AddEditItemDialogProps {
  truckId: string;
  item?: any;
  onClose: () => void;
}

const unitOptions = ["each", "lb", "oz", "case", "bag", "box", "gallon", "bottle", "pack"];

export function AddEditItemDialog({ truckId, item, onClose }: AddEditItemDialogProps) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(item?.name || "");
  const [categoryId, setCategoryId] = useState(item?.category_id || "");
  const [unit, setUnit] = useState(item?.unit || "each");
  const [parLevel, setParLevel] = useState(item?.par_level?.toString() || "0");
  const [currentQuantity, setCurrentQuantity] = useState(item?.current_quantity?.toString() || "0");
  const [costPerUnit, setCostPerUnit] = useState(item?.cost_per_unit?.toString() || "0");
  const [supplier, setSupplier] = useState(item?.supplier || "");
  const [sku, setSku] = useState(item?.sku || "");

  const { data: categories } = useQuery({
    queryKey: ["inventory-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("inventory_categories").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Item name is required");
      return;
    }
    setLoading(true);
    try {
      const payload: any = {
        name: name.trim(),
        category_id: categoryId || null,
        unit,
        par_level: parseFloat(parLevel) || 0,
        current_quantity: parseFloat(currentQuantity) || 0,
        cost_per_unit: parseFloat(costPerUnit) || 0,
        supplier: supplier || null,
        sku: sku || null,
        truck_id: truckId || null,
      };

      if (item) {
        const { error } = await supabase.from("inventory_items").update(payload).eq("id", item.id);
        if (error) throw error;
        toast.success("Item updated");
      } else {
        const { error } = await supabase.from("inventory_items").insert(payload);
        if (error) throw error;
        toast.success("Item added");
      }

      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to save item");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? "Edit Item" : "Add New Item"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Name *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Pretzel Dough Mix" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {categories?.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Unit</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {unitOptions.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Par Level</Label>
              <Input type="number" value={parLevel} onChange={e => setParLevel(e.target.value)} min="0" />
            </div>
            <div>
              <Label>Current Quantity</Label>
              <Input type="number" value={currentQuantity} onChange={e => setCurrentQuantity(e.target.value)} min="0" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Cost per Unit ($)</Label>
              <Input type="number" value={costPerUnit} onChange={e => setCostPerUnit(e.target.value)} min="0" step="0.01" />
            </div>
            <div>
              <Label>SKU</Label>
              <Input value={sku} onChange={e => setSku(e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <div>
            <Label>Supplier</Label>
            <Input value={supplier} onChange={e => setSupplier(e.target.value)} placeholder="Optional" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={loading}>
              <Save className="mr-1 h-4 w-4" />
              {loading ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
