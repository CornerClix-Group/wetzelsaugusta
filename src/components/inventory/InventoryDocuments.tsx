import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Upload, FileText, ExternalLink } from "lucide-react";
import { format } from "date-fns";

interface InventoryDocumentsProps {
  truckId: string;
}

const docTypes = [
  { value: "invoice", label: "Invoice" },
  { value: "receipt", label: "Receipt" },
  { value: "delivery_ticket", label: "Delivery Ticket" },
  { value: "count_sheet", label: "Count Sheet" },
];

export function InventoryDocuments({ truckId }: InventoryDocumentsProps) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [docName, setDocName] = useState("");
  const [docType, setDocType] = useState("invoice");

  const { data: documents } = useQuery({
    queryKey: ["inventory-documents", truckId],
    queryFn: async () => {
      let query = supabase
        .from("inventory_documents")
        .select("*, profiles(full_name)")
        .order("created_at", { ascending: false });
      if (truckId) query = query.eq("truck_id", truckId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      const fileName = `${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("inventory-documents")
        .upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("inventory-documents")
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase.from("inventory_documents").insert({
        document_name: docName || file.name,
        document_url: urlData.publicUrl,
        document_type: docType,
        uploaded_by: userData.user.id,
        truck_id: truckId || null,
      } as any);
      if (insertError) throw insertError;

      toast.success("Document uploaded");
      queryClient.invalidateQueries({ queryKey: ["inventory-documents"] });
      setDocName("");
    } catch (error: any) {
      toast.error(error.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload Document</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-3 items-end">
            <div>
              <Label>Document Name</Label>
              <Input value={docName} onChange={e => setDocName(e.target.value)} placeholder="e.g. Invoice #1234" />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {docTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>File</Label>
              <div className="relative">
                <Input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={handleUpload}
                  disabled={uploading}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Document History</CardTitle>
        </CardHeader>
        <CardContent>
          {!documents || documents.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No documents uploaded yet.</p>
          ) : (
            <div className="space-y-2">
              {documents.map((doc: any) => (
                <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{doc.document_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(doc.created_at), "MMM d, yyyy")} by {(doc.profiles as any)?.full_name || "Unknown"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs capitalize">{doc.document_type.replace("_", " ")}</Badge>
                    <Button size="sm" variant="ghost" asChild>
                      <a href={doc.document_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
