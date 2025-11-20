import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

export function ComplianceDashboard() {
  const [timeRange, setTimeRange] = useState<"today" | "week" | "month">("today");
  const [selectedTruck, setSelectedTruck] = useState<string>("all");

  const { data: trucks } = useQuery({
    queryKey: ["trucks"],
    queryFn: async () => {
      const { data, error } = await supabase.from("trucks").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: scores } = useQuery({
    queryKey: ["compliance-scores", timeRange, selectedTruck],
    queryFn: async () => {
      const now = new Date();
      let startDate;

      switch (timeRange) {
        case "today":
          startDate = startOfDay(now);
          break;
        case "week":
          startDate = subDays(now, 7);
          break;
        case "month":
          startDate = subDays(now, 30);
          break;
      }

      let query = supabase
        .from("compliance_checklists")
        .select("*")
        .gte("checklist_date", format(startDate, "yyyy-MM-dd"));

      if (selectedTruck !== "all") {
        query = query.eq("truck_id", selectedTruck);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Calculate scores
      const total = data.length;
      const completed = data.filter((c) => c.completed_at).length;
      const flagged = data.filter((c) => c.flagged).length;
      const passed = data.filter((c) => c.quality_score === "pass").length;
      const failed = data.filter((c) => c.quality_score === "fail").length;
      const needsImprovement = data.filter((c) => c.quality_score === "needs_improvement").length;

      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
      
      let statusColor = "green";
      if (flagged > 0 || failed > 0) statusColor = "red";
      else if (completionRate < 100 || needsImprovement > 0) statusColor = "yellow";

      return {
        total,
        completed,
        flagged,
        passed,
        failed,
        needsImprovement,
        completionRate,
        statusColor,
      };
    },
  });

  const getStatusBadge = () => {
    if (!scores) return null;
    
    const { statusColor } = scores;
    
    if (statusColor === "green") {
      return (
        <Badge className="bg-green-600">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Excellent
        </Badge>
      );
    } else if (statusColor === "yellow") {
      return (
        <Badge className="bg-amber-600">
          <AlertTriangle className="mr-1 h-3 w-3" />
          Needs Attention
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-red-600">
          <XCircle className="mr-1 h-3 w-3" />
          Critical Issues
        </Badge>
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <Select value={timeRange} onValueChange={(v: any) => setTimeRange(v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">Last 7 Days</SelectItem>
            <SelectItem value="month">Last 30 Days</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedTruck} onValueChange={setSelectedTruck}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Trucks" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Trucks</SelectItem>
            {trucks?.map((truck) => (
              <SelectItem key={truck.id} value={truck.id}>
                {truck.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Completion Rate</CardTitle>
            <CardDescription>Checklists completed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{scores?.completionRate}%</div>
            <p className="text-sm text-muted-foreground">
              {scores?.completed} / {scores?.total} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quality Score</CardTitle>
            <CardDescription>Overall status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">{getStatusBadge()}</div>
            <p className="text-sm text-muted-foreground mt-2">
              {scores?.passed} passed, {scores?.needsImprovement} need improvement
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Flagged Items</CardTitle>
            <CardDescription>Require review</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">{scores?.flagged}</div>
            <p className="text-sm text-muted-foreground">Items need attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Failed Checks</CardTitle>
            <CardDescription>Critical issues</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{scores?.failed}</div>
            <p className="text-sm text-muted-foreground">Require immediate action</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
