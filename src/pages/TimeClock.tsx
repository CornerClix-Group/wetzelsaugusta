import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, ArrowRight } from "lucide-react";

const TimeClock = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => navigate("/"), 1500);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center">
              <Clock className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl">Time Clock</CardTitle>
          <CardDescription>
            Clocking in or out happens at the terminal on the home screen.
            Redirecting you there now…
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => navigate("/")} size="lg" className="w-full">
            Go to Time Clock Terminal
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default TimeClock;
