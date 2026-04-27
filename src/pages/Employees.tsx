import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, RotateCcw, Plus, ArrowUpCircle, ArrowDownCircle, UserX, Trash2, Briefcase, Mail, FileText, Send, Pencil, Shield, KeyRound, DollarSign } from "lucide-react";
import { toast } from "sonner";

const ROLE_LABELS: Record<string, { label: string; className: string }> = {
  owner: { label: "Owner", className: "bg-purple-100 text-purple-800 border-purple-200" },
  franchise_owner: { label: "Franchise Owner", className: "bg-purple-100 text-purple-700 border-purple-200" },
  manager: { label: "Manager", className: "bg-blue-100 text-blue-800 border-blue-200" },
  shift_lead: { label: "Shift Lead", className: "bg-amber-100 text-amber-800 border-amber-200" },
  business_manager: { label: "Business Manager", className: "bg-teal-100 text-teal-800 border-teal-200" },
  employee: { label: "Employee", className: "bg-secondary text-secondary-foreground" },
};

const PERMISSION_MODULES = [
  { key: "compliance", label: "Compliance" },
  { key: "inventory", label: "Inventory" },
  { key: "trucks", label: "Trucks" },
  { key: "hr_onboarding", label: "HR & Onboarding" },
  { key: "employees", label: "Employees" },
  { key: "schedule", label: "Schedule" },
];

