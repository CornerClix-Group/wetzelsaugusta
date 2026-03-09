import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { SignaturePad } from "./SignaturePad";
import { toast } from "sonner";
import { Save, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { qsceCategories, complianceIssuesList, getStatusFromPercentage, type QSCEItem } from "./qsceTemplates";

interface QSCEVisitFormProps {
  truckId: string;
  onClose: () => void;
}

export function QSCEVisitForm({ truckId, onClose }: QSCEVisitFormProps) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [startTime] = useState(new Date());

  // Visit info
  const [kahalaStoreNumber, setKahalaStoreNumber] = useState("");
  const [cityState, setCityState] = useState("");
  const [franchiseeEmail, setFranchiseeEmail] = useState("");
  const [franchiseeName, setFranchiseeName] = useState("");
  const [postedHealthScore, setPostedHealthScore] = useState("");
  const [netSales, setNetSales] = useState("");

  // Item scores: id -> { awarded: boolean, notes: string }
  const [itemScores, setItemScores] = useState<Record<string, { awarded: boolean; notes: string }>>(
    () => {
      const initial: Record<string, { awarded: boolean; notes: string }> = {};
      qsceCategories.forEach(cat =>
        cat.sections.forEach(sec =>
          sec.items.forEach(item => {
            initial[item.id] = { awarded: false, notes: "" };
          })
        )
      );
      return initial;
    }
  );

  // Compliance issues
  const [selectedComplianceIssues, setSelectedComplianceIssues] = useState<string[]>([]);

  // Action plan
  const [strengths, setStrengths] = useState("");
  const [opportunities, setOpportunities] = useState("");
  const [summaryComments, setSummaryComments] = useState("");

  // Signatures
  const [franchiseeSignature, setFranchiseeSignature] = useState("");
  const [evaluatorSignature, setEvaluatorSignature] = useState("");

  const toggleItem = (id: string) => {
    setItemScores(prev => ({
      ...prev,
      [id]: { ...prev[id], awarded: !prev[id].awarded },
    }));
  };

  const setItemNotes = (id: string, notes: string) => {
    setItemScores(prev => ({
      ...prev,
      [id]: { ...prev[id], notes },
    }));
  };

  // Calculate scores
  const getCategoryScore = (categoryName: string) => {
    const cat = qsceCategories.find(c => c.name === categoryName);
    if (!cat) return { score: 0, possible: 0 };
    let score = 0;
    let possible = 0;
    cat.sections.forEach(sec =>
      sec.items.forEach(item => {
        possible += item.points;
        if (itemScores[item.id]?.awarded) score += item.points;
      })
    );
    return { score, possible };
  };

  const cleanliness = getCategoryScore("Cleanliness");
  const operations = getCategoryScore("Operations");
  const service = getCategoryScore("Service");
  const totalScore = cleanliness.score + operations.score + service.score;
  const totalPossible = 250;
  const percentage = totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : 0;
  const status = getStatusFromPercentage(percentage);

  // Get flagged compliance items
  const flaggedComplianceItems = qsceCategories.flatMap(cat =>
    cat.sections.flatMap(sec =>
      sec.items.filter(item => item.isCompliance && !itemScores[item.id]?.awarded)
    )
  );

  const handleSubmit = async () => {
    if (!evaluatorSignature) {
      toast.error("Evaluator signature is required");
      return;
    }

    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      const endTime = new Date();

      const { data: visit, error } = await supabase
        .from("qsce_visits")
        .insert({
          truck_id: truckId,
          visit_date: new Date().toISOString().split("T")[0],
          evaluator_id: userData.user.id,
          kahala_store_number: kahalaStoreNumber || null,
          city_state: cityState || null,
          franchisee_email: franchiseeEmail || null,
          franchisee_name: franchiseeName || null,
          posted_health_score: postedHealthScore || null,
          net_sales: netSales || null,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          cleanliness_score: cleanliness.score,
          cleanliness_possible: cleanliness.possible,
          operations_score: operations.score,
          operations_possible: operations.possible,
          service_score: service.score,
          service_possible: service.possible,
          total_score: totalScore,
          total_possible: totalPossible,
          percentage,
          status: percentage <= 74 ? "ooc" : percentage < 85 ? "below" : percentage < 95 ? "meets" : "exceeds",
          compliance_issues: selectedComplianceIssues as any,
          action_plan_strengths: strengths || null,
          action_plan_opportunities: opportunities || null,
          summary_comments: summaryComments || null,
          franchisee_signature: franchiseeSignature || null,
          evaluator_signature: evaluatorSignature,
        } as any)
        .select()
        .single();

      if (error) throw error;

      // Insert individual item scores
      const itemInserts = qsceCategories.flatMap(cat =>
        cat.sections.flatMap(sec =>
          sec.items.map(item => ({
            visit_id: visit.id,
            section_id: item.id,
            points_awarded: itemScores[item.id]?.awarded ? item.points : 0,
            points_possible: item.points,
            is_compliance_item: item.isCompliance,
            notes: itemScores[item.id]?.notes || null,
          }))
        )
      );

      const { error: itemsError } = await supabase
        .from("qsce_visit_items")
        .insert(itemInserts as any);

      if (itemsError) throw itemsError;

      toast.success(`QSCE Visit saved — ${totalScore}/${totalPossible} (${percentage}%)`);
      queryClient.invalidateQueries({ queryKey: ["qsce-visits"] });
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to save QSCE visit");
    } finally {
      setLoading(false);
    }
  };

  const renderSection = (section: typeof qsceCategories[0]["sections"][0]) => (
    <Card key={section.id} className="mb-4">
      <CardHeader className="py-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span>{section.id}. {section.title}</span>
          <Badge variant="outline">{section.totalPoints} pts</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {section.items.map(item => (
          <div
            key={item.id}
            className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
              itemScores[item.id]?.awarded
                ? "bg-green-50 border-green-200"
                : "bg-background border-border"
            }`}
          >
            <button
              onClick={() => toggleItem(item.id)}
              className="mt-0.5 shrink-0"
            >
              {itemScores[item.id]?.awarded ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-muted-foreground" />
              )}
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs text-muted-foreground">{item.id}</span>
                <Badge variant="secondary" className="text-xs">{item.points} pt{item.points > 1 ? "s" : ""}</Badge>
                {item.isCompliance && (
                  <Badge variant="destructive" className="text-xs">▲ Compliance</Badge>
                )}
              </div>
              <p className="text-sm mt-1">{item.label}</p>
              <Input
                placeholder="Notes..."
                value={itemScores[item.id]?.notes || ""}
                onChange={e => setItemNotes(item.id, e.target.value)}
                className="mt-2 text-xs h-8"
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>QSCE Visit Form</span>
            <div className="flex items-center gap-3">
              <span className={`text-2xl font-bold ${status.color}`}>{totalScore}/{totalPossible}</span>
              <Badge className={`${status.bgColor} ${status.color} border-0`}>{status.label}</Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Visit Info */}
        <Card className="mb-4">
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs">Kahala Store #</Label>
                <Input value={kahalaStoreNumber} onChange={e => setKahalaStoreNumber(e.target.value)} className="h-8" />
              </div>
              <div>
                <Label className="text-xs">City/State</Label>
                <Input value={cityState} onChange={e => setCityState(e.target.value)} className="h-8" />
              </div>
              <div>
                <Label className="text-xs">Franchisee</Label>
                <Input value={franchiseeName} onChange={e => setFranchiseeName(e.target.value)} className="h-8" />
              </div>
              <div>
                <Label className="text-xs">Franchisee Email</Label>
                <Input value={franchiseeEmail} onChange={e => setFranchiseeEmail(e.target.value)} className="h-8" />
              </div>
              <div>
                <Label className="text-xs">Posted Health Score</Label>
                <Input value={postedHealthScore} onChange={e => setPostedHealthScore(e.target.value)} className="h-8" />
              </div>
              <div>
                <Label className="text-xs">Net Sales (at end of visit)</Label>
                <Input value={netSales} onChange={e => setNetSales(e.target.value)} className="h-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Score Summary Bar */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Card className="text-center p-3">
            <div className="text-xs text-muted-foreground">Cleanliness</div>
            <div className="text-xl font-bold">{cleanliness.score}/{cleanliness.possible}</div>
          </Card>
          <Card className="text-center p-3">
            <div className="text-xs text-muted-foreground">Operations</div>
            <div className="text-xl font-bold">{operations.score}/{operations.possible}</div>
          </Card>
          <Card className="text-center p-3">
            <div className="text-xs text-muted-foreground">Service</div>
            <div className="text-xl font-bold">{service.score}/{service.possible}</div>
          </Card>
        </div>

        <Tabs defaultValue="cleanliness">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="cleanliness">Cleanliness ({cleanliness.score}/{cleanliness.possible})</TabsTrigger>
            <TabsTrigger value="operations">Operations ({operations.score}/{operations.possible})</TabsTrigger>
            <TabsTrigger value="service">Service ({service.score}/{service.possible})</TabsTrigger>
          </TabsList>

          {qsceCategories.map(cat => (
            <TabsContent key={cat.name} value={cat.name.toLowerCase()} className="space-y-4">
              {cat.sections.map(renderSection)}
            </TabsContent>
          ))}
        </Tabs>

        {/* Compliance Issues */}
        {flaggedComplianceItems.length > 0 && (
          <Card className="border-destructive">
            <CardHeader className="py-3">
              <CardTitle className="text-base text-destructive flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Compliance Issues Detected
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {complianceIssuesList.map(issue => (
                <div key={issue} className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedComplianceIssues.includes(issue)}
                    onCheckedChange={checked => {
                      setSelectedComplianceIssues(prev =>
                        checked ? [...prev, issue] : prev.filter(i => i !== issue)
                      );
                    }}
                  />
                  <span className="text-sm">{issue}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Action Plan */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base">Store Action Plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div>
              <Label className="text-xs">Strengths</Label>
              <Textarea value={strengths} onChange={e => setStrengths(e.target.value)} rows={2} />
            </div>
            <div>
              <Label className="text-xs">Opportunities</Label>
              <Textarea value={opportunities} onChange={e => setOpportunities(e.target.value)} rows={2} />
            </div>
            <div>
              <Label className="text-xs">Summary Comments</Label>
              <Textarea value={summaryComments} onChange={e => setSummaryComments(e.target.value)} rows={3} />
            </div>
          </CardContent>
        </Card>

        {/* Signatures */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base">Franchisee Signature</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <SignaturePad signature={franchiseeSignature} onSignatureChange={setFranchiseeSignature} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base">Evaluator Signature *</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <SignaturePad signature={evaluatorSignature} onSignatureChange={setEvaluatorSignature} />
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            <Save className="mr-2 h-4 w-4" />
            {loading ? "Saving..." : `Submit QSCE (${totalScore}/${totalPossible})`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
