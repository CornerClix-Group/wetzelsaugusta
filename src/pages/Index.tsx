import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, LogIn, LogOut, Settings, Delete, CheckCircle2, ArrowRight, LayoutDashboard, ChevronLeft } from "lucide-react";
import { toast } from "sonner";

type ClockEmployee = {
  id: string;
  full_name: string;
  pin_code: string | null;
  role: string;
  is_active: boolean;
};

type Step = "select" | "set-pin" | "enter-pin" | "action-choice" | "result";

const Index = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<ClockEmployee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<ClockEmployee | null>(null);
  const [step, setStep] = useState<Step>("select");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [lastAction, setLastAction] = useState<"in" | "out" | null>(null);
  const [employeeName, setEmployeeName] = useState("");
  const [hoursWorked, setHoursWorked] = useState("");
  const [clockInTime, setClockInTime] = useState("");

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Auto-reset after result
  useEffect(() => {
    if (step === "result") {
      const timeout = setTimeout(() => resetToStart(), 4000);
      return () => clearTimeout(timeout);
    }
  }, [step]);

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from("clock_employees")
      .select("id, full_name, pin_code, role, is_active")
      .eq("is_active", true)
      .order("full_name");
    setEmployees(data || []);
  };

  const resetToStart = () => {
    setStep("select");
    setSelectedEmployee(null);
    setPin("");
    setConfirmPin("");
    setIsConfirming(false);
    setLastAction(null);
    setEmployeeName("");
    setHoursWorked("");
    setClockInTime("");
  };

  const handleSelectEmployee = (emp: ClockEmployee) => {
    setSelectedEmployee(emp);
    setPin("");
    setConfirmPin("");
    setIsConfirming(false);
    if (emp.pin_code === null) {
      setStep("set-pin");
    } else {
      setStep("enter-pin");
    }
  };

  const handlePinInput = (digit: string) => {
    if (isConfirming) {
      if (confirmPin.length < 4) setConfirmPin(confirmPin + digit);
    } else {
      if (pin.length < 4) setPin(pin + digit);
    }
  };

  const backspace = () => {
    if (isConfirming) {
      setConfirmPin(confirmPin.slice(0, -1));
    } else {
      setPin(pin.slice(0, -1));
    }
  };

  const clearPin = () => {
    if (isConfirming) {
      setConfirmPin("");
    } else {
      setPin("");
    }
  };

  const handleSetPin = async () => {
    if (!isConfirming) {
      if (pin.length !== 4) return;
      setIsConfirming(true);
      return;
    }

    if (confirmPin !== pin) {
      toast.error("PINs don't match. Try again.");
      setConfirmPin("");
      setIsConfirming(false);
      setPin("");
      return;
    }

    setLoading(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/set-clock-pin`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clock_employee_id: selectedEmployee!.id, pin }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("PIN set successfully! You can now clock in.");
      // Update local state
      setSelectedEmployee({ ...selectedEmployee!, pin_code: pin });
      setPin("");
      setConfirmPin("");
      setIsConfirming(false);
      setStep("enter-pin");
      fetchEmployees();
    } catch (error: any) {
      toast.error(error.message || "Failed to set PIN");
    } finally {
      setLoading(false);
    }
  };

  const handleClockAction = async () => {
    if (pin.length !== 4 || !selectedEmployee) return;
    setLoading(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/clock-action`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clock_employee_id: selectedEmployee.id, pin }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setEmployeeName(data.employee_name);

      if (data.action === "clock_in") {
        setLastAction("in");
        setClockInTime(data.clock_in);
        toast.success(`${data.employee_name} clocked in!`);
      } else {
        setLastAction("out");
        setHoursWorked(data.hours_worked);
        toast.success(`${data.employee_name} clocked out — ${data.hours_worked}h`);
      }

      // If promoted, show action choice; otherwise show result
      if (data.role === "manager" || data.role === "shift_lead") {
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

  const handlePinSubmitForPromoted = async () => {
    if (pin.length !== 4 || !selectedEmployee) return;
    if (selectedEmployee.role === "employee") {
      // Basic employees just clock in/out
      await handleClockAction();
      return;
    }
    // Promoted employees: validate PIN first, then show action choice
    setLoading(true);
    try {
      // Validate PIN by trying clock-action (it validates PIN)
      await handleClockAction();
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDashboard = async () => {
    if (!selectedEmployee) return;
    setLoading(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/pin-login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clock_employee_id: selectedEmployee.id, pin }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Set the session in Supabase client
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

  const currentPin = isConfirming ? confirmPin : pin;

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
          <p className="text-3xl font-mono font-bold text-primary-foreground tabular-nums">
            {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
          <p className="text-xs text-primary-foreground/50 font-medium">
            {currentTime.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
          </p>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">

          {/* Step: Select Employee */}
          {step === "select" && (
            <div className="space-y-4">
              <p className="text-primary-foreground/60 text-sm font-semibold tracking-widest uppercase text-center">
                Select Your Name
              </p>
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                {employees.map((emp) => (
                  <button
                    key={emp.id}
                    onClick={() => handleSelectEmployee(emp)}
                    className="w-full text-left px-5 py-4 rounded-xl bg-primary-foreground/10 hover:bg-primary-foreground/20 active:scale-[0.98] transition-all border border-primary-foreground/5 flex items-center justify-between group"
                  >
                    <span className="text-primary-foreground font-semibold text-base">{emp.full_name}</span>
                    <ArrowRight className="h-4 w-4 text-primary-foreground/30 group-hover:text-primary-foreground/60 transition-colors" />
                  </button>
                ))}
                {employees.length === 0 && (
                  <p className="text-primary-foreground/40 text-center py-12 text-sm">No employees added yet</p>
                )}
              </div>
            </div>
          )}

          {/* Step: Set PIN (first time) */}
          {step === "set-pin" && (
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <button onClick={resetToStart} className="text-primary-foreground/50 hover:text-primary-foreground/80">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <p className="text-primary-foreground font-semibold">{selectedEmployee?.full_name}</p>
              </div>
              <div className="text-center space-y-5">
                <p className="text-primary-foreground/60 text-sm font-semibold tracking-widest uppercase">
                  {isConfirming ? "Confirm Your PIN" : "Create Your 4-Digit PIN"}
                </p>
                <div className="flex justify-center gap-4">
                  {Array.from({ length: 4 }, (_, i) => (
                    <div
                      key={i}
                      className={`h-4 w-4 rounded-full transition-all duration-200 ${
                        i < currentPin.length ? "bg-secondary scale-125 shadow-md shadow-secondary/40" : "bg-primary-foreground/20"
                      }`}
                    />
                  ))}
                </div>
              </div>
              <PinPad onInput={handlePinInput} onClear={clearPin} onBackspace={backspace} />
              <Button
                size="lg"
                className="w-full h-14 text-base font-bold rounded-xl shadow-lg bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                onClick={handleSetPin}
                disabled={currentPin.length !== 4 || loading}
              >
                {loading ? <Spinner /> : isConfirming ? "Confirm PIN" : "Next"}
              </Button>
            </div>
          )}

          {/* Step: Enter PIN */}
          {step === "enter-pin" && (
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <button onClick={resetToStart} className="text-primary-foreground/50 hover:text-primary-foreground/80">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <p className="text-primary-foreground font-semibold">{selectedEmployee?.full_name}</p>
              </div>
              <div className="text-center space-y-5">
                <p className="text-primary-foreground/60 text-sm font-semibold tracking-widest uppercase">
                  Enter Your PIN
                </p>
                <div className="flex justify-center gap-4">
                  {Array.from({ length: 4 }, (_, i) => (
                    <div
                      key={i}
                      className={`h-4 w-4 rounded-full transition-all duration-200 ${
                        i < pin.length ? "bg-secondary scale-125 shadow-md shadow-secondary/40" : "bg-primary-foreground/20"
                      }`}
                    />
                  ))}
                </div>
              </div>
              <PinPad onInput={handlePinInput} onClear={clearPin} onBackspace={backspace} />
              <Button
                size="lg"
                className="w-full h-14 text-base font-bold rounded-xl shadow-lg bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                onClick={handleClockAction}
                disabled={pin.length !== 4 || loading}
              >
                {loading ? <Spinner /> : (
                  <span className="flex items-center gap-2">
                    Clock In / Out <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </div>
          )}

          {/* Step: Action Choice (promoted employees after clock action) */}
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

          {/* Step: Result (basic employees) */}
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
