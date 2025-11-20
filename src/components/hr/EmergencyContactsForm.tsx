import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Save } from "lucide-react";

interface EmergencyContactsFormProps {
  onboarding: any;
  onComplete: () => void;
}

export function EmergencyContactsForm({ onboarding, onComplete }: EmergencyContactsFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    emergency_contact_1_name: onboarding?.emergency_contact_1_name || "",
    emergency_contact_1_relationship: onboarding?.emergency_contact_1_relationship || "",
    emergency_contact_1_phone: onboarding?.emergency_contact_1_phone || "",
    emergency_contact_2_name: onboarding?.emergency_contact_2_name || "",
    emergency_contact_2_relationship: onboarding?.emergency_contact_2_relationship || "",
    emergency_contact_2_phone: onboarding?.emergency_contact_2_phone || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      const payload = {
        user_id: userData.user.id,
        ...formData,
        emergency_contacts_completed: true,
      };

      if (onboarding?.id) {
        const { error } = await supabase
          .from("employee_onboarding")
          .update(payload)
          .eq("id", onboarding.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("employee_onboarding").insert(payload);
        if (error) throw error;
      }

      toast.success("Emergency contacts saved successfully");
      onComplete();
    } catch (error: any) {
      toast.error(error.message || "Failed to save emergency contacts");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Emergency Contacts</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Provide at least one emergency contact who we can reach in case of an emergency.
        </p>
      </div>

      <div className="space-y-6">
        <div className="border rounded-lg p-4 space-y-4">
          <h4 className="font-semibold">Primary Emergency Contact *</h4>
          
          <div>
            <Label htmlFor="contact1_name">Full Name *</Label>
            <Input
              id="contact1_name"
              value={formData.emergency_contact_1_name}
              onChange={(e) =>
                setFormData({ ...formData, emergency_contact_1_name: e.target.value })
              }
              required
            />
          </div>

          <div>
            <Label htmlFor="contact1_relationship">Relationship *</Label>
            <Input
              id="contact1_relationship"
              value={formData.emergency_contact_1_relationship}
              onChange={(e) =>
                setFormData({ ...formData, emergency_contact_1_relationship: e.target.value })
              }
              placeholder="e.g., Spouse, Parent, Sibling"
              required
            />
          </div>

          <div>
            <Label htmlFor="contact1_phone">Phone Number *</Label>
            <Input
              id="contact1_phone"
              type="tel"
              value={formData.emergency_contact_1_phone}
              onChange={(e) =>
                setFormData({ ...formData, emergency_contact_1_phone: e.target.value })
              }
              placeholder="(555) 123-4567"
              required
            />
          </div>
        </div>

        <div className="border rounded-lg p-4 space-y-4">
          <h4 className="font-semibold">Secondary Emergency Contact (Optional)</h4>
          
          <div>
            <Label htmlFor="contact2_name">Full Name</Label>
            <Input
              id="contact2_name"
              value={formData.emergency_contact_2_name}
              onChange={(e) =>
                setFormData({ ...formData, emergency_contact_2_name: e.target.value })
              }
            />
          </div>

          <div>
            <Label htmlFor="contact2_relationship">Relationship</Label>
            <Input
              id="contact2_relationship"
              value={formData.emergency_contact_2_relationship}
              onChange={(e) =>
                setFormData({ ...formData, emergency_contact_2_relationship: e.target.value })
              }
              placeholder="e.g., Friend, Neighbor"
            />
          </div>

          <div>
            <Label htmlFor="contact2_phone">Phone Number</Label>
            <Input
              id="contact2_phone"
              type="tel"
              value={formData.emergency_contact_2_phone}
              onChange={(e) =>
                setFormData({ ...formData, emergency_contact_2_phone: e.target.value })
              }
              placeholder="(555) 123-4567"
            />
          </div>
        </div>
      </div>

      <Button type="submit" disabled={loading}>
        <Save className="mr-2 h-4 w-4" />
        {loading ? "Saving..." : "Save & Continue"}
      </Button>
    </form>
  );
}
