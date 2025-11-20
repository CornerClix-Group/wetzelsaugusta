import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Camera, Save, AlertTriangle } from "lucide-react";
import { SignaturePad } from "./SignaturePad";
import { PhotoUpload } from "./PhotoUpload";
import { TemperatureLog } from "./TemperatureLog";
import { QualityScoring } from "./QualityScoring";
import { getChecklistTemplate } from "./checklistTemplates";

interface ChecklistFormProps {
  type: string;
  truckId: string;
  onClose: () => void;
}

interface ItemData {
  checked: boolean;
  notes: string;
  initials: string;
  photos: string[];
}

export function ChecklistForm({ type, truckId, onClose }: ChecklistFormProps) {
  const queryClient = useQueryClient();
  const template = getChecklistTemplate(type);
  const [startTime] = useState(new Date());
  const [items, setItems] = useState<Record<string, ItemData>>(
    Object.fromEntries(
      template.items.map((item) => [item.id, { checked: false, notes: "", initials: "", photos: [] }])
    )
  );
  const [temperatures, setTemperatures] = useState<any[]>([]);
  const [signature, setSignature] = useState<string>("");
  const [qualityScore, setQualityScore] = useState<"pass" | "needs_improvement" | "fail" | null>(null);
  const [loading, setLoading] = useState(false);

  const hasTemperatureLogs = template.items.some((item) => item.isTemperatureLog);
  const hasQualityScoring = type === "quality";

  const handleItemChange = (itemId: string, field: keyof ItemData, value: any) => {
    setItems((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], [field]: value },
    }));
  };

  const validatePhotoRequirements = (): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    template.items.forEach((item) => {
      const itemData = items[item.id];
      
      if (item.photoRequirement === "required" && itemData.photos.length === 0) {
        errors.push(`${item.label} requires at least one photo`);
      }

      if (item.photoRequirement === "minimum" && itemData.photos.length < (item.minimumPhotos || 1)) {
        errors.push(`${item.label} requires at least ${item.minimumPhotos} photo(s)`);
      }
    });

    return { valid: errors.length === 0, errors };
  };

  const validateTemperatures = (): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (hasTemperatureLogs) {
      const tempDevices = template.items.filter((item) => item.isTemperatureLog);
      
      tempDevices.forEach((device) => {
        const tempData = temperatures.find((t) => t.device_name === device.tempDevice);
        
        if (!tempData || !tempData.temperature) {
          errors.push(`Temperature reading required for ${device.tempDevice}`);
        }

        if (tempData?.out_of_range && !tempData.corrective_action) {
          errors.push(`Corrective action required for ${device.tempDevice} (out of range)`);
        }
      });
    }

    return { valid: errors.length === 0, errors };
  };

  const isComplete = () => {
    const allItemsChecked = Object.values(items).every((item) => item.checked && item.initials.trim() !== "");
    const photoValidation = validatePhotoRequirements();
    const tempValidation = validateTemperatures();
    const hasSignature = !!signature;
    const hasQualityScoreIfNeeded = !hasQualityScoring || qualityScore !== null;

    return allItemsChecked && photoValidation.valid && tempValidation.valid && hasSignature && hasQualityScoreIfNeeded;
  };

  const getFlaggedItems = () => {
    const flagged: string[] = [];
    
    Object.entries(items).forEach(([itemId, itemData]) => {
      if (!itemData.checked || !itemData.initials.trim()) {
        const item = template.items.find((i) => i.id === itemId);
        if (item) flagged.push(item.label);
      }
    });

    const photoValidation = validatePhotoRequirements();
    flagged.push(...photoValidation.errors);

    const tempValidation = validateTemperatures();
    flagged.push(...tempValidation.errors);

    if (!signature) flagged.push("Digital signature required");
    if (hasQualityScoring && !qualityScore) flagged.push("Quality score required");

    return flagged;
  };

  const createAuditLog = async (checklistId: string, action: string, changes: any) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      await supabase.from("checklist_audit_logs").insert({
        checklist_id: checklistId,
        user_id: userData.user.id,
        action,
        changes,
      });
    } catch (error) {
      console.error("Audit log error:", error);
    }
  };

  const saveTemperatureLogs = async (checklistId: string) => {
    if (!hasTemperatureLogs || temperatures.length === 0) return;

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const tempDevices = template.items.filter((item) => item.isTemperatureLog);

    for (const device of tempDevices) {
      const tempData = temperatures.find((t) => t.device_name === device.tempDevice);
      if (!tempData || !tempData.temperature) continue;

      const temp = parseFloat(tempData.temperature);
      const isInRange = temp >= (device.tempMin || 0) && temp <= (device.tempMax || 999);

      await supabase.from("temperature_logs").insert({
        checklist_id: checklistId,
        device_name: device.tempDevice!,
        temperature_f: temp,
        expected_min_f: device.tempMin,
        expected_max_f: device.tempMax,
        is_in_range: isInRange,
        corrective_action: tempData.corrective_action || null,
        recorded_by: userData.user.id,
      });
    }
  };

  const handleSubmit = async () => {
    const flaggedItems = getFlaggedItems();
    const isFlagged = flaggedItems.length > 0;

    if (isFlagged) {
      toast.error("Checklist has incomplete items. It will be flagged for review.");
    }

    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      const endTime = new Date();
      const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

      const today = new Date().toISOString().split("T")[0];

      // Check for out-of-range temperatures
      const hasOutOfRangeTemps = temperatures.some((t) => t.out_of_range);
      const requiresOwnerReview = isFlagged || hasOutOfRangeTemps || qualityScore === "fail";

      const { data: checklist, error } = await supabase
        .from("compliance_checklists")
        .insert({
          checklist_type: type,
          checklist_date: today,
          truck_id: truckId,
          data: { items, temperatures } as any,
          signature_data: signature,
          completed_by: userData.user.id,
          started_at: startTime.toISOString(),
          completed_at: endTime.toISOString(),
          completion_duration_minutes: durationMinutes,
          flagged: isFlagged,
          flag_reason: isFlagged ? flaggedItems.join("; ") : null,
          quality_score: qualityScore,
          requires_owner_review: requiresOwnerReview,
        } as any)
        .select()
        .single();

      if (error) throw error;

      // Save temperature logs
      await saveTemperatureLogs(checklist.id);

      // Create audit log
      await createAuditLog(checklist.id, "created", {
        duration_minutes: durationMinutes,
        flagged: isFlagged,
        quality_score: qualityScore,
      });

      // Notify owner if requires review
      if (requiresOwnerReview) {
        toast.warning("Checklist flagged for owner review", {
          description: "Owner has been notified of issues requiring attention.",
        });
      } else {
        toast.success("Checklist completed successfully");
      }

      queryClient.invalidateQueries({ queryKey: ["todays-checklists"] });
      queryClient.invalidateQueries({ queryKey: ["compliance-scores"] });
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to save checklist");
    } finally {
      setLoading(false);
    }
  };

  const getTemperatureDevices = () => {
    return template.items
      .filter((item) => item.isTemperatureLog)
      .map((item) => ({
        name: item.tempDevice!,
        minTemp: item.tempMin!,
        maxTemp: item.tempMax!,
      }));
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template.title}</DialogTitle>
          <DialogDescription>
            {template.description}
            <br />
            <span className="text-xs text-muted-foreground">
              Started at {startTime.toLocaleTimeString()}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {hasTemperatureLogs ? (
            <TemperatureLog
              checklistId={null}
              devices={getTemperatureDevices()}
              onTemperaturesChange={setTemperatures}
            />
          ) : (
            template.items.map((item) => (
              <div key={item.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={items[item.id]?.checked}
                    onCheckedChange={(checked) => handleItemChange(item.id, "checked", checked)}
                  />
                  <div className="flex-1">
                    <Label className="text-base font-medium">
                      {item.label}
                      {item.photoRequirement === "required" && (
                        <span className="text-red-500 ml-1">* (Photo Required)</span>
                      )}
                      {item.photoRequirement === "minimum" && (
                        <span className="text-amber-500 ml-1">
                          * (Min. {item.minimumPhotos} photo{item.minimumPhotos! > 1 ? "s" : ""})
                        </span>
                      )}
                    </Label>
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

                  {(item.photoRequirement === "required" || item.photoRequirement === "minimum" || item.photoRequirement === "optional") && (
                    <div>
                      <Label>
                        <Camera className="inline h-4 w-4 mr-1" />
                        Photos {item.photoRequirement !== "optional" ? "*" : "(optional)"}
                      </Label>
                      <PhotoUpload
                        photos={items[item.id]?.photos || []}
                        onPhotosChange={(photos) => handleItemChange(item.id, "photos", photos)}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {hasQualityScoring && <QualityScoring score={qualityScore} onScoreChange={setQualityScore} />}

          <div className="border rounded-lg p-4 space-y-3">
            <Label>Digital Signature *</Label>
            <SignaturePad signature={signature} onSignatureChange={setSignature} />
          </div>

          {!isComplete() && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Incomplete items detected:</strong>
                <ul className="list-disc list-inside mt-2">
                  {getFlaggedItems().map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
                <p className="mt-2">
                  Submitting with incomplete items will flag this checklist for owner review.
                </p>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              <Save className="mr-2 h-4 w-4" />
              {loading ? "Saving..." : "Submit Checklist"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
