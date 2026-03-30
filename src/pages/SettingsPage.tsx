import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Mail, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

const SettingsPage = () => {
  const [profile, setProfile] = useState<any>(null);
  const [pinCode, setPinCode] = useState("");
  const [recipients, setRecipients] = useState<any[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [sendingReport, setSendingReport] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setProfile(p);
      setPinCode(p?.pin_code || "");

      const { data: r } = await supabase.from("timesheet_email_recipients" as any).select("*").order("created_at");
      setRecipients(r || []);
    };
    load();
  }, []);

  const savePin = async () => {
    if (pinCode.length !== 4 || !/^\d{4}$/.test(pinCode)) {
      toast.error("PIN must be exactly 4 digits");
      return;
    }
    const { error } = await supabase.from("profiles").update({ pin_code: pinCode }).eq("id", profile.id);
    if (error) { toast.error(error.message); return; }
    toast.success("PIN updated");
  };

  const addRecipient = async () => {
    if (!newEmail) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("timesheet_email_recipients" as any).insert({
      email: newEmail,
      name: newName || null,
      created_by: user?.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Recipient added");
    setNewEmail(""); setNewName("");
    const { data } = await supabase.from("timesheet_email_recipients" as any).select("*").order("created_at");
    setRecipients(data || []);
  };

  const removeRecipient = async (id: string) => {
    await supabase.from("timesheet_email_recipients" as any).delete().eq("id", id);
    setRecipients(recipients.filter(r => r.id !== id));
    toast.success("Recipient removed");
  };

  const sendReportNow = async () => {
    setSendingReport(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-timesheet-report", {
        body: {},
      });
      if (error) throw error;
      if (data?.success) {
        toast.success(`Report sent to ${data.recipientsSent} recipient(s)`);
      } else {
        toast.error(data?.message || "Failed to send report");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to send report");
    } finally {
      setSendingReport(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-2xl font-bold">Settings</h2>

      <Card>
        <CardHeader>
          <CardTitle>Your Time Clock PIN</CardTitle>
          <CardDescription>Set your 4-digit PIN for the time clock terminal on the homepage</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>PIN Code</Label>
            <Input
              type="password"
              value={pinCode}
              onChange={e => setPinCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="4-digit PIN"
              maxLength={4}
              className="max-w-[200px] text-center text-xl tracking-widest"
            />
          </div>
          <Button onClick={savePin}>Save PIN</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Timesheet Email Recipients
          </CardTitle>
          <CardDescription>
            Auto-generated weekly timesheets will be emailed to these addresses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {recipients.map((r: any) => (
              <div key={r.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">{r.email}</p>
                  {r.name && <p className="text-sm text-muted-foreground">{r.name}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={r.active ? "default" : "secondary"}>
                    {r.active ? "Active" : "Inactive"}
                  </Badge>
                  <Button variant="ghost" size="icon" onClick={() => removeRecipient(r.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
            {recipients.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No recipients added yet</p>
            )}
          </div>

          <div className="flex gap-2">
            <Input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Name (optional)"
              className="max-w-[180px]"
            />
            <Input
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              placeholder="email@example.com"
              type="email"
            />
            <Button onClick={addRecipient}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;
