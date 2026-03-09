import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, CheckCircle2, AlertCircle, Flag } from "lucide-react";
import { ChecklistForm } from "@/components/compliance/ChecklistForm";
import { ChecklistHistory } from "@/components/compliance/ChecklistHistory";
import { ComplianceDashboard } from "@/components/compliance/ComplianceDashboard";
import { QSCEVisitForm } from "@/components/compliance/QSCEVisitForm";
import { QSCEHistory } from "@/components/compliance/QSCEHistory";

const checklistTypes = [
  { value: "opening", label: "Opening Checklist" },
  { value: "prep", label: "Prep Checklist" },
  { value: "quality", label: "Quality Inspection" },
  { value: "food_safety", label: "Food Safety" },
  { value: "temperature", label: "Temperature Logs" },
  { value: "closing", label: "Closing Checklist" },
];

export default function Compliance() {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedTruck, setSelectedTruck] = useState<string>("");
  const [showQSCEForm, setShowQSCEForm] = useState(false);

  const { data: trucks } = useQuery({
    queryKey: ["trucks"],
    queryFn: async () => {
      const { data, error } = await supabase.from("trucks").select("*").eq("status", "active").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: todaysChecklists } = useQuery({
    queryKey: ["todays-checklists", selectedTruck],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      let query = supabase.from("compliance_checklists").select("*").eq("checklist_date", today);
      if (selectedTruck) query = query.eq("truck_id", selectedTruck);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!selectedTruck,
  });

  const getChecklistStatus = (type: string) => {
    const checklist = todaysChecklists?.find((c) => c.checklist_type === type);
    return checklist?.completed_at ? "complete" : "incomplete";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Compliance & QSCE</h1>
          <p className="text-muted-foreground mt-1">Wetzel's Pretzels QSCE Standards — 250 Point System</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Location</CardTitle>
          <CardDescription>Choose a truck/location to view or create checklists</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedTruck} onValueChange={setSelectedTruck}>
            <SelectTrigger><SelectValue placeholder="Select a truck" /></SelectTrigger>
            <SelectContent>
              {trucks?.map((truck) => (
                <SelectItem key={truck.id} value={truck.id}>{truck.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedTruck && (
        <Tabs defaultValue="qsce" className="space-y-6">
          <TabsList>
            <TabsTrigger value="qsce">QSCE Visits</TabsTrigger>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="today">Daily Checklists</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="qsce" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">QSCE Visit History</h2>
              <Button onClick={() => setShowQSCEForm(true)}>
                <Plus className="mr-2 h-4 w-4" /> New QSCE Visit
              </Button>
            </div>
            <QSCEHistory truckId={selectedTruck} />
          </TabsContent>

          <TabsContent value="dashboard">
            <ComplianceDashboard />
          </TabsContent>

          <TabsContent value="today" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {checklistTypes.map((type) => {
                const status = getChecklistStatus(type.value);
                return (
                  <Card key={type.value} className="relative overflow-hidden">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{type.label}</CardTitle>
                        <div className="flex items-center gap-2">
                          {status === "complete" ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-amber-500" />
                          )}
                          {todaysChecklists?.find((c) => c.checklist_type === type.value)?.flagged && (
                            <Flag className="h-5 w-5 text-destructive" />
                          )}
                        </div>
                      </div>
                      <CardDescription>{status === "complete" ? "Completed" : "Not completed"}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button onClick={() => setSelectedType(type.value)} className="w-full" variant={status === "complete" ? "outline" : "default"}>
                        <Plus className="mr-2 h-4 w-4" />
                        {status === "complete" ? "View/Edit" : "Start Checklist"}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="history">
            <ChecklistHistory truckId={selectedTruck} />
          </TabsContent>
        </Tabs>
      )}

      {selectedType && selectedTruck && (
        <ChecklistForm type={selectedType} truckId={selectedTruck} onClose={() => setSelectedType(null)} />
      )}

      {showQSCEForm && selectedTruck && (
        <QSCEVisitForm truckId={selectedTruck} onClose={() => setShowQSCEForm(false)} />
      )}
    </div>
  );
}
