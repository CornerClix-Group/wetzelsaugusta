import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, KeyRound, RotateCcw, Plus, ArrowUpCircle, ArrowDownCircle, UserX } from "lucide-react";
import { toast } from "sonner";

const Employees = () => {
  const [clockEmployees, setClockEmployees] = useState<any[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [addDialog, setAddDialog] = useState(false);
  const [newName, setNewName] = useState("");
  const [promoteDialog, setPromoteDialog] = useState<{ open: boolean; employee: any | null }>({ open: false, employee: null });
  const [promoteRole, setPromoteRole] = useState("manager");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const [{ data: ce }, { data: roles }] = await Promise.all([
      supabase.from("clock_employees").select("*").order("full_name"),
      supabase.from("user_roles").select("*"),
    ]);
    setClockEmployees(ce || []);
    if (user) {
      const myRole = (roles || []).find((r: any) => r.user_id === user.id);
      setCurrentUserRole(myRole?.role || null);
    }
  };

  const isOwner = currentUserRole === "owner";

  const handleAddEmployee = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("clock_employees").insert({ full_name: newName.trim() });
    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`${newName.trim()} added`);
      setNewName("");
      setAddDialog(false);
      fetchData();
    }
  };

  const handleResetPin = async (emp: any) => {
    const { error } = await supabase
      .from("clock_employees")
      .update({ pin_code: null })
      .eq("id", emp.id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`PIN reset for ${emp.full_name}`);
      fetchData();
    }
  };

  const handleDeactivate = async (emp: any) => {
    const { error } = await supabase
      .from("clock_employees")
      .update({ is_active: !emp.is_active })
      .eq("id", emp.id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`${emp.full_name} ${emp.is_active ? "deactivated" : "reactivated"}`);
      fetchData();
    }
  };

  const handlePromote = async () => {
    if (!promoteDialog.employee) return;
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/create-employee-account`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            clock_employee_id: promoteDialog.employee.id,
            role: promoteRole,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(data.message);
      setPromoteDialog({ open: false, employee: null });
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Promotion failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDemote = async (emp: any) => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/demote-employee`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ clock_employee_id: emp.id }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(data.message);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Demotion failed");
    } finally {
      setSaving(false);
    }
  };

  const activeEmployees = clockEmployees.filter((e) => e.is_active);
  const inactiveEmployees = clockEmployees.filter((e) => !e.is_active);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Employees</h2>
        {isOwner && (
          <Button onClick={() => setAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Employee
          </Button>
        )}
      </div>

      {/* Active Employees */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {activeEmployees.map((emp) => (
          <Card key={emp.id}>
            <CardHeader className="flex flex-row items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">{emp.full_name}</CardTitle>
                <div className="flex gap-1 mt-1">
                  <Badge variant={emp.role === "employee" ? "secondary" : "default"}>
                    {emp.role}
                  </Badge>
                  {emp.pin_code && <Badge variant="outline">PIN set</Badge>}
                  {emp.linked_user_id && <Badge variant="outline">Dashboard access</Badge>}
                </div>
              </div>
            </CardHeader>
            {isOwner && (
              <CardContent className="flex flex-wrap gap-2">
                {emp.pin_code && (
                  <Button size="sm" variant="outline" onClick={() => handleResetPin(emp)}>
                    <RotateCcw className="h-3.5 w-3.5 mr-1" />
                    Reset PIN
                  </Button>
                )}
                {emp.role === "employee" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setPromoteDialog({ open: true, employee: emp });
                      setPromoteRole("manager");
                    }}
                  >
                    <ArrowUpCircle className="h-3.5 w-3.5 mr-1" />
                    Promote
                  </Button>
                )}
                {emp.role !== "employee" && (
                  <Button size="sm" variant="outline" onClick={() => handleDemote(emp)}>
                    <ArrowDownCircle className="h-3.5 w-3.5 mr-1" />
                    Demote
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => handleDeactivate(emp)}>
                  <UserX className="h-3.5 w-3.5 mr-1" />
                  Deactivate
                </Button>
              </CardContent>
            )}
          </Card>
        ))}
        {activeEmployees.length === 0 && (
          <p className="text-muted-foreground col-span-full text-center py-12">
            No employees yet. Add your first employee above.
          </p>
        )}
      </div>

      {/* Inactive Employees */}
      {inactiveEmployees.length > 0 && (
        <>
          <h3 className="text-lg font-semibold text-muted-foreground">Inactive</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {inactiveEmployees.map((emp) => (
              <Card key={emp.id} className="opacity-60">
                <CardHeader className="flex flex-row items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <Users className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{emp.full_name}</CardTitle>
                    <Badge variant="secondary">Inactive</Badge>
                  </div>
                </CardHeader>
                {isOwner && (
                  <CardContent>
                    <Button size="sm" variant="outline" onClick={() => handleDeactivate(emp)}>
                      Reactivate
                    </Button>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Add Employee Dialog */}
      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Employee</DialogTitle>
            <DialogDescription>Enter the employee's name. They'll set their PIN on the terminal.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input
              placeholder="John Doe"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAddEmployee} disabled={saving || !newName.trim()}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Promote Dialog */}
      <Dialog open={promoteDialog.open} onOpenChange={(open) => setPromoteDialog({ open, employee: open ? promoteDialog.employee : null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Promote {promoteDialog.employee?.full_name}</DialogTitle>
            <DialogDescription>
              This will give them dashboard access via their PIN. A hidden account will be created automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={promoteRole} onValueChange={setPromoteRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="shift_lead">Shift Lead</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPromoteDialog({ open: false, employee: null })}>Cancel</Button>
            <Button onClick={handlePromote} disabled={saving}>
              {saving ? "Promoting..." : "Promote"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Employees;
