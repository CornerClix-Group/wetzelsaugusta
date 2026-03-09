import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getStatusFromPercentage } from "./qsceTemplates";
import { AlertTriangle } from "lucide-react";

interface QSCEScorecardProps {
  visit: {
    id: string;
    visit_date: string;
    cleanliness_score: number;
    cleanliness_possible: number;
    operations_score: number;
    operations_possible: number;
    service_score: number;
    service_possible: number;
    total_score: number;
    total_possible: number;
    percentage: number;
    compliance_issues: string[];
    franchisee_name?: string;
    kahala_store_number?: string;
  };
}

export function QSCEScorecard({ visit }: QSCEScorecardProps) {
  const status = getStatusFromPercentage(visit.percentage);

  const scoreBar = (label: string, score: number, possible: number) => {
    const pct = possible > 0 ? (score / possible) * 100 : 0;
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span>{label}</span>
          <span className="font-medium">{score}/{possible}</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              pct >= 95 ? "bg-green-500" : pct >= 85 ? "bg-blue-500" : pct >= 75 ? "bg-yellow-500" : "bg-red-500"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">
              {visit.visit_date}
              {visit.kahala_store_number && <span className="text-muted-foreground text-sm ml-2">Store #{visit.kahala_store_number}</span>}
            </CardTitle>
            {visit.franchisee_name && (
              <p className="text-sm text-muted-foreground">{visit.franchisee_name}</p>
            )}
          </div>
          <div className="text-right">
            <div className={`text-3xl font-bold ${status.color}`}>{visit.percentage}%</div>
            <Badge className={`${status.bgColor} ${status.color} border-0`}>{status.label}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {scoreBar("Cleanliness", visit.cleanliness_score, visit.cleanliness_possible)}
        {scoreBar("Operations", visit.operations_score, visit.operations_possible)}
        {scoreBar("Service", visit.service_score, visit.service_possible)}

        <div className="pt-2 border-t">
          <div className="flex justify-between font-bold">
            <span>Total</span>
            <span>{visit.total_score}/{visit.total_possible}</span>
          </div>
        </div>

        {visit.compliance_issues && visit.compliance_issues.length > 0 && (
          <div className="pt-2 border-t space-y-1">
            <div className="flex items-center gap-1 text-destructive text-sm font-medium">
              <AlertTriangle className="h-3 w-3" />
              Compliance Issues
            </div>
            {visit.compliance_issues.map((issue, i) => (
              <p key={i} className="text-xs text-muted-foreground">• {issue}</p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
