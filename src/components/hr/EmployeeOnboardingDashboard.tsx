import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, AlertCircle, XCircle, FileText } from "lucide-react";

export function EmployeeOnboardingDashboard() {
  const { data: employees, isLoading } = useQuery({
    queryKey: ["all-employee-onboarding"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_onboarding")
        .select(`
          *,
          profiles:user_id (full_name, email)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: allProfiles } = useQuery({
    queryKey: ["all-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .order("full_name");

      if (error) throw error;
      return data;
    },
  });

  const employeesWithOnboarding = new Set(employees?.map((e) => e.user_id) || []);
  const employeesWithoutOnboarding = allProfiles?.filter(
    (p) => !employeesWithOnboarding.has(p.id)
  );

  const getCompletionPercentage = (employee: any) => {
    const steps = [
      employee.w4_completed,
      employee.direct_deposit_completed,
      employee.emergency_contacts_completed,
      employee.documents_completed,
      employee.policies_completed,
    ];
    const completed = steps.filter(Boolean).length;
    return (completed / steps.length) * 100;
  };

  const getStatusBadge = (employee: any) => {
    if (employee.onboarding_completed) {
      return (
        <Badge className="bg-green-600">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Complete
        </Badge>
      );
    }

    const percentage = getCompletionPercentage(employee);
    if (percentage === 0) {
      return (
        <Badge variant="destructive">
          <XCircle className="mr-1 h-3 w-3" />
          Not Started
        </Badge>
      );
    }

    return (
      <Badge className="bg-amber-600">
        <AlertCircle className="mr-1 h-3 w-3" />
        In Progress
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-foreground">Employee Onboarding Dashboard</h1>
          <p className="text-muted-foreground mt-2">Monitor employee onboarding progress</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Total Employees</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{allProfiles?.length || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Onboarding Complete</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {employees?.filter((e) => e.onboarding_completed).length || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pending Onboarding</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-600">
                {employees?.filter((e) => !e.onboarding_completed).length || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Employee Onboarding Status</CardTitle>
            <CardDescription>Track completion of required onboarding steps</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {employees?.map((employee) => {
                const profile = (employee as any).profiles;
                const percentage = getCompletionPercentage(employee);

                return (
                  <div key={employee.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">{profile?.full_name || "Unknown"}</h4>
                        <p className="text-sm text-muted-foreground">{profile?.email}</p>
                      </div>
                      {getStatusBadge(employee)}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Onboarding Progress</span>
                        <span className="font-medium">{Math.round(percentage)}%</span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                      <div className="flex items-center gap-1">
                        {employee.w4_completed ? (
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                        ) : (
                          <XCircle className="h-3 w-3 text-red-500" />
                        )}
                        <span>W-4</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {employee.direct_deposit_completed ? (
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                        ) : (
                          <XCircle className="h-3 w-3 text-red-500" />
                        )}
                        <span>Direct Deposit</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {employee.emergency_contacts_completed ? (
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                        ) : (
                          <XCircle className="h-3 w-3 text-red-500" />
                        )}
                        <span>Contacts</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {employee.documents_completed ? (
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                        ) : (
                          <XCircle className="h-3 w-3 text-red-500" />
                        )}
                        <span>Documents</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {employee.policies_completed ? (
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                        ) : (
                          <XCircle className="h-3 w-3 text-red-500" />
                        )}
                        <span>Policies</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {employeesWithoutOnboarding && employeesWithoutOnboarding.length > 0 && (
                <div className="border-t pt-4 mt-4">
                  <h4 className="font-semibold mb-3">Employees Not Yet Started</h4>
                  {employeesWithoutOnboarding.map((profile) => (
                    <div key={profile.id} className="flex items-center justify-between py-2">
                      <div>
                        <p className="font-medium">{profile.full_name}</p>
                        <p className="text-sm text-muted-foreground">{profile.email}</p>
                      </div>
                      <Badge variant="destructive">
                        <FileText className="mr-1 h-3 w-3" />
                        Not Started
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
