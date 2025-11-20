import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, XCircle } from "lucide-react";

interface QualityScoringProps {
  score: "pass" | "needs_improvement" | "fail" | null;
  onScoreChange: (score: "pass" | "needs_improvement" | "fail") => void;
}

export function QualityScoring({ score, onScoreChange }: QualityScoringProps) {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <Label className="text-base font-medium">Overall Quality Score *</Label>
      <p className="text-sm text-muted-foreground">
        Rate the overall quality of this checklist completion
      </p>

      <div className="flex gap-3">
        <Button
          type="button"
          variant={score === "pass" ? "default" : "outline"}
          onClick={() => onScoreChange("pass")}
          className={score === "pass" ? "bg-green-600 hover:bg-green-700" : ""}
        >
          <CheckCircle2 className="mr-2 h-4 w-4" />
          Pass
        </Button>

        <Button
          type="button"
          variant={score === "needs_improvement" ? "default" : "outline"}
          onClick={() => onScoreChange("needs_improvement")}
          className={score === "needs_improvement" ? "bg-amber-600 hover:bg-amber-700" : ""}
        >
          <AlertCircle className="mr-2 h-4 w-4" />
          Needs Improvement
        </Button>

        <Button
          type="button"
          variant={score === "fail" ? "default" : "outline"}
          onClick={() => onScoreChange("fail")}
          className={score === "fail" ? "bg-red-600 hover:bg-red-700" : ""}
        >
          <XCircle className="mr-2 h-4 w-4" />
          Fail
        </Button>
      </div>
    </div>
  );
}
