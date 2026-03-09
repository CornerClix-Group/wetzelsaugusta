import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

const Employees = () => {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const [{ data: p }, { data: r }] = await Promise.all([
        supabase.from("profiles").select("*").order("full_name"),
        supabase.from("user_roles").select("*"),
      ]);
      setProfiles(p || []);
      setRoles(r || []);
    };
    fetch();
  }, []);

  const getRole = (userId: string) => {
    const r = roles.find(r => r.user_id === userId);
    return r?.role || "employee";
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Employees</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {profiles.map(p => (
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
            <CardContent className="flex gap-2">
              <Badge>{getRole(p.id)}</Badge>
              {p.pin_code && <Badge variant="outline">PIN set</Badge>}
            </CardContent>
          </Card>
        ))}
        {profiles.length === 0 && <p className="text-muted-foreground col-span-full text-center py-12">No employees found</p>}
      </div>
    </div>
  );
};

export default Employees;
