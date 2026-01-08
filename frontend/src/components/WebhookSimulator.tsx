import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, Play, Pause, RefreshCw, Webhook } from "lucide-react";

interface IncomingSignal {
  id: string;
  source: string;
  type: string;
  timestamp: string;
  prospect: {
    company: string;
    name?: string;
  };
  metadata?: Record<string, unknown>;
}

const SIMULATED_SIGNALS: Omit<IncomingSignal, "id" | "timestamp">[] = [
  {
    source: "linkedin",
    type: "linkedin_engagement",
    prospect: { company: "TechCorp", name: "Sarah Johnson" },
    metadata: { action: "commented", post: "Product launch announcement" },
  },
  {
    source: "website",
    type: "email_interaction",
    prospect: { company: "StartupXYZ", name: "Mike Chen" },
    metadata: { duration: 120, page: "/pricing" },
  },
  {
    source: "hubspot",
    type: "email_open",
    prospect: { company: "EnterpriseABC", name: "Lisa Martinez" },
    metadata: { campaign: "Q4 Product Update", opens: 3 },
  },
  {
    source: "website",
    type: "demo_request",
    prospect: { company: "GrowthCo", name: "David Kim" },
    metadata: { form: "contact_sales", urgency: "high" },
  },
  {
    source: "product",
    type: "product_trial",
    prospect: { company: "InnovateLabs" },
    metadata: { plan: "pro", signup_source: "landing_page" },
  },
  {
    source: "website",
    type: "content_download",
    prospect: { company: "CloudSystems", name: "Emma Wilson" },
    metadata: { asset: "ROI Calculator", format: "pdf" },
  },
];

export function WebhookSimulator() {
  const [signals, setSignals] = useState<IncomingSignal[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);

  const generateSignal = () => {
    const randomSignal = SIMULATED_SIGNALS[Math.floor(Math.random() * SIMULATED_SIGNALS.length)];
    const newSignal: IncomingSignal = {
      ...randomSignal,
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toISOString(),
    };
    setSignals((prev) => [newSignal, ...prev].slice(0, 20)); // Keep last 20
  };

  const startSimulation = () => {
    if (intervalId) return;

    setIsRunning(true);
    const id = setInterval(() => {
      generateSignal();
    }, 3000); // New signal every 3 seconds
    setIntervalId(id);
  };

  const stopSimulation = () => {
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }
    setIsRunning(false);
  };

  const clearSignals = () => {
    setSignals([]);
  };

  useEffect(() => {
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [intervalId]);

  const getSourceColor = (source: string) => {
    const colors: Record<string, string> = {
      linkedin: "bg-blue-500",
      website: "bg-green-500",
      hubspot: "bg-orange-500",
      product: "bg-purple-500",
      salesforce: "bg-indigo-500",
    };
    return colors[source] || "bg-gray-500";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Webhook Simulator
          </CardTitle>
          <CardDescription>
            Simulate real-time signal ingestion from various sources
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                onClick={isRunning ? stopSimulation : startSimulation}
                variant={isRunning ? "destructive" : "default"}
                className="gap-2"
              >
                {isRunning ? (
                  <>
                    <Pause className="h-4 w-4" />
                    Stop Stream
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Start Stream
                  </>
                )}
              </Button>
              <Button onClick={generateSignal} variant="outline" className="gap-2">
                <Zap className="h-4 w-4" />
                Send One Signal
              </Button>
              <Button
                onClick={clearSignals}
                variant="ghost"
                className="gap-2"
                disabled={signals.length === 0}
              >
                <RefreshCw className="h-4 w-4" />
                Clear
              </Button>
            </div>
            <div className="flex items-center gap-2">
              {isRunning && (
                <Badge variant="default" className="animate-pulse">
                  <span className="w-2 h-2 bg-white rounded-full mr-2 inline-block" />
                  Live
                </Badge>
              )}
              <Badge variant="secondary">{signals.length} signals received</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Signal Stream */}
      <Card>
        <CardHeader>
          <CardTitle>Incoming Signal Stream</CardTitle>
          <CardDescription>
            Real-time view of signals as they arrive (auto-refreshes every 3s when running)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {signals.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Webhook className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p className="text-sm">No signals received yet</p>
              <p className="text-xs mt-1">Click "Start Stream" to begin simulation</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {signals.map((signal) => (
                <div
                  key={signal.id}
                  className="p-4 border rounded-lg bg-muted/50 hover:bg-muted transition-colors animate-in fade-in slide-in-from-top-2 duration-300"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`w-2 h-2 rounded-full mt-2 ${getSourceColor(signal.source)}`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {signal.source}
                          </Badge>
                          <span className="text-sm font-medium">
                            {signal.type.replace(/_/g, " ")}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {signal.prospect.company}
                          {signal.prospect.name && ` • ${signal.prospect.name}`}
                        </p>
                        {signal.metadata && Object.keys(signal.metadata).length > 0 && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            {Object.entries(signal.metadata).map(([key, value]) => (
                              <span key={key} className="mr-3">
                                {key}: {String(value)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                      {new Date(signal.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Box */}
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900 dark:text-blue-100">
              <p className="font-medium mb-1">How it works in production:</p>
              <ul className="space-y-1 text-blue-700 dark:text-blue-200 text-xs">
                <li>• Webhooks from LinkedIn, HubSpot, Salesforce, etc.</li>
                <li>• Tracking pixels on your website/product</li>
                <li>• API integrations with sales tools</li>
                <li>• Queue system (Redis/RabbitMQ) for high volume</li>
                <li>• Real-time notifications to SDRs when thresholds hit</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