const Employees = () => {
  const navigate = useNavigate();
  const [clockEmployees, setClockEmployees] = useState<any[]>([]);
  const [businessManagers, setBusinessManagers] = useState<any[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [addDialog, setAddDialog] = useState(false);
  const [hrInviteDialog, setHrInviteDialog] = useState<{ open: boolean; employee: any | null }>({ open: false, employee: null });
  const [hrInviteEmail, setHrInviteEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [promoteDialog, setPromoteDialog] = useState<{ open: boolean; employee: any | null }>({ open: false, employee: null });
  const [promoteRole, setPromoteRole] = useState("manager");
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; employee: any | null }>({ open: false, employee: null });
  const [inviteBMDialog, setInviteBMDialog] = useState(false);
  const [bmName, setBmName] = useState("");
  const [bmEmail, setBmEmail] = useState("");
  const [removeBMDialog, setRemoveBMDialog] = useState<{ open: boolean; manager: any | null }>({ open: false, manager: null });
  const [saving, setSaving] = useState(false);

  // Edit employee dialog
  const [editDialog, setEditDialog] = useState<{ open: boolean; employee: any | null }>({ open: false, employee: null });
  const [editFullName, setEditFullName] = useState("");
  const [editDisplayName, setEditDisplayName] = useState("");

  // Permissions dialog
  const [permDialog, setPermDialog] = useState<{ open: boolean; employee: any | null }>({ open: false, employee: null });
  const [permToggles, setPermToggles] = useState<Record<string, boolean>>({});

  // Set PIN dialog
  const [setPinDialog, setSetPinDialog] = useState<{ open: boolean; employee: any | null }>({ open: false, employee: null });
  const [newPin, setNewPin] = useState("");

  // Pay dialog
  const [payDialog, setPayDialog] = useState<{ open: boolean; employee: any | null }>({ open: false, employee: null });
  const [payRate, setPayRate] = useState(""); // dollars
  const [payMinimum, setPayMinimum] = useState(""); // dollars
  const [payEmail, setPayEmail] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const [{ data: ce }, { data: roles }, { data: profiles }] = await Promise.all([
      supabase.from("clock_employees").select("*").order("full_name"),
      supabase.from("user_roles").select("*"),
      supabase.from("profiles").select("*"),
    ]);
    setClockEmployees(ce || []);

    if (user) {
      const myRole = (roles || []).find((r: any) => r.user_id === user.id);
      setCurrentUserRole(myRole?.role || null);
    }

    const bmRoles = (roles || []).filter((r: any) => r.role === "business_manager");
    const bms = bmRoles.map((r: any) => {
      const profile = (profiles || []).find((p: any) => p.id === r.user_id);
      return {
        user_id: r.user_id,
        full_name: profile?.full_name || "Unknown",
        email: profile?.email || "",
      };
    });
    setBusinessManagers(bms);
  };

  const isOwner = currentUserRole === "owner";

  const callEdgeFunction = async (name: string, body: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated");
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const res = await fetch(
      `https://${projectId}.supabase.co/functions/v1/${name}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  };

  const handleAddEmployee = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("clock_employees").insert({
      full_name: newName.trim(),
      display_name: newDisplayName.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`${newName.trim()} added`);
      setNewName("");
      setNewDisplayName("");
      setAddDialog(false);
      fetchData();
    }
  };

  const handleEditEmployee = async () => {
    if (!editDialog.employee || !editFullName.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from("clock_employees")
      .update({
        full_name: editFullName.trim(),
        display_name: editDisplayName.trim() || null,
      })
      .eq("id", editDialog.employee.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Employee updated");
      setEditDialog({ open: false, employee: null });
      fetchData();
    }
  };

  const openPermDialog = async (emp: any) => {
    // Fetch existing permissions for this employee
    const { data } = await supabase
      .from("employee_permissions")
      .select("permission, granted")
      .eq("clock_employee_id", emp.id);

    const toggles: Record<string, boolean> = {};
    PERMISSION_MODULES.forEach((m) => {
      const found = (data || []).find((p: any) => p.permission === m.key);
      toggles[m.key] = found?.granted ?? false;
    });
    setPermToggles(toggles);
    setPermDialog({ open: true, employee: emp });
  };

  const handleSavePermissions = async () => {
    if (!permDialog.employee) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    for (const mod of PERMISSION_MODULES) {
      await supabase
        .from("employee_permissions")
        .upsert(
          {
            clock_employee_id: permDialog.employee.id,
            permission: mod.key,
            granted: permToggles[mod.key] ?? false,
            granted_by: user?.id,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "clock_employee_id,permission" }
        );
    }

    setSaving(false);
    toast.success("Permissions saved");
    setPermDialog({ open: false, employee: null });
  };

  const handleResetPin = async (emp: any) => {
    const { error } = await supabase
      .from("clock_employees")
      .update({ pin_code: null })
      .eq("id", emp.id);
    if (error) toast.error(error.message);
    else { toast.success(`PIN reset for ${emp.full_name}`); fetchData(); }
  };

  const handleDeactivate = async (emp: any) => {
    setSaving(true);
    try {
      if (emp.linked_user_id && emp.is_active) {
        await callEdgeFunction("demote-employee", { clock_employee_id: emp.id });
      }
      const { error } = await supabase
        .from("clock_employees")
        .update({ is_active: !emp.is_active })
        .eq("id", emp.id);
      if (error) throw new Error(error.message);
      toast.success(`${emp.full_name} ${emp.is_active ? "deactivated" : "reactivated"}`);
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePromote = async () => {
    if (!promoteDialog.employee) return;
    setSaving(true);
    try {
      const data = await callEdgeFunction("create-employee-account", {
        clock_employee_id: promoteDialog.employee.id,
        role: promoteRole,
      });
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
      const data = await callEdgeFunction("demote-employee", { clock_employee_id: emp.id });
      toast.success(data.message);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Demotion failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.employee) return;
    const emp = deleteDialog.employee;
    setSaving(true);
    try {
      if (emp.linked_user_id) {
        await callEdgeFunction("demote-employee", { clock_employee_id: emp.id });
      }
      const { error } = await supabase.from("clock_employees").delete().eq("id", emp.id);
      if (error) throw new Error(error.message);
      toast.success(`${emp.full_name} deleted`);
      setDeleteDialog({ open: false, employee: null });
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Delete failed");
    } finally {
      setSaving(false);
    }
  };

  const handleInviteBM = async () => {
    if (!bmName.trim() || !bmEmail.trim()) return;
    setSaving(true);
    try {
      const data = await callEdgeFunction("invite-business-manager", {
        full_name: bmName.trim(),
        email: bmEmail.trim(),
      });
      toast.success(data.message);
      setBmName("");
      setBmEmail("");
      setInviteBMDialog(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Invite failed");
    } finally {
      setSaving(false);
    }
  };

  const handleResendInvite = async (bm: any) => {
    setSaving(true);
    try {
      const data = await callEdgeFunction("resend-invite", { user_id: bm.user_id });
      toast.success(data.message);
    } catch (error: any) {
      toast.error(error.message || "Failed to resend invite");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveBM = async () => {
    if (!removeBMDialog.manager) return;
    setSaving(true);
    try {
      const data = await callEdgeFunction("demote-employee", { user_id: removeBMDialog.manager.user_id });
      toast.success(data.message);
      setRemoveBMDialog({ open: false, manager: null });
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Remove failed");
    } finally {
      setSaving(false);
    }
  };

  const activeEmployees = clockEmployees.filter((e) => e.is_active);
  const inactiveEmployees = clockEmployees.filter((e) => !e.is_active);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-2xl font-bold">Employees</h2>
        {isOwner && (
          <div className="flex gap-2">
            <Button onClick={() => setInviteBMDialog(true)} variant="outline">
              <Briefcase className="h-4 w-4 mr-2" />
              Invite Business Manager
            </Button>
            <Button onClick={() => { setAddDialog(true); setNewName(""); setNewDisplayName(""); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
          </div>
        )}
      </div>

      {/* Business Managers Section */}
      {businessManagers.length > 0 && (
        <>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Business Managers
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {businessManagers.map((bm) => (
              <Card key={bm.user_id}>
                <CardHeader className="flex flex-row items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-accent/50 flex items-center justify-center">
                    <Briefcase className="h-5 w-5 text-accent-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{bm.full_name}</CardTitle>
                    <div className="flex flex-col gap-1 mt-1">
                      <Badge variant="default">Business Manager</Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {bm.email}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                {isOwner && (
                  <CardContent className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleResendInvite(bm)} disabled={saving}>
                      <Mail className="h-3.5 w-3.5 mr-1" />
                      Resend Invite
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => setRemoveBMDialog({ open: true, manager: bm })}>
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Remove
                    </Button>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Active Employees */}
      <h3 className="text-lg font-semibold">Active Employees</h3>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {activeEmployees.map((emp) => (
          <Card key={emp.id}>
            <CardHeader className="flex flex-row items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">{emp.full_name}</CardTitle>
                {emp.display_name && (
                  <p className="text-xs text-muted-foreground">Display: {emp.display_name}</p>
                )}
                <div className="flex gap-1 mt-1 flex-wrap">
                  <Badge variant="outline" className={ROLE_LABELS[emp.role]?.className || ""}>
                    {ROLE_LABELS[emp.role]?.label || emp.role}
                  </Badge>
                  {emp.pin_code && <Badge variant="outline">PIN set</Badge>}
                  {emp.linked_user_id && <Badge variant="outline">Dashboard access</Badge>}
                </div>
              </div>
            </CardHeader>
            {isOwner && (
              <CardContent className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditDialog({ open: true, employee: emp });
                    setEditFullName(emp.full_name);
                    setEditDisplayName(emp.display_name || "");
                  }}
                >
                  <Pencil className="h-3.5 w-3.5 mr-1" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openPermDialog(emp)}
                >
                  <Shield className="h-3.5 w-3.5 mr-1" />
                  Permissions
                </Button>
                {emp.pin_code ? (
                  <Button size="sm" variant="outline" onClick={() => handleResetPin(emp)}>
                    <RotateCcw className="h-3.5 w-3.5 mr-1" />
                    Reset PIN
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSetPinDialog({ open: true, employee: emp });
                      setNewPin("");
                    }}
                  >
                    <KeyRound className="h-3.5 w-3.5 mr-1" />
                    Set PIN
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
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/dashboard/hr-onboarding?for=${emp.id}&name=${encodeURIComponent(emp.full_name)}`)}
                >
                  <FileText className="h-3.5 w-3.5 mr-1" />
                  Fill HR Info
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setHrInviteDialog({ open: true, employee: emp });
                    setHrInviteEmail("");
                  }}
                >
                  <Send className="h-3.5 w-3.5 mr-1" />
                  Send HR Invite
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleDeactivate(emp)}>
                  <UserX className="h-3.5 w-3.5 mr-1" />
                  Deactivate
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeleteDialog({ open: true, employee: emp })}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Delete
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
                  <CardContent className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleDeactivate(emp)}>
                      Reactivate
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteDialog({ open: true, employee: emp })}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Delete
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
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name (legal/payroll)</Label>
              <Input placeholder="John Doe" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Display Name (shown on terminal)</Label>
              <Input placeholder="John" value={newDisplayName} onChange={(e) => setNewDisplayName(e.target.value)} />
              <p className="text-xs text-muted-foreground">Optional — defaults to full name if left blank</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAddEmployee} disabled={saving || !newName.trim()}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Employee Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ open, employee: open ? editDialog.employee : null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {editDialog.employee?.full_name}</DialogTitle>
            <DialogDescription>Update the employee's name details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name (legal/payroll)</Label>
              <Input value={editFullName} onChange={(e) => setEditFullName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Display Name (shown on terminal)</Label>
              <Input
                placeholder="Leave blank to use full name"
                value={editDisplayName}
                onChange={(e) => setEditDisplayName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, employee: null })}>Cancel</Button>
            <Button onClick={handleEditEmployee} disabled={saving || !editFullName.trim()}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permissions Dialog */}
      <Dialog open={permDialog.open} onOpenChange={(open) => setPermDialog({ open, employee: open ? permDialog.employee : null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Permissions: {permDialog.employee?.display_name || permDialog.employee?.full_name}</DialogTitle>
            <DialogDescription>Toggle which modules this employee can access on the dashboard.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {PERMISSION_MODULES.map((mod) => (
              <div key={mod.key} className="flex items-center justify-between">
                <Label className="text-sm font-medium">{mod.label}</Label>
                <Switch
                  checked={permToggles[mod.key] ?? false}
                  onCheckedChange={(checked) =>
                    setPermToggles((prev) => ({ ...prev, [mod.key]: checked }))
                  }
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPermDialog({ open: false, employee: null })}>Cancel</Button>
            <Button onClick={handleSavePermissions} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
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
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="shift_lead">Shift Lead</SelectItem>
                <SelectItem value="business_manager">Business Manager</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPromoteDialog({ open: false, employee: null })}>Cancel</Button>
            <Button onClick={handlePromote} disabled={saving}>{saving ? "Promoting..." : "Promote"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, employee: open ? deleteDialog.employee : null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {deleteDialog.employee?.full_name}?</DialogTitle>
            <DialogDescription>
              This will permanently remove this employee. If they have dashboard access, it will be revoked.
              Their historical time entries will be preserved for payroll records.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, employee: null })}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? "Deleting..." : "Delete Employee"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Business Manager Dialog */}
      <Dialog open={inviteBMDialog} onOpenChange={setInviteBMDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Business Manager</DialogTitle>
            <DialogDescription>
              They'll receive an email invite to set up their account and can then log in at the dashboard.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input placeholder="Jane Smith" value={bmName} onChange={(e) => setBmName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" placeholder="jane@example.com" value={bmEmail} onChange={(e) => setBmEmail(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteBMDialog(false)}>Cancel</Button>
            <Button onClick={handleInviteBM} disabled={saving || !bmName.trim() || !bmEmail.trim()}>
              {saving ? "Inviting..." : "Send Invite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Business Manager Confirmation */}
      <Dialog open={removeBMDialog.open} onOpenChange={(open) => setRemoveBMDialog({ open, manager: open ? removeBMDialog.manager : null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove {removeBMDialog.manager?.full_name}?</DialogTitle>
            <DialogDescription>
              This will permanently revoke their dashboard access and delete their account.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveBMDialog({ open: false, manager: null })}>Cancel</Button>
            <Button variant="destructive" onClick={handleRemoveBM} disabled={saving}>
              {saving ? "Removing..." : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set PIN Dialog */}
      <Dialog open={setPinDialog.open} onOpenChange={(open) => setSetPinDialog({ open, employee: open ? setPinDialog.employee : null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set PIN for {setPinDialog.employee?.full_name}</DialogTitle>
            <DialogDescription>
              Enter a 4-digit PIN for this employee to use on the time clock terminal.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>4-Digit PIN</Label>
            <Input
              type="text"
              inputMode="numeric"
              pattern="\d{4}"
              maxLength={4}
              placeholder="e.g. 1234"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              className="text-center text-2xl tracking-widest"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSetPinDialog({ open: false, employee: null })}>Cancel</Button>
            <Button
              onClick={async () => {
                if (!setPinDialog.employee || !/^\d{4}$/.test(newPin)) {
                  toast.error("Please enter a valid 4-digit PIN");
                  return;
                }
                setSaving(true);
                try {
                  const { error } = await supabase
                    .from("clock_employees")
                    .update({ pin_code: newPin })
                    .eq("id", setPinDialog.employee.id);
                  if (error) throw error;
                  toast.success(`PIN set for ${setPinDialog.employee.full_name}`);
                  setSetPinDialog({ open: false, employee: null });
                  setNewPin("");
                  fetchData();
                } catch (error: any) {
                  toast.error(error.message || "Failed to set PIN");
                } finally {
                  setSaving(false);
                }
              }}
              disabled={saving || newPin.length !== 4}
            >
              {saving ? "Saving..." : "Set PIN"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send HR Invite Dialog */}
      <Dialog open={hrInviteDialog.open} onOpenChange={(open) => setHrInviteDialog({ open, employee: open ? hrInviteDialog.employee : null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send HR Invite to {hrInviteDialog.employee?.full_name}</DialogTitle>
            <DialogDescription>
              They'll receive an email to set up their account and complete their own HR paperwork (W-4, direct deposit, emergency contacts, etc.).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Email Address</Label>
            <Input
              type="email"
              placeholder="employee@example.com"
              value={hrInviteEmail}
              onChange={(e) => setHrInviteEmail(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHrInviteDialog({ open: false, employee: null })}>Cancel</Button>
            <Button
              onClick={async () => {
                if (!hrInviteDialog.employee || !hrInviteEmail.trim()) return;
                setSaving(true);
                try {
                  const data = await callEdgeFunction("create-employee-account", {
                    clock_employee_id: hrInviteDialog.employee.id,
                    role: "employee",
                    email: hrInviteEmail.trim(),
                    send_invite: true,
                  });
                  toast.success(data.message || `HR invite sent to ${hrInviteEmail.trim()}`);
                  setHrInviteDialog({ open: false, employee: null });
                  setHrInviteEmail("");
                  fetchData();
                } catch (error: any) {
                  toast.error(error.message || "Failed to send HR invite");
                } finally {
                  setSaving(false);
                }
              }}
              disabled={saving || !hrInviteEmail.trim()}
            >
              {saving ? "Sending..." : "Send Invite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Employees;
