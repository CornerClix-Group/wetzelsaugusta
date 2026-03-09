import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, LogIn, LogOut, Settings, Delete, CheckCircle2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

const Index = () => {
  const navigate = useNavigate();
  const [pin, setPin] = useState("");
  const [clockedIn, setClockedIn] = useState(false);
  const [currentEntry, setCurrentEntry] = useState<any>(null);
  const [employeeName, setEmployeeName] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [lastAction, setLastAction] = useState<"in" | "out" | null>(null);
  const [hoursWorked, setHoursWorked] = useState("");

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-clear success state after delay
  useEffect(() => {
    if (lastAction) {
      const timeout = setTimeout(() => {
        setLastAction(null);
        setEmployeeName("");
        setClockedIn(false);
        setCurrentEntry(null);
        setHoursWorked("");
        setPin("");
      }, 4000);
      return () => clearTimeout(timeout);
    }
  }, [lastAction]);

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
    if (pin.length < 4 && !lastAction) {
      setPin(pin + digit);
    }
  };

  const clearPin = () => {
    setPin("");
    setEmployeeName("");
    setClockedIn(false);
    setCurrentEntry(null);
    setLastAction(null);
    setHoursWorked("");
  };

  const backspace = () => {
    if (!lastAction) setPin(pin.slice(0, -1));
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
        const clockOut = new Date().toISOString();
        const { error } = await supabase
          .from("time_entries")
          .update({ clock_out: clockOut, clock_out_location: "Augusta, GA" })
          .eq("id", activeEntry.id);
        if (error) throw error;

        const hrs = (
          (new Date(clockOut).getTime() - new Date(activeEntry.clock_in).getTime()) / 3600000
        ).toFixed(2);

        setClockedIn(false);
        setCurrentEntry(null);
        setHoursWorked(hrs);
        setLastAction("out");
        toast.success(`${employee.full_name} clocked out — ${hrs}h worked`);
      } else {
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
        setLastAction("in");
        toast.success(`${employee.full_name} clocked in!`);
      }
    } catch (error: any) {
      toast.error(error.message || "Clock action failed");
    } finally {
      setLoading(false);
    }
  };

  const showingResult = !!lastAction;

  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-5 border-b border-secondary-foreground/10">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-primary flex items-center justify-center shadow-md">
            <Clock className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-secondary-foreground tracking-tight">WetzelOps</h1>
            <p className="text-xs text-secondary-foreground/50 font-medium">Time Clock Terminal</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-3xl font-mono font-bold text-secondary-foreground tabular-nums">
            {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
          <p className="text-xs text-secondary-foreground/50 font-medium">
            {currentTime.toLocaleDateString("en-US", {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </p>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Success confirmation overlay */}
          {showingResult ? (
            <Card className="border-0 shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
              <CardContent className={`p-8 text-center ${
                lastAction === "in"
                  ? "bg-[hsl(var(--success))]"
                  : "bg-secondary"
              }`}>
                <div className={`mx-auto mb-4 h-16 w-16 rounded-full flex items-center justify-center ${
                  lastAction === "in"
                    ? "bg-[hsl(var(--success-foreground))]/20"
                    : "bg-secondary-foreground/10"
                }`}>
                  {lastAction === "in" ? (
                    <LogIn className={`h-8 w-8 ${lastAction === "in" ? "text-[hsl(var(--success-foreground))]" : "text-secondary-foreground"}`} />
                  ) : (
                    <LogOut className="h-8 w-8 text-secondary-foreground" />
                  )}
                </div>
                <h2 className={`text-2xl font-bold mb-1 ${
                  lastAction === "in" ? "text-[hsl(var(--success-foreground))]" : "text-secondary-foreground"
                }`}>
                  {lastAction === "in" ? "Clocked In" : "Clocked Out"}
                </h2>
                <p className={`text-lg font-semibold mb-2 ${
                  lastAction === "in" ? "text-[hsl(var(--success-foreground))]/90" : "text-secondary-foreground/80"
                }`}>
                  {employeeName}
                </p>
                {lastAction === "in" && currentEntry && (
                  <p className="text-sm text-[hsl(var(--success-foreground))]/70">
                    Started at {new Date(currentEntry.clock_in).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}
                {lastAction === "out" && hoursWorked && (
                  <div className="mt-3 inline-flex items-center gap-2 bg-secondary-foreground/10 rounded-lg px-4 py-2">
                    <Clock className="h-4 w-4 text-secondary-foreground/70" />
                    <span className="text-sm font-semibold text-secondary-foreground">{hoursWorked} hours worked</span>
                  </div>
                )}
                <div className="mt-6 flex items-center justify-center gap-1 text-xs opacity-50">
                  <CheckCircle2 className={`h-3 w-3 ${lastAction === "in" ? "text-[hsl(var(--success-foreground))]" : "text-secondary-foreground"}`} />
                  <span className={lastAction === "in" ? "text-[hsl(var(--success-foreground))]" : "text-secondary-foreground"}>
                    Returning to PIN entry...
                  </span>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* PIN display */}
              <div className="text-center space-y-5">
                <p className="text-secondary-foreground/60 text-sm font-semibold tracking-widest uppercase">
                  Enter Your PIN
                </p>
                <div className="flex justify-center gap-4">
                  {Array.from({ length: 4 }, (_, i) => (
                    <div
                      key={i}
                      className={`h-4 w-4 rounded-full transition-all duration-200 ${
                        i < pin.length
                          ? "bg-primary scale-125 shadow-md"
                          : "bg-secondary-foreground/15"
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Number pad */}
              <div className="grid grid-cols-3 gap-2.5">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <Button
                    key={num}
                    variant="ghost"
                    onClick={() => handlePinInput(num.toString())}
                    className="h-16 text-2xl font-semibold text-secondary-foreground bg-secondary-foreground/5 hover:bg-secondary-foreground/10 hover:text-secondary-foreground rounded-xl transition-all active:scale-95"
                  >
                    {num}
                  </Button>
                ))}
                <Button
                  variant="ghost"
                  onClick={clearPin}
                  className="h-16 text-xs font-bold uppercase tracking-wider text-destructive bg-destructive/5 hover:bg-destructive/10 hover:text-destructive rounded-xl"
                >
                  Clear
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => handlePinInput("0")}
                  className="h-16 text-2xl font-semibold text-secondary-foreground bg-secondary-foreground/5 hover:bg-secondary-foreground/10 hover:text-secondary-foreground rounded-xl transition-all active:scale-95"
                >
                  0
                </Button>
                <Button
                  variant="ghost"
                  onClick={backspace}
                  className="h-16 text-secondary-foreground/60 bg-secondary-foreground/5 hover:bg-secondary-foreground/10 rounded-xl"
                >
                  <Delete className="h-5 w-5" />
                </Button>
              </div>

              {/* Submit */}
              <Button
                size="lg"
                className="w-full h-14 text-base font-bold rounded-xl shadow-md transition-all active:scale-[0.98]"
                onClick={handleSubmit}
                disabled={pin.length !== 4 || loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Processing...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Clock In / Out
                    <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>

              {/* Footer link */}
              <div className="text-center pt-2">
                <button
                  onClick={() => navigate("/auth")}
                  className="text-xs text-secondary-foreground/30 hover:text-secondary-foreground/50 transition-colors flex items-center gap-1.5 mx-auto"
                >
                  <Settings className="h-3 w-3" />
                  Employee Login
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
