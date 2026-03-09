import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Clock, LogIn, LogOut, Settings, Delete } from "lucide-react";
import { toast } from "sonner";

const Index = () => {
  const navigate = useNavigate();
  const [pin, setPin] = useState("");
  const [clockedIn, setClockedIn] = useState(false);
  const [currentEntry, setCurrentEntry] = useState<any>(null);
  const [employeeName, setEmployeeName] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const lookupEmployee = useCallback(async (pinCode: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, pin_code")
      .eq("pin_code", pinCode)
      .maybeSingle();

    if (error || !data) return null;
    return data;
  }, []);

  const checkActiveEntry = useCallback(async (employeeId: string) => {
    const { data } = await supabase
      .from("time_entries")
      .select("*")
      .eq("employee_id", employeeId)
      .is("clock_out", null)
      .order("clock_in", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data;
  }, []);

  const handlePinInput = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
    }
  };

  const clearPin = () => {
    setPin("");
    setEmployeeName("");
    setClockedIn(false);
    setCurrentEntry(null);
  };

  const backspace = () => {
    setPin(pin.slice(0, -1));
  };

  const handleSubmit = async () => {
    if (pin.length !== 4) {
      toast.error("Please enter a 4-digit PIN");
      return;
    }

    setLoading(true);
    try {
      const employee = await lookupEmployee(pin);
      if (!employee) {
        toast.error("Invalid PIN — employee not found");
        setPin("");
        setLoading(false);
        return;
      }

      setEmployeeName(employee.full_name);
      const activeEntry = await checkActiveEntry(employee.id);

      if (activeEntry) {
        // Clock OUT
        const clockOut = new Date().toISOString();
        const { error } = await supabase
          .from("time_entries")
          .update({
            clock_out: clockOut,
            clock_out_location: "Augusta, GA",
          })
          .eq("id", activeEntry.id);

        if (error) throw error;

        const hoursWorked = (
          (new Date(clockOut).getTime() - new Date(activeEntry.clock_in).getTime()) /
          3600000
        ).toFixed(2);

        setClockedIn(false);
        setCurrentEntry(null);
        toast.success(`${employee.full_name} clocked out — ${hoursWorked}h worked`);
      } else {
        // Clock IN
        const { data, error } = await supabase
          .from("time_entries")
          .insert({
            employee_id: employee.id,
            clock_in: new Date().toISOString(),
            clock_in_location: "Augusta, GA",
          })
          .select()
          .single();

        if (error) throw error;

        setCurrentEntry(data);
        setClockedIn(true);
        toast.success(`${employee.full_name} clocked in!`);
      }

      setTimeout(clearPin, 3000);
    } catch (error: any) {
      toast.error(error.message || "Clock action failed");
    } finally {
      setLoading(false);
    }
  };

  const pinDots = Array.from({ length: 4 }, (_, i) => (
    <div
      key={i}
      className={`h-5 w-5 rounded-full border-2 transition-all duration-200 ${
        i < pin.length
          ? "bg-primary border-primary scale-110"
          : "border-muted-foreground/30"
      }`}
    />
  ));

  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
            <Clock className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-secondary-foreground">WetzelOps</h1>
            <p className="text-xs text-secondary-foreground/60">Time Clock Terminal</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-mono font-bold text-secondary-foreground">
            {currentTime.toLocaleTimeString()}
          </p>
          <p className="text-xs text-secondary-foreground/60">
            {currentTime.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-8">
          {/* Status indicator */}
          {employeeName && (
            <div
              className={`text-center p-4 rounded-xl ${
                clockedIn
                  ? "bg-success/20 border border-success/30"
                  : "bg-primary/20 border border-primary/30"
              }`}
            >
              <p className="font-semibold text-secondary-foreground text-lg">
                {employeeName}
              </p>
              {clockedIn && currentEntry && (
                <p className="text-sm text-secondary-foreground/70 mt-1">
                  Clocked in at{" "}
                  {new Date(currentEntry.clock_in).toLocaleTimeString()}
                </p>
              )}
            </div>
          )}

          {/* PIN display */}
          <div className="text-center space-y-4">
            <p className="text-secondary-foreground/70 text-sm font-medium tracking-wide uppercase">
              Enter your PIN
            </p>
            <div className="flex justify-center gap-4">{pinDots}</div>
          </div>

          {/* Number pad */}
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <Button
                key={num}
                variant="outline"
                onClick={() => handlePinInput(num.toString())}
                className="h-16 text-2xl font-semibold bg-secondary-foreground/5 border-secondary-foreground/10 text-secondary-foreground hover:bg-secondary-foreground/10 hover:text-secondary-foreground"
              >
                {num}
              </Button>
            ))}
            <Button
              variant="outline"
              onClick={clearPin}
              className="h-16 text-sm font-medium bg-destructive/10 border-destructive/20 text-destructive hover:bg-destructive/20"
            >
              Clear
            </Button>
            <Button
              variant="outline"
              onClick={() => handlePinInput("0")}
              className="h-16 text-2xl font-semibold bg-secondary-foreground/5 border-secondary-foreground/10 text-secondary-foreground hover:bg-secondary-foreground/10 hover:text-secondary-foreground"
            >
              0
            </Button>
            <Button
              variant="outline"
              onClick={backspace}
              className="h-16 bg-secondary-foreground/5 border-secondary-foreground/10 text-secondary-foreground hover:bg-secondary-foreground/10"
            >
              <Delete className="h-5 w-5" />
            </Button>
          </div>

          {/* Submit */}
          <Button
            size="lg"
            className="w-full h-14 text-lg font-semibold"
            onClick={handleSubmit}
            disabled={pin.length !== 4 || loading}
          >
            {loading ? (
              "Processing..."
            ) : (
              <>
                <LogIn className="mr-2 h-5 w-5" />
                Clock In / Out
              </>
            )}
          </Button>

          {/* Admin link */}
          <div className="text-center">
            <button
              onClick={() => navigate("/auth")}
              className="text-xs text-secondary-foreground/40 hover:text-secondary-foreground/60 flex items-center gap-1 mx-auto"
            >
              <Settings className="h-3 w-3" />
              Employee Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
