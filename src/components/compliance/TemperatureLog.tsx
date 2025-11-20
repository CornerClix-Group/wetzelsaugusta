import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface TemperatureDevice {
  name: string;
  minTemp: number;
  maxTemp: number;
}

interface TemperatureLogProps {
  checklistId: string | null;
  devices: TemperatureDevice[];
  onTemperaturesChange: (temps: any[]) => void;
}

export function TemperatureLog({ checklistId, devices, onTemperaturesChange }: TemperatureLogProps) {
  const [temperatures, setTemperatures] = useState<Record<string, { temp: string; corrective: string; outOfRange: boolean }>>(
    Object.fromEntries(devices.map((d) => [d.name, { temp: "", corrective: "", outOfRange: false }]))
  );

  const handleTempChange = async (deviceName: string, value: string) => {
    const device = devices.find((d) => d.name === deviceName);
    if (!device) return;

    const temp = parseFloat(value);
    const isOutOfRange = !isNaN(temp) && (temp < device.minTemp || temp > device.maxTemp);

    setTemperatures((prev) => ({
      ...prev,
      [deviceName]: { ...prev[deviceName], temp: value, outOfRange: isOutOfRange },
    }));

    // Update parent component
    const tempData = Object.entries(temperatures).map(([name, data]) => ({
      device_name: name,
      temperature: data.temp,
      corrective_action: data.corrective,
      out_of_range: data.outOfRange,
    }));
    onTemperaturesChange(tempData);
  };

  const handleCorrectiveChange = (deviceName: string, value: string) => {
    setTemperatures((prev) => ({
      ...prev,
      [deviceName]: { ...prev[deviceName], corrective: value },
    }));
  };

  return (
    <div className="space-y-4">
      {devices.map((device) => {
        const tempData = temperatures[device.name];
        return (
          <div key={device.name} className="border rounded-lg p-4 space-y-3">
            <Label className="text-base font-medium">{device.name}</Label>
            <p className="text-sm text-muted-foreground">
              Expected range: {device.minTemp}°F - {device.maxTemp}°F
            </p>

            <div>
              <Label htmlFor={`temp-${device.name}`}>Temperature (°F) *</Label>
              <Input
                id={`temp-${device.name}`}
                type="number"
                step="0.1"
                placeholder="Enter temperature"
                value={tempData.temp}
                onChange={(e) => handleTempChange(device.name, e.target.value)}
                className={tempData.outOfRange ? "border-red-500" : ""}
              />
            </div>

            {tempData.outOfRange && (
              <>
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Temperature is out of safe range! Corrective action required.
                  </AlertDescription>
                </Alert>

                <div>
                  <Label htmlFor={`corrective-${device.name}`}>Corrective Action Taken *</Label>
                  <Textarea
                    id={`corrective-${device.name}`}
                    placeholder="Describe the corrective action taken..."
                    value={tempData.corrective}
                    onChange={(e) => handleCorrectiveChange(device.name, e.target.value)}
                    required={tempData.outOfRange}
                    rows={3}
                  />
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
