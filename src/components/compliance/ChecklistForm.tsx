import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Camera, Save } from "lucide-react";
import { SignaturePad } from "./SignaturePad";
import { PhotoUpload } from "./PhotoUpload";
import { getChecklistTemplate } from "./checklistTemplates";

interface ChecklistFormProps {
  type: string;
  truckId: string;
  onClose: () => void;
}

export function ChecklistForm({ type, truckId, onClose }: ChecklistFormProps) {
  const queryClient = useQueryClient();
  const template = getChecklistTemplate(type);
  const [items, setItems] = useState<Record<string, { checked: boolean; notes: string; initials: string }>>(
    Object.fromEntries(template.items.map((item) => [item.id, { checked: false, notes: "", initials: "" }]))
  );
  const [photos, setPhotos] = useState<string[]>([]);
  const [signature, setSignature] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleItemChange = (itemId: string, field: "checked" | "notes" | "initials", value: any) => {
    setItems((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], [field]: value },
    }));
  };

  const isComplete = () => {
    return Object.values(items).every((item) => item.checked && item.initials.trim() !== "") && signature;
  };

  const handleSubmit = async () => {
    if (!isComplete()) {
      toast.error("Please complete all required items and provide initials and signature");
      return;
    }

    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      const today = new Date().toISOString().split("T")[0];

      const { error } = await supabase.from("compliance_checklists").insert({
        checklist_type: type,
        checklist_date: today,
        truck_id: truckId,
        data: { items, photos },
        signature_data: signature,
        completed_by: userData.user.id,
        completed_at: new Date().toISOString(),
      });

      if (error) throw error;

      toast.success("Checklist completed successfully");
      queryClient.invalidateQueries({ queryKey: ["todays-checklists"] });
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to save checklist");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template.title}</DialogTitle>
          <DialogDescription>{template.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {template.items.map((item) => (
            <div key={item.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={items[item.id]?.checked}
                  onCheckedChange={(checked) => handleItemChange(item.id, "checked", checked)}
                />
                <div className="flex-1">
                  <Label className="text-base font-medium">{item.label}</Label>
                  {item.description && (
                    <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                  )}
                </div>
              </div>

              <div className="grid gap-3 pl-7">
                <div>
                  <Label htmlFor={`${item.id}-initials`}>Initials *</Label>
                  <Input
                    id={`${item.id}-initials`}
                    placeholder="Your initials"
                    value={items[item.id]?.initials || ""}
                    onChange={(e) => handleItemChange(item.id, "initials", e.target.value)}
                    className="max-w-xs"
                  />
                </div>

                <div>
                  <Label htmlFor={`${item.id}-notes`}>Notes (optional)</Label>
                  <Textarea
                    id={`${item.id}-notes`}
                    placeholder="Additional notes..."
                    value={items[item.id]?.notes || ""}
                    onChange={(e) => handleItemChange(item.id, "notes", e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
            </div>
          ))}

          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              <Label>Photos (optional but encouraged)</Label>
            </div>
            <PhotoUpload photos={photos} onPhotosChange={setPhotos} />
          </div>

          <div className="border rounded-lg p-4 space-y-3">
            <Label>Digital Signature *</Label>
            <SignaturePad signature={signature} onSignatureChange={setSignature} />
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading || !isComplete()}>
              <Save className="mr-2 h-4 w-4" />
              {loading ? "Saving..." : "Complete Checklist"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
