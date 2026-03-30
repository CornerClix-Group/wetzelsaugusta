import { useNavigate } from "react-router-dom";
import { Clock, ClipboardCheck, Truck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const stats = [
  { label: "Active Employees", value: "0", sub: "No one clocked in", icon: Users },
  { label: "Active Trucks", value: "0", sub: "No trucks running", icon: Truck },
  { label: "Pending Checklists", value: "0", sub: "All complete", icon: ClipboardCheck },
  { label: "Today's Hours", value: "0h", sub: "Total logged today", icon: Clock },
];

const Dashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-5">
      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
                <s.icon className="h-3.5 w-3.5 text-muted-foreground/50" />
              </div>
              <div className="text-2xl font-semibold tracking-tight">{s.value}</div>
              <p className="text-[11px] text-muted-foreground/60 mt-0.5">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Welcome card */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-5">
          <h3 className="text-base font-semibold tracking-tight">Welcome to Wetzels of Augusta</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Set up your trucks, employees, and operational checklists to get started.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              className="h-9 rounded-lg text-xs font-medium"
              onClick={() => navigate("/dashboard/trucks")}
            >
              <Truck className="mr-1.5 h-3.5 w-3.5" />
              Add Truck
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 rounded-lg text-xs font-medium"
              onClick={() => navigate("/dashboard/employees")}
            >
              <Users className="mr-1.5 h-3.5 w-3.5" />
              Add Employee
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
