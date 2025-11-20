import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Lock, TrendingUp, Shield, Users } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary via-secondary/95 to-secondary/90">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-block p-4 rounded-full bg-primary/20 mb-4">
            <Lock className="h-16 w-16 text-primary" />
          </div>
          
          <h1 className="text-5xl font-bold text-white mb-4">
            WetzelOps
          </h1>
          
          <p className="text-xl text-white/90 mb-8">
            Enterprise Operations Platform for Wetzel's Pretzels Truck of Augusta
          </p>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-8 mb-8">
            <p className="text-white/80 text-lg mb-6">
              Streamline operations, manage compliance, and scale your franchise with confidence.
            </p>
            
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="flex flex-col items-center space-y-2">
                <TrendingUp className="h-10 w-10 text-primary" />
                <h3 className="font-semibold text-white">Operational Excellence</h3>
                <p className="text-sm text-white/70">Track performance and compliance in real-time</p>
              </div>
              
              <div className="flex flex-col items-center space-y-2">
                <Shield className="h-10 w-10 text-primary" />
                <h3 className="font-semibold text-white">Blue Book Compliant</h3>
                <p className="text-sm text-white/70">Meet all franchise operational standards</p>
              </div>
              
              <div className="flex flex-col items-center space-y-2">
                <Users className="h-10 w-10 text-primary" />
                <h3 className="font-semibold text-white">Team Management</h3>
                <p className="text-sm text-white/70">Empower your employees and managers</p>
              </div>
            </div>
            
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Access Dashboard
            </Button>
          </div>
          
          <p className="text-sm text-white/60">
            Authorized Personnel Only • Secure Access Required
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
