import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Upload, FileText, CheckCircle2, Calendar, X } from "lucide-react";

interface DocumentUploadSectionProps {
  userId: string;
  onComplete: () => void;
  clockEmployeeId?: string | null;
}

export function DocumentUploadSection({ userId, onComplete, clockEmployeeId }: DocumentUploadSectionProps) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const { data: documents } = useQuery({
    queryKey: ["employee-documents", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_documents")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const requiredDocs = [
    { type: "food_handler", label: "Food Handler Card", required: true },
    { type: "drivers_license", label: "Driver's License", required: true },
  ];

  const uploadedTypes = new Set(documents?.map((d) => d.document_type) || []);
  const allRequiredUploaded = requiredDocs.every((doc) => uploadedTypes.has(doc.type));

  const handleFileUpload = async (
    file: File,
    documentType: string,
    expirationDate?: string
  ) => {
    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}/${documentType}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("employee-documents")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("employee-documents")
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase.from("employee_documents").insert({
        user_id: userId,
        document_type: documentType,
        document_name: file.name,
        document_url: publicUrl,
        expiration_date: expirationDate || null,
      });

      if (dbError) throw dbError;

      toast.success("Document uploaded successfully");
      queryClient.invalidateQueries({ queryKey: ["employee-documents"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (documentId: string, documentUrl: string) => {
    try {
      // Delete from storage
      const path = documentUrl.split("/employee-documents/")[1];
      if (path) {
        await supabase.storage.from("employee-documents").remove([path]);
      }

      // Delete from database
      const { error } = await supabase
        .from("employee_documents")
        .delete()
        .eq("id", documentId);

      if (error) throw error;

      toast.success("Document deleted");
      queryClient.invalidateQueries({ queryKey: ["employee-documents"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to delete document");
    }
  };

  const handleMarkComplete = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      if (clockEmployeeId) {
        // Update by clock_employee_id for on-behalf mode
        const { data: existing } = await supabase
          .from("employee_onboarding")
          .select("id")
          .eq("clock_employee_id", clockEmployeeId)
          .maybeSingle();

        if (existing) {
          const { error } = await supabase
            .from("employee_onboarding")
            .update({ documents_completed: true })
            .eq("clock_employee_id", clockEmployeeId);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("employee_onboarding")
            .insert({ clock_employee_id: clockEmployeeId, documents_completed: true });
          if (error) throw error;
        }
      } else {
        const { error } = await supabase
          .from("employee_onboarding")
          .update({ documents_completed: true })
          .eq("user_id", userData.user.id);
        if (error) throw error;
      }

      toast.success("Documents section marked complete");
      onComplete();
    } catch (error: any) {
      toast.error(error.message || "Failed to update completion status");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Required Documents</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Upload copies of your required documents. All documents will be securely stored.
        </p>
      </div>

      <div className="space-y-4">
        {requiredDocs.map((docType) => {
          const existingDoc = documents?.find((d) => d.document_type === docType.type);
          
          return (
            <Card key={docType.type}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="font-semibold flex items-center gap-2">
                      {docType.label}
                      {docType.required && <span className="text-red-500">*</span>}
                      {existingDoc && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                    </h4>
                  </div>
                </div>

                {existingDoc ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span className="text-sm">{existingDoc.document_name}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(existingDoc.id, existingDoc.document_url)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    {existingDoc.expiration_date && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        Expires: {new Date(existingDoc.expiration_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <Input
                        type="file"
                        id={`file-${docType.type}`}
                        accept="image/*,.pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file, docType.type);
                        }}
                        disabled={uploading}
                      />
                    </div>
                    {docType.type === "food_handler" && (
                      <div>
                        <Label htmlFor={`expiry-${docType.type}`}>Expiration Date</Label>
                        <Input
                          type="date"
                          id={`expiry-${docType.type}`}
                          disabled={uploading}
                        />
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!allRequiredUploaded && (
        <Alert>
          <AlertDescription>
            Please upload all required documents before continuing.
          </AlertDescription>
        </Alert>
      )}

      <Button onClick={handleMarkComplete} disabled={!allRequiredUploaded}>
        <CheckCircle2 className="mr-2 h-4 w-4" />
        Mark Complete & Continue
      </Button>
    </div>
  );
}
