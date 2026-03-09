import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Users, KeyRound, RotateCcw } from "lucide-react";
import { toast } from "sonner";

const Employees = () => {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [pinDialog, setPinDialog] = useState<{ open: boolean; employee: any | null }>({ open: false, employee: null });
  const [pinValue, setPinValue] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const [{ data: p }, { data: r }] = await Promise.all([
        supabase.from("profiles").select("*").order("full_name"),
        supabase.from("user_roles").select("*"),
      ]);
      setProfiles(p || []);
      setRoles(r || []);
      if (user) {
        const myRole = (r || []).find((role: any) => role.user_id === user.id);
        setCurrentUserRole(myRole?.role || null);
      }
    };
    fetchData();
  }, []);

  const isManager = currentUserRole === "owner" || currentUserRole === "manager";

  const getRole = (userId: string) => {
    const r = roles.find((r: any) => r.user_id === userId);
    return r?.role || "employee";
  };

  const handleSetPin = async () => {
    if (!pinDialog.employee) return;
    if (pinValue.length !== 4 || !/^\d{4}$/.test(pinValue)) {
      toast.error("PIN must be exactly 4 digits");
      return;
    }
    setSaving(true);
    const { error } = await supabase.rpc("set_employee_pin", {
      _target_user_id: pinDialog.employee.id,
      _pin: pinValue,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`PIN set for ${pinDialog.employee.full_name}`);
      setProfiles((prev) => prev.map((p) => p.id === pinDialog.employee.id ? { ...p, pin_code: pinValue } : p));
      setPinDialog({ open: false, employee: null });
      setPinValue("");
    }
  };

  const handleResetPin = async (employee: any) => {
    const { error } = await supabase.rpc("set_employee_pin", {
      _target_user_id: employee.id,
      _pin: null,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`PIN cleared for ${employee.full_name}`);
      setProfiles((prev) => prev.map((p) => p.id === employee.id ? { ...p, pin_code: null } : p));
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Employees</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {profiles.map((p) => (
          <Card key={p.id}>
            <CardHeader className="flex flex-row items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">{p.full_name}</CardTitle>
                <p className="text-sm text-muted-foreground">{p.email}</p>
              </div>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2 items-center">
              <Badge>{getRole(p.id)}</Badge>
              {p.pin_code && <Badge variant="outline">PIN set</Badge>}
              {isManager && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setPinDialog({ open: true, employee: p }); setPinValue(""); }}
                  >
                    <KeyRound className="h-3.5 w-3.5 mr-1" />
                    Set PIN
                  </Button>
                  {p.pin_code && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleResetPin(p)}
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-1" />
                      Reset
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        ))}
        {profiles.length === 0 && (
          <p className="text-muted-foreground col-span-full text-center py-12">No employees found</p>
        )}
      </div>

      <Dialog open={pinDialog.open} onOpenChange={(open) => setPinDialog({ open, employee: open ? pinDialog.employee : null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set PIN for {pinDialog.employee?.full_name}</DialogTitle>
            <DialogDescription>Enter a 4-digit PIN code for time clock access.</DialogDescription>
          </DialogHeader>
          <Input
            type="text"
            inputMode="numeric"
            maxLength={4}
            placeholder="0000"
            value={pinValue}
            onChange={(e) => setPinValue(e.target.value.replace(/\D/g, "").slice(0, 4))}
            className="text-center text-2xl tracking-[0.5em] font-mono"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPinDialog({ open: false, employee: null })}>Cancel</Button>
            <Button onClick={handleSetPin} disabled={saving || pinValue.length !== 4}>Save PIN</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Employees;
