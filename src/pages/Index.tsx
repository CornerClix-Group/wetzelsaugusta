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

  const promptText = step === "inventory-pin" ? "Manager PIN for Inventory" : "Enter PIN";

  return (
    <div className="min-h-screen bg-primary flex flex-col">
      {/* Compact header */}
      <header className="flex items-center justify-between px-5 pt-[max(1rem,var(--safe-area-top))] pb-3">
        <div className="flex items-center gap-2.5">
          <img src="/icon-192.png" alt="" width={36} height={36} className="rounded-lg" />
          <div>
            <h1 className="text-sm font-semibold text-primary-foreground tracking-tight">Wetzels of Augusta</h1>
            <p className="text-[11px] text-primary-foreground/40 font-medium">Time Clock</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-3xl font-mono font-semibold text-primary-foreground tabular-nums tracking-tight">
            {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
          <p className="text-[11px] text-primary-foreground/40 font-medium">
            {currentTime.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
          </p>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-5 pb-safe">
        <div className="w-full max-w-[320px]">

          {/* PIN Entry */}
          {(step === "pin" || step === "inventory-pin") && (
            <div className="space-y-5 animate-page-enter">
              {step === "inventory-pin" && (
                <button
                  onClick={resetToStart}
                  className="text-primary-foreground/40 hover:text-primary-foreground/70 text-sm font-medium transition-colors"
                >
                  ← Back
                </button>
              )}

              <div className="text-center space-y-4">
                <p className="text-primary-foreground/50 text-xs font-semibold tracking-[0.2em] uppercase">
                  {promptText}
                </p>
                <div className="flex justify-center gap-3.5">
                  {Array.from({ length: 4 }, (_, i) => (
                    <div
                      key={i}
                      className={`h-3 w-3 rounded-full transition-all duration-200 ${
                        i < pin.length
                          ? "bg-secondary scale-110"
                          : "bg-primary-foreground/15"
                      }`}
                    />
                  ))}
                </div>
              </div>

              <PinPad onInput={handlePinInput} onClear={clearPin} onBackspace={backspace} />

              {step === "pin" ? (
                <div className="space-y-2.5 pt-1">
                  <Button
                    size="lg"
                    className="w-full h-[52px] text-[15px] font-semibold rounded-xl bg-secondary hover:bg-secondary/90 text-secondary-foreground transition-all duration-150 active:scale-[0.98]"
                    onClick={handleClockAction}
                    disabled={pin.length !== 4 || loading}
                  >
                    {loading ? <Spinner /> : "Clock In / Out"}
                  </Button>
                  <Button
                    size="lg"
                    variant="ghost"
                    className="w-full h-[48px] text-sm font-medium rounded-xl text-primary-foreground/50 hover:text-primary-foreground/80 hover:bg-primary-foreground/5 transition-all duration-150"
                    onClick={() => { setPin(""); setStep("inventory-pin"); }}
                  >
                    <Package className="h-4 w-4 mr-2 opacity-60" />
                    Inventory Access
                  </Button>
                </div>
              ) : (
                <Button
                  size="lg"
                  className="w-full h-[52px] text-[15px] font-semibold rounded-xl bg-secondary hover:bg-secondary/90 text-secondary-foreground transition-all duration-150 active:scale-[0.98]"
                  onClick={handleInventoryAccess}
                  disabled={pin.length !== 4 || loading}
                >
                  {loading ? <Spinner /> : "Open Inventory"}
                </Button>
              )}
            </div>
          )}

          {/* Action Choice */}
          {step === "action-choice" && (
            <div className="animate-page-enter">
              <ResultCard
                action={lastAction}
                employeeName={employeeName}
                hoursWorked={hoursWorked}
              >
                <div className="space-y-2 mt-5">
                  <Button
                    className="w-full h-[48px] text-sm font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-150 active:scale-[0.98]"
                    onClick={handleOpenDashboard}
                    disabled={loading}
                  >
                    {loading ? <Spinner /> : (
                      <>
                        <LayoutDashboard className="h-4 w-4 mr-2" />
                        Open Dashboard
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full h-10 text-xs font-medium rounded-xl text-muted-foreground hover:text-foreground transition-colors"
                    onClick={resetToStart}
                  >
                    Done
                  </Button>
                </div>
              </ResultCard>
            </div>
          )}

          {/* Result */}
          {step === "result" && (
            <div className="animate-page-enter">
              <ResultCard
                action={lastAction}
                employeeName={employeeName}
                hoursWorked={hoursWorked}
                clockInTime={clockInTime}
              >
                <div className="mt-5 flex items-center justify-center gap-1.5">
                  <div className="h-1 w-1 rounded-full bg-muted-foreground/30 animate-pulse" />
                  <span className="text-xs text-muted-foreground/50">Returning to terminal</span>
                </div>
              </ResultCard>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="pb-safe text-center py-2">
        <button
          onClick={() => navigate("/auth")}
          className="text-[11px] text-primary-foreground/15 hover:text-primary-foreground/30 transition-colors"
        >
          Admin Login
        </button>
      </footer>
    </div>
  );
};

/* ─── Sub-components ─── */

const Spinner = () => (
  <span className="flex items-center gap-2">
    <span className="h-3.5 w-3.5 border-2 border-current/20 border-t-current rounded-full animate-spin" />
  </span>
);

const ResultCard = ({
  action,
  employeeName,
  hoursWorked,
  clockInTime,
  children,
}: {
  action: "in" | "out" | null;
  employeeName: string;
  hoursWorked?: string;
  clockInTime?: string;
  children?: React.ReactNode;
}) => (
  <Card className="border-0 shadow-xl overflow-hidden">
    <CardContent className="p-6 text-center">
      <div className={`mx-auto mb-3 h-12 w-12 rounded-full flex items-center justify-center ${
        action === "in" ? "bg-[hsl(var(--success))]/10" : "bg-secondary/10"
      }`}>
        {action === "in" ? (
          <LogIn className="h-5 w-5 text-[hsl(var(--success))]" />
        ) : (
          <LogOut className="h-5 w-5 text-secondary" />
        )}
      </div>
      <h2 className="text-lg font-semibold text-foreground">
        {action === "in" ? "Clocked In" : "Clocked Out"}
      </h2>
      <p className="text-sm text-muted-foreground mt-0.5">{employeeName}</p>
      {action === "in" && clockInTime && (
        <p className="text-xs text-muted-foreground/60 mt-1">
          {new Date(clockInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      )}
      {action === "out" && hoursWorked && (
        <div className="mt-3 inline-flex items-center gap-1.5 bg-muted rounded-lg px-3 py-1.5">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-foreground">{hoursWorked}h</span>
        </div>
      )}
      {children}
    </CardContent>
  </Card>
);

const PinPad = ({ onInput, onClear, onBackspace }: { onInput: (d: string) => void; onClear: () => void; onBackspace: () => void }) => (
  <div className="grid grid-cols-3 gap-2">
    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
      <button
        key={num}
        onClick={() => onInput(num.toString())}
        className="h-[56px] text-xl font-medium text-primary-foreground rounded-xl bg-primary-foreground/8 hover:bg-primary-foreground/12 active:bg-primary-foreground/16 active:scale-[0.97] transition-all duration-100 select-none"
      >
        {num}
      </button>
    ))}
    <button
      onClick={onClear}
      className="h-[56px] text-[10px] font-bold uppercase tracking-widest text-primary-foreground/30 rounded-xl hover:bg-primary-foreground/5 active:bg-primary-foreground/8 transition-all duration-100 select-none"
    >
      Clear
    </button>
    <button
      onClick={() => onInput("0")}
      className="h-[56px] text-xl font-medium text-primary-foreground rounded-xl bg-primary-foreground/8 hover:bg-primary-foreground/12 active:bg-primary-foreground/16 active:scale-[0.97] transition-all duration-100 select-none"
    >
      0
    </button>
    <button
      onClick={onBackspace}
      className="h-[56px] flex items-center justify-center text-primary-foreground/40 rounded-xl hover:bg-primary-foreground/5 active:bg-primary-foreground/8 transition-all duration-100 select-none"
    >
      <Delete className="h-5 w-5" />
    </button>
  </div>
);

export default Index;
