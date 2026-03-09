import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";

const Schedule = () => (
  <div className="space-y-6">
    <h2 className="text-2xl font-bold">Schedule</h2>
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Employee Scheduling
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Drag-and-drop scheduling with shift assignments, PTO requests, and overtime warnings coming soon.
        </p>
      </CardContent>
    </Card>
  </div>
);

export default Schedule;
