import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, LogIn, LogOut } from "lucide-react";
import { toast } from "sonner";

const TimeClock = () => {
  const [pin, setPin] = useState("");
  const [clockedIn, setClockedIn] = useState(false);
  const [currentEntry, setCurrentEntry] = useState<any>(null);

  const handlePinInput = (digit: string) => {
    if (pin.length < 4) {
      setPin(pin + digit);
    }
  };

  const clearPin = () => {
    setPin("");
  };

  const handleClockIn = async () => {
    if (pin.length !== 4) {
      toast.error("Please enter a 4-digit PIN");
      return;
    }

    try {
      // In a real implementation, you'd verify the PIN against the employee's record
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Please sign in first");
        return;
      }

      const { data, error } = await supabase
        .from("time_entries")
        .insert({
          employee_id: user.id,
          clock_in: new Date().toISOString(),
          clock_in_location: "Augusta, GA", // In production, use actual GPS
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentEntry(data);
      setClockedIn(true);
      toast.success("Clocked in successfully!");
      setPin("");
    } catch (error: any) {
      toast.error(error.message || "Failed to clock in");
    }
  };

  const handleClockOut = async () => {
    if (!currentEntry) {
      toast.error("No active clock-in found");
      return;
    }

    try {
      const { error } = await supabase
        .from("time_entries")
        .update({
          clock_out: new Date().toISOString(),
          clock_out_location: "Augusta, GA",
        })
        .eq("id", currentEntry.id);

      if (error) throw error;

      setClockedIn(false);
      setCurrentEntry(null);
      toast.success("Clocked out successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to clock out");
    }
  };

  return (
    <div className="min-h-screen bg-muted p-4 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center">
              <Clock className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl">Time Clock Terminal</CardTitle>
          <CardDescription>Enter your PIN to clock in or out</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>PIN Code</Label>
            <Input
              type="password"
              value={pin}
              readOnly
              placeholder="Enter 4-digit PIN"
              className="text-center text-2xl tracking-widest"
              maxLength={4}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <Button
                key={num}
                variant="outline"
                size="lg"
                onClick={() => handlePinInput(num.toString())}
                className="text-xl h-16"
              >
                {num}
              </Button>
            ))}
            <Button
              variant="outline"
              size="lg"
              onClick={clearPin}
              className="text-xl h-16"
            >
              Clear
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => handlePinInput("0")}
              className="text-xl h-16"
            >
              0
            </Button>
            <div />
          </div>

          <div className="space-y-2">
            {!clockedIn ? (
              <Button
                size="lg"
                className="w-full"
                onClick={handleClockIn}
                disabled={pin.length !== 4}
              >
                <LogIn className="mr-2 h-5 w-5" />
                Clock In
              </Button>
            ) : (
              <Button
                size="lg"
                variant="destructive"
                className="w-full"
                onClick={handleClockOut}
              >
                <LogOut className="mr-2 h-5 w-5" />
                Clock Out
              </Button>
            )}
          </div>

          {clockedIn && currentEntry && (
            <div className="text-center p-4 bg-success/10 rounded-lg">
              <p className="text-sm font-medium text-success">Currently Clocked In</p>
              <p className="text-xs text-muted-foreground mt-1">
                Started at {new Date(currentEntry.clock_in).toLocaleTimeString()}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TimeClock;
