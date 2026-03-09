import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Truck, Plus } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const Trucks = () => {
  const [trucks, setTrucks] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [plate, setPlate] = useState("");
  const [open, setOpen] = useState(false);

  const fetchTrucks = async () => {
    const { data } = await supabase.from("trucks").select("*").order("created_at", { ascending: false });
    setTrucks(data || []);
  };

  useEffect(() => { fetchTrucks(); }, []);

  const addTruck = async () => {
    if (!name) return;
    const { error } = await supabase.from("trucks").insert({ name, license_plate: plate || null });
    if (error) { toast.error(error.message); return; }
    toast.success("Truck added");
    setName(""); setPlate(""); setOpen(false);
    fetchTrucks();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Trucks</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Add Truck</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add New Truck</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Name</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Truck 1" /></div>
              <div><Label>License Plate</Label><Input value={plate} onChange={e => setPlate(e.target.value)} placeholder="ABC-1234" /></div>
              <Button onClick={addTruck} className="w-full">Add Truck</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {trucks.map(t => (
          <Card key={t.id}>
            <CardHeader className="flex flex-row items-center gap-3">
              <Truck className="h-8 w-8 text-primary" />
              <div>
                <CardTitle className="text-lg">{t.name}</CardTitle>
                {t.license_plate && <p className="text-sm text-muted-foreground">{t.license_plate}</p>}
              </div>
            </CardHeader>
            <CardContent>
              <Badge variant={t.status === "active" ? "default" : "secondary"}>{t.status || "active"}</Badge>
            </CardContent>
          </Card>
        ))}
        {trucks.length === 0 && <p className="text-muted-foreground col-span-full text-center py-12">No trucks added yet</p>}
      </div>
    </div>
  );
};

export default Trucks;
