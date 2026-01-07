import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Sparkles, Wand2, Settings, Webhook } from "lucide-react";
import { ScenarioSelector } from "@/components/ScenarioSelector";
import { CustomSignalInput } from "@/components/CustomSignalInput";
import { SignalConfiguration } from "@/components/SignalConfiguration";
import { WebhookSimulator } from "@/components/WebhookSimulator";
import { ScoreGauge } from "@/components/ScoreGauge";
import { AnalysisSummary } from "@/components/AnalysisSummary";
import { SignalBreakdown } from "@/components/SignalBreakdown";
import { SignalTimeline } from "@/components/SignalTimeline";
import { ActionRecommendation } from "@/components/ActionRecommendation";
import { analyzeSignals, getExample } from "@/api";
import type { AnalysisResult, ExampleScenario, Signal, Prospect } from "@/types";

function App() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [scenario, setScenario] = useState<ExampleScenario | null>(null);
  const [customSignals, setCustomSignals] = useState<Signal[] | null>(null);
  const [customProspect, setCustomProspect] = useState<Prospect | null>(null);

  const handleScenarioSelect = async (scenarioId: string) => {
    setLoading(true);
    setResult(null);
    setScenario(null);
    setCustomSignals(null);
    setCustomProspect(null);

    try {
      // Fetch example scenario
      const exampleData = await getExample(scenarioId);
      setScenario(exampleData);

      // Analyze signals
      const analysisResult = await analyzeSignals(
        exampleData.signals,
        exampleData.prospect,
        { generateMessage: true }
      );
      setResult(analysisResult);
    } catch (error) {
      console.error("Analysis failed:", error);
      alert("Failed to analyze signals. Make sure the backend is running on port 3000.");
    } finally {
      setLoading(false);
    }
  };

  const handleCustomAnalysis = async (signals: Signal[], prospect: Prospect) => {
    setLoading(true);
    setResult(null);
    setScenario(null);
    setCustomSignals(signals);
    setCustomProspect(prospect);

    try {
      const analysisResult = await analyzeSignals(signals, prospect, { generateMessage: true });
      setResult(analysisResult);
    } catch (error) {
      console.error("Analysis failed:", error);
      alert("Failed to analyze signals. Make sure the backend is running on port 3000.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setScenario(null);
    setCustomSignals(null);
    setCustomProspect(null);
  };

  // Results view (shared between demo scenarios and custom analysis)
  const ResultsView = () => {
    if (!result) return null;

    const signals = scenario?.signals || customSignals || [];
    const prospect = scenario?.prospect || customProspect;

    return (
      <div className="space-y-6">
        {/* Prospect Info */}
        {prospect && (
          <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border">
            {scenario && <h3 className="font-semibold mb-2">Scenario: {scenario.description}</h3>}
            {!scenario && <h3 className="font-semibold mb-2">Custom Analysis</h3>}
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span>Company: {prospect.company}</span>
              {prospect.name && <span>Contact: {prospect.name}</span>}
              {prospect.role && <span>Role: {prospect.role}</span>}
              <span>Signals: {signals.length}</span>
            </div>
          </div>
        )}

        {/* Results Layout */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Score */}
          <div className="lg:col-span-1">
            <ScoreGauge
              score={result.qualityScore}
              confidence={result.confidence}
              priorityLevel={result.priorityLevel}
            />
          </div>

          {/* Right Column - Details */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="summary" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="signals">Signals</TabsTrigger>
                <TabsTrigger value="action">Action</TabsTrigger>
              </TabsList>

              <TabsContent value="summary" className="space-y-4">
                <AnalysisSummary analysis={result.analysis} />
              </TabsContent>

              <TabsContent value="signals" className="space-y-4">
                <SignalBreakdown breakdown={result.signalBreakdown} />
                {signals.length > 0 && <SignalTimeline signals={signals} />}
              </TabsContent>

              <TabsContent value="action" className="space-y-4">
                <ActionRecommendation
                  action={result.recommendedAction}
                  outcome={result.estimatedOutcome}
                  patterns={result.matchedPatterns}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">Signal Quality AI</h1>
          </div>
          {result && (
            <Button variant="outline" onClick={handleReset}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
        </div>

        {/* Main Content */}
        {!result ? (
          <Tabs defaultValue="demo" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="demo" className="gap-2">
                <Sparkles className="h-4 w-4" />
                Demo Scenarios
              </TabsTrigger>
              <TabsTrigger value="custom" className="gap-2">
                <Wand2 className="h-4 w-4" />
                Custom Analysis
              </TabsTrigger>
              <TabsTrigger value="config" className="gap-2">
                <Settings className="h-4 w-4" />
                Configuration
              </TabsTrigger>
              <TabsTrigger value="simulator" className="gap-2">
                <Webhook className="h-4 w-4" />
                Webhook Simulator
              </TabsTrigger>
            </TabsList>

            <TabsContent value="demo">
              <ScenarioSelector onSelect={handleScenarioSelect} loading={loading} />
            </TabsContent>

            <TabsContent value="custom">
              <CustomSignalInput onAnalyze={handleCustomAnalysis} loading={loading} />
            </TabsContent>

            <TabsContent value="config">
              <SignalConfiguration />
            </TabsContent>

            <TabsContent value="simulator">
              <WebhookSimulator />
            </TabsContent>
          </Tabs>
        ) : (
          <ResultsView />
        )}
      </div>
    </div>
  );
}

export default App;
