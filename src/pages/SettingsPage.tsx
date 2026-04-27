import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Mail, Send, Loader2, Eye, DollarSign, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const fmtMoney = (cents: number) =>
  `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const SettingsPage = () => {
  const [profile, setProfile] = useState<any>(null);
  const [pinCode, setPinCode] = useState("");
  const [recipients, setRecipients] = useState<any[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [sendingReport, setSendingReport] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<any>(null);

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

  const previewPayroll = async () => {
    setPreviewing(true);
    setPreview(null);
    try {
      const { data, error } = await supabase.functions.invoke("send-timesheet-report", {
        body: { dry_run: true },
      });
      if (error) throw error;
      setPreview(data);
    } catch (err: any) {
      toast.error(err.message || "Preview failed");
    } finally {
      setPreviewing(false);
    }
  };

  const sendReportNow = async () => {
    setSendingReport(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-timesheet-report", {
        body: {},
      });
      if (error) throw error;
      if (data?.success) {
        toast.success(`Payroll report sent to ${data.recipientsSent} recipient(s)`);
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
    <div className="space-y-6 max-w-3xl">
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
            <DollarSign className="h-5 w-5" />
            Weekly payroll automation
          </CardTitle>
          <CardDescription>
            Every Monday at 6:00 AM ET, the system emails the previous Sunday–Saturday payroll
            to the recipients below. Pay = max(hours × rate, weekly minimum) per employee.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={previewPayroll} disabled={previewing} variant="outline">
              {previewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
              {previewing ? "Calculating..." : "Preview last week's payroll"}
            </Button>
            <Button onClick={sendReportNow} disabled={sendingReport || recipients.length === 0}>
              {sendingReport ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {sendingReport ? "Sending..." : "Send report now"}
            </Button>
          </div>

          {preview && (
            <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Period</div>
                  <div className="font-semibold">{preview.period?.start} → {preview.period?.end}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Total to pay</div>
                  <div className="text-2xl font-bold text-primary">{preview.totals?.payable_formatted}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-sm">
                <div className="bg-background rounded p-2">
                  <div className="text-xs text-muted-foreground">Employees</div>
                  <div className="font-semibold">{preview.totals?.employees}</div>
                </div>
                <div className="bg-background rounded p-2">
                  <div className="text-xs text-muted-foreground">Hours</div>
                  <div className="font-semibold">{preview.totals?.hours?.toFixed(2)}</div>
                </div>
                <div className="bg-background rounded p-2">
                  <div className="text-xs text-muted-foreground">Earned</div>
                  <div className="font-semibold">{fmtMoney(preview.totals?.earned_cents || 0)}</div>
                </div>
                <div className="bg-background rounded p-2">
                  <div className="text-xs text-muted-foreground">Top-ups</div>
                  <div className="font-semibold">{preview.totals?.topup_cents > 0 ? `+${fmtMoney(preview.totals.topup_cents)}` : "—"}</div>
                </div>
              </div>
              <div className="space-y-1 max-h-72 overflow-y-auto">
                {(preview.employees || []).map((e: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-background rounded text-sm">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{e.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {e.hours.toFixed(2)}h × {e.hourly_rate_cents > 0 ? `${fmtMoney(e.hourly_rate_cents)}/hr` : "no rate"}
                        {e.minimum_cents > 0 && ` · min ${fmtMoney(e.minimum_cents)}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {e.topup_cents > 0 && (
                        <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">
                          +{fmtMoney(e.topup_cents)}
                        </Badge>
                      )}
                      {e.has_open_shift && (
                        <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
                          <AlertTriangle className="h-3 w-3 mr-1" />Open
                        </Badge>
                      )}
                      {e.hourly_rate_cents === 0 && (
                        <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">No rate</Badge>
                      )}
                      <div className="font-bold w-20 text-right">{e.payable_formatted}</div>
                    </div>
                  </div>
                ))}
                {(preview.employees || []).length === 0 && (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    No employees with shifts or minimum guarantees this period.
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Mail className="h-4 w-4" /> Email recipients
            </div>
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;
