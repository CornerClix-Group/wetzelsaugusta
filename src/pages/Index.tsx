import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, LogIn, LogOut, Package, Delete, CheckCircle2, LayoutDashboard } from "lucide-react";
import { toast } from "sonner";

type Step = "pin" | "inventory-pin" | "action-choice" | "result";

const Index = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("pin");
  const [pin, setPin] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [lastAction, setLastAction] = useState<"in" | "out" | null>(null);
  const [employeeName, setEmployeeName] = useState("");
  const [hoursWorked, setHoursWorked] = useState("");
  const [clockInTime, setClockInTime] = useState("");
  const [lastClockEmployeeId, setLastClockEmployeeId] = useState("");
  const [lastPin, setLastPin] = useState("");
  const [lastRole, setLastRole] = useState("");

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (step === "result") {
      const timeout = setTimeout(() => resetToStart(), 4000);
      return () => clearTimeout(timeout);
    }
  }, [step]);

  const resetToStart = () => {
    setStep("pin");
    setPin("");
    setLastAction(null);
    setEmployeeName("");
    setHoursWorked("");
    setClockInTime("");
    setLastClockEmployeeId("");
    setLastPin("");
    setLastRole("");
  };

  const handlePinInput = (digit: string) => {
    if (pin.length < 4) setPin(pin + digit);
  };

  const backspace = () => setPin(pin.slice(0, -1));
  const clearPin = () => setPin("");

  const handleClockAction = async () => {
    if (pin.length !== 4) return;
    setLoading(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/clock-action`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setEmployeeName(data.employee_name);
      setLastClockEmployeeId(data.clock_employee_id);
      setLastPin(pin);
      setLastRole(data.role);

      if (data.action === "clock_in") {
        setLastAction("in");
        setClockInTime(data.clock_in);
        toast.success(`${data.employee_name} clocked in!`);
      } else {
        setLastAction("out");
        setHoursWorked(data.hours_worked);
        toast.success(`${data.employee_name} clocked out — ${data.hours_worked}h`);
      }

      if (data.role === "manager" || data.role === "shift_lead" || data.role === "owner") {
        setStep("action-choice");
      } else {
        setStep("result");
      }
    } catch (error: any) {
      toast.error(error.message || "Clock action failed");
      setPin("");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDashboard = async () => {
    if (!lastClockEmployeeId) return;
    setLoading(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/pin-login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clock_employee_id: lastClockEmployeeId, pin: lastPin }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });

      toast.success(`Welcome, ${data.employee_name}!`);
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Failed to open dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleInventoryAccess = async () => {
    if (pin.length !== 4) return;
    setLoading(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/pin-login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin, require_permission: "inventory" }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });

      toast.success(`Welcome, ${data.employee_name}!`);
      navigate("/dashboard/inventory");
    } catch (error: any) {
      toast.error(error.message || "Access denied");
      setPin("");
    } finally {
      setLoading(false);
    }
  };

  const promptText = step === "inventory-pin" ? "Enter Manager PIN for Inventory" : "Enter Your PIN";

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary via-primary to-[hsl(215,80%,22%)] flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-5 border-b border-primary-foreground/10">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-secondary flex items-center justify-center shadow-md">
            <Clock className="h-5 w-5 text-secondary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-primary-foreground tracking-tight">Wetzels of Augusta</h1>
            <p className="text-xs text-primary-foreground/50 font-medium">Time Clock Terminal</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-4xl font-mono font-bold text-primary-foreground tabular-nums">
            {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
          <p className="text-sm text-primary-foreground/50 font-medium">
            {currentTime.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">

          {/* PIN Entry (clock or inventory) */}
          {(step === "pin" || step === "inventory-pin") && (
            <div className="space-y-6">
              {step === "inventory-pin" && (
                <button
                  onClick={resetToStart}
                  className="text-primary-foreground/50 hover:text-primary-foreground/80 text-sm font-medium"
                >
                  ← Back to Clock
                </button>
              )}
              <div className="text-center space-y-5">
                <p className="text-primary-foreground/60 text-sm font-semibold tracking-widest uppercase">
                  {promptText}
                </p>
                <div className="flex justify-center gap-4">
                  {Array.from({ length: 4 }, (_, i) => (
                    <div
                      key={i}
                      className={`h-5 w-5 rounded-full transition-all duration-200 ${
                        i < pin.length ? "bg-secondary scale-125 shadow-md shadow-secondary/40" : "bg-primary-foreground/20"
                      }`}
                    />
                  ))}
                </div>
              </div>
              <PinPad onInput={handlePinInput} onClear={clearPin} onBackspace={backspace} />

              {step === "pin" ? (
                <div className="space-y-3">
                  <Button
                    size="lg"
                    className="w-full h-16 text-lg font-bold rounded-xl shadow-lg bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                    onClick={handleClockAction}
                    disabled={pin.length !== 4 || loading}
                  >
                    {loading ? <Spinner /> : "Clock In / Out"}
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full h-14 text-base font-bold rounded-xl border-primary-foreground/20 bg-primary-foreground/5 hover:bg-primary-foreground/10 text-primary-foreground"
                    onClick={() => { setPin(""); setStep("inventory-pin"); }}
                  >
                    <Package className="h-5 w-5 mr-2" />
                    Inventory
                  </Button>
                </div>
              ) : (
                <Button
                  size="lg"
                  className="w-full h-16 text-lg font-bold rounded-xl shadow-lg bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                  onClick={handleInventoryAccess}
                  disabled={pin.length !== 4 || loading}
                >
                  {loading ? <Spinner /> : (
                    <span className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Open Inventory
                    </span>
                  )}
                </Button>
              )}
            </div>
          )}

          {/* Action Choice (promoted employees after clock action) */}
          {step === "action-choice" && (
            <Card className="border-0 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
              <CardContent className={`p-8 text-center ${
                lastAction === "in" ? "bg-[hsl(var(--success))]" : "bg-secondary"
              }`}>
                <div className={`mx-auto mb-4 h-16 w-16 rounded-full flex items-center justify-center ${
                  lastAction === "in" ? "bg-[hsl(var(--success-foreground))]/20" : "bg-secondary-foreground/10"
                }`}>
                  {lastAction === "in" ? (
                    <LogIn className="h-8 w-8 text-[hsl(var(--success-foreground))]" />
                  ) : (
                    <LogOut className="h-8 w-8 text-secondary-foreground" />
                  )}
                </div>
                <h2 className={`text-2xl font-bold mb-1 ${
                  lastAction === "in" ? "text-[hsl(var(--success-foreground))]" : "text-secondary-foreground"
                }`}>
                  {lastAction === "in" ? "Clocked In" : "Clocked Out"}
                </h2>
                <p className={`text-lg font-semibold mb-4 ${
                  lastAction === "in" ? "text-[hsl(var(--success-foreground))]/90" : "text-secondary-foreground/80"
                }`}>
                  {employeeName}
                </p>
                {lastAction === "out" && hoursWorked && (
                  <div className="mb-4 inline-flex items-center gap-2 bg-secondary-foreground/10 rounded-lg px-4 py-2">
                    <Clock className="h-4 w-4 text-secondary-foreground/70" />
                    <span className="text-sm font-semibold text-secondary-foreground">{hoursWorked} hours worked</span>
                  </div>
                )}
                <div className="space-y-3 mt-4">
                  <Button
                    className="w-full h-14 text-base font-bold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground"
                    onClick={handleOpenDashboard}
                    disabled={loading}
                  >
                    {loading ? <Spinner /> : (
                      <span className="flex items-center gap-2">
                        <LayoutDashboard className="h-5 w-5" />
                        Open Dashboard
                      </span>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full h-12 text-sm font-medium rounded-xl text-primary-foreground/60 hover:text-primary-foreground/80 hover:bg-primary-foreground/10"
                    onClick={resetToStart}
                  >
                    Done — Return to Terminal
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Result (basic employees) */}
          {step === "result" && (
            <Card className="border-0 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
              <CardContent className={`p-8 text-center ${
                lastAction === "in" ? "bg-[hsl(var(--success))]" : "bg-secondary"
              }`}>
                <div className={`mx-auto mb-4 h-16 w-16 rounded-full flex items-center justify-center ${
                  lastAction === "in" ? "bg-[hsl(var(--success-foreground))]/20" : "bg-secondary-foreground/10"
                }`}>
                  {lastAction === "in" ? (
                    <LogIn className="h-8 w-8 text-[hsl(var(--success-foreground))]" />
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
                {lastAction === "in" && clockInTime && (
                  <p className="text-sm text-[hsl(var(--success-foreground))]/70">
                    Started at {new Date(clockInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
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
                    Returning to terminal...
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="pb-4 pt-2 text-center">
        <button
          onClick={() => navigate("/auth")}
          className="text-xs text-primary-foreground/20 hover:text-primary-foreground/40 transition-colors"
        >
          Log in
        </button>
      </footer>
    </div>
  );
};

const Spinner = () => (
  <span className="flex items-center gap-2">
    <span className="h-4 w-4 border-2 border-secondary-foreground/30 border-t-secondary-foreground rounded-full animate-spin" />
    Processing...
  </span>
);

const PinPad = ({ onInput, onClear, onBackspace }: { onInput: (d: string) => void; onClear: () => void; onBackspace: () => void }) => (
  <div className="grid grid-cols-3 gap-2.5">
    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
      <Button
        key={num}
        variant="ghost"
        onClick={() => onInput(num.toString())}
        className="h-16 text-2xl font-semibold text-primary-foreground bg-primary-foreground/10 hover:bg-primary-foreground/20 hover:text-primary-foreground rounded-xl transition-all active:scale-95 border border-primary-foreground/5"
      >
        {num}
      </Button>
    ))}
    <Button
      variant="ghost"
      onClick={onClear}
      className="h-16 text-xs font-bold uppercase tracking-wider text-red-300 bg-red-500/10 hover:bg-red-500/20 hover:text-red-200 rounded-xl border border-red-500/10"
    >
      Clear
    </Button>
    <Button
      variant="ghost"
      onClick={() => onInput("0")}
      className="h-16 text-2xl font-semibold text-primary-foreground bg-primary-foreground/10 hover:bg-primary-foreground/20 hover:text-primary-foreground rounded-xl transition-all active:scale-95 border border-primary-foreground/5"
    >
      0
    </Button>
    <Button
      variant="ghost"
      onClick={onBackspace}
      className="h-16 text-primary-foreground/60 bg-primary-foreground/10 hover:bg-primary-foreground/20 rounded-xl border border-primary-foreground/5"
    >
      <Delete className="h-5 w-5" />
    </Button>
  </div>
);

export default Index;
