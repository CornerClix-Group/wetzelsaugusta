import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Save } from "lucide-react";

interface RecordTransactionDialogProps {
  item: any;
  onClose: () => void;
}

const transactionTypes = [
  { value: "received", label: "Received (adds stock)" },
  { value: "used", label: "Used (removes stock)" },
  { value: "wasted", label: "Wasted (removes stock)" },
  { value: "adjusted", label: "Adjustment (set quantity)" },
];

export function RecordTransactionDialog({ item, onClose }: RecordTransactionDialogProps) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState("received");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");

  const handleSave = async () => {
    const qty = parseFloat(quantity);
    if (!qty || qty <= 0) {
      toast.error("Enter a valid quantity");
      return;
    }

    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      let quantityChange: number;
      let quantityAfter: number;

      if (type === "received") {
        quantityChange = qty;
        quantityAfter = item.current_quantity + qty;
      } else if (type === "used" || type === "wasted") {
        quantityChange = -qty;
        quantityAfter = Math.max(0, item.current_quantity - qty);
      } else {
        // adjusted — set to exact value
        quantityChange = qty - item.current_quantity;
        quantityAfter = qty;
      }

      // Insert transaction
      const { error: txError } = await supabase.from("inventory_transactions").insert({
        item_id: item.id,
        transaction_type: type,
        quantity_change: quantityChange,
        quantity_after: quantityAfter,
        performed_by: userData.user.id,
        notes: notes || null,
        truck_id: item.truck_id || null,
      } as any);
      if (txError) throw txError;

      // Update item quantity
      const { error: updateError } = await supabase
        .from("inventory_items")
        .update({ current_quantity: quantityAfter } as any)
        .eq("id", item.id);
      if (updateError) throw updateError;

      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)}: ${Math.abs(quantityChange)} ${item.unit}`);
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      queryClient.invalidateQueries({ queryKey: ["recent-transactions"] });
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to record transaction");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Transaction — {item.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Current: <span className="font-mono font-bold">{item.current_quantity}</span> {item.unit} (Par: {item.par_level})
          </div>
          <div>
            <Label>Transaction Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {transactionTypes.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{type === "adjusted" ? "New Quantity" : "Quantity"}</Label>
            <Input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} min="0" step="0.01" />
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="e.g. Invoice #1234" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={loading}>
              <Save className="mr-1 h-4 w-4" />
              {loading ? "Saving..." : "Record"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
