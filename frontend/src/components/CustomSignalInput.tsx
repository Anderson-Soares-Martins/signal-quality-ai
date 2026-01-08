import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, User, Building2, Edit2, Check, X } from "lucide-react";
import type { Signal, Prospect } from "@/types";

interface CustomSignalInputProps {
  onAnalyze: (signals: Signal[], prospect: Prospect) => void;
  loading?: boolean;
}

const SIGNAL_TYPES = [
  { value: "linkedin_engagement", label: "LinkedIn Engagement", color: "bg-blue-500" },
  { value: "website_visit", label: "Website Visit", color: "bg-green-500" },
  { value: "email_interaction", label: "Email Interaction", color: "bg-yellow-500" },
  { value: "content_download", label: "Content Download", color: "bg-indigo-500" },
  { value: "job_change", label: "Job Change", color: "bg-purple-500" },
  { value: "tech_stack_change", label: "Tech Stack Change", color: "bg-pink-500" },
  { value: "hiring_signals", label: "Hiring Signals", color: "bg-red-500" },
  { value: "company_news", label: "Company News", color: "bg-orange-500" },
  { value: "intent_data", label: "Intent Data", color: "bg-teal-500" },
];

export function CustomSignalInput({ onAnalyze, loading }: CustomSignalInputProps) {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [prospect, setProspect] = useState<Prospect>({
    company: "",
    name: "",
    role: "",
    industry: "",
  });
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editMetadata, setEditMetadata] = useState<Record<string, any>>({});

  const addSignal = (type: string) => {
    const newSignal: Signal = {
      type,
      timestamp: new Date().toISOString(),
      metadata: {},
    };
    setSignals([...signals, newSignal]);
    // Automatically open edit mode for the new signal
    setEditingIndex(signals.length);
    setEditMetadata({});
  };

  const startEdit = (index: number) => {
    setEditingIndex(index);
    setEditMetadata(signals[index].metadata || {});
  };

  const saveEdit = (index: number) => {
    const updatedSignals = [...signals];
    updatedSignals[index] = {
      ...updatedSignals[index],
      metadata: editMetadata,
    };
    setSignals(updatedSignals);
    setEditingIndex(null);
    setEditMetadata({});
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditMetadata({});
  };

  const removeSignal = (index: number) => {
    setSignals(signals.filter((_, i) => i !== index));
  };

  const renderMetadataFields = (signalType: string) => {
    switch (signalType) {
      case "linkedin_engagement":
        return (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium mb-1 block">Action Type</label>
              <select
                value={editMetadata.action || ""}
                onChange={(e) => setEditMetadata({ ...editMetadata, action: e.target.value })}
                className="w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select action...</option>
                <option value="commented">Commented</option>
                <option value="liked">Liked</option>
                <option value="shared">Shared</option>
                <option value="viewed">Viewed Profile</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Comment/Post Text (if applicable)</label>
              <textarea
                value={editMetadata.content || ""}
                onChange={(e) => setEditMetadata({ ...editMetadata, content: e.target.value })}
                placeholder="e.g., 'We're struggling with lead qualification and need a better solution ASAP'"
                rows={3}
                className="w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Post Topic</label>
              <input
                type="text"
                value={editMetadata.postTopic || ""}
                onChange={(e) => setEditMetadata({ ...editMetadata, postTopic: e.target.value })}
                placeholder="e.g., 'Sales automation'"
                className="w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        );

      case "email_interaction":
        return (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium mb-1 block">Number of Opens</label>
              <input
                type="number"
                value={editMetadata.opens || 1}
                onChange={(e) => setEditMetadata({ ...editMetadata, opens: parseInt(e.target.value) || 1 })}
                placeholder="e.g., 3"
                className="w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Links Clicked</label>
              <input
                type="number"
                value={editMetadata.linksClicked || 0}
                onChange={(e) => setEditMetadata({ ...editMetadata, linksClicked: parseInt(e.target.value) || 0 })}
                placeholder="e.g., 2"
                className="w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={editMetadata.replied || false}
                onChange={(e) => setEditMetadata({ ...editMetadata, replied: e.target.checked })}
                className="rounded"
              />
              <label className="text-xs font-medium">Replied to email</label>
            </div>
          </div>
        );

      case "website_visit":
        return (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium mb-1 block">Page URL</label>
              <input
                type="text"
                value={editMetadata.page || ""}
                onChange={(e) => setEditMetadata({ ...editMetadata, page: e.target.value })}
                placeholder="e.g., /features/automation"
                className="w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Duration (seconds)</label>
              <input
                type="number"
                value={editMetadata.duration || ""}
                onChange={(e) => setEditMetadata({ ...editMetadata, duration: parseInt(e.target.value) || 0 })}
                placeholder="e.g., 90"
                className="w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Referrer Source</label>
              <input
                type="text"
                value={editMetadata.referrer || ""}
                onChange={(e) => setEditMetadata({ ...editMetadata, referrer: e.target.value })}
                placeholder="e.g., google, linkedin, direct"
                className="w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        );

      case "content_download":
        return (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium mb-1 block">Asset Type</label>
              <select
                value={editMetadata.assetType || ""}
                onChange={(e) => setEditMetadata({ ...editMetadata, assetType: e.target.value })}
                className="w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select type...</option>
                <option value="whitepaper">Whitepaper</option>
                <option value="ebook">E-book</option>
                <option value="case_study">Case Study</option>
                <option value="roi_calculator">ROI Calculator</option>
                <option value="template">Template</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Topic</label>
              <input
                type="text"
                value={editMetadata.topic || ""}
                onChange={(e) => setEditMetadata({ ...editMetadata, topic: e.target.value })}
                placeholder="e.g., 'Sales Productivity'"
                className="w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        );

      case "product_trial":
        return (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium mb-1 block">Plan Type</label>
              <select
                value={editMetadata.plan || ""}
                onChange={(e) => setEditMetadata({ ...editMetadata, plan: e.target.value })}
                className="w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select plan...</option>
                <option value="free">Free</option>
                <option value="pro">Pro Trial</option>
                <option value="enterprise">Enterprise Trial</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Features Used</label>
              <input
                type="text"
                value={editMetadata.featuresUsed || ""}
                onChange={(e) => setEditMetadata({ ...editMetadata, featuresUsed: e.target.value })}
                placeholder="e.g., 'reporting, integrations, workflows'"
                className="w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Team Size</label>
              <input
                type="number"
                value={editMetadata.teamSize || 1}
                onChange={(e) => setEditMetadata({ ...editMetadata, teamSize: parseInt(e.target.value) || 1 })}
                placeholder="e.g., 5"
                className="w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        );

      case "demo_request":
        return (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium mb-1 block">Urgency Level</label>
              <select
                value={editMetadata.urgency || ""}
                onChange={(e) => setEditMetadata({ ...editMetadata, urgency: e.target.value })}
                className="w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select urgency...</option>
                <option value="low">Low - Just exploring</option>
                <option value="medium">Medium - Next quarter</option>
                <option value="high">High - Need ASAP</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Budget Mentioned</label>
              <input
                type="text"
                value={editMetadata.budget || ""}
                onChange={(e) => setEditMetadata({ ...editMetadata, budget: e.target.value })}
                placeholder="e.g., '$50k annually'"
                className="w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Additional Notes</label>
              <textarea
                value={editMetadata.notes || ""}
                onChange={(e) => setEditMetadata({ ...editMetadata, notes: e.target.value })}
                placeholder="e.g., 'Looking to replace current CRM'"
                rows={2}
                className="w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const handleAnalyze = () => {
    if (signals.length === 0) {
      alert("Please add at least one signal");
      return;
    }
    if (!prospect.company) {
      alert("Please enter company name");
      return;
    }
    onAnalyze(signals, prospect);
  };

  const getSignalLabel = (type: string) => {
    return SIGNAL_TYPES.find(s => s.value === type)?.label || type;
  };

  const getSignalColor = (type: string) => {
    return SIGNAL_TYPES.find(s => s.value === type)?.color || "bg-gray-500";
  };

  return (
    <div className="space-y-6">
      {/* Prospect Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Prospect Information
          </CardTitle>
          <CardDescription>Enter details about the prospect</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">
                Company Name *
              </label>
              <input
                type="text"
                value={prospect.company}
                onChange={(e) => setProspect({ ...prospect, company: e.target.value })}
                placeholder="e.g., Acme Corp"
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                Contact Name
              </label>
              <input
                type="text"
                value={prospect.name || ""}
                onChange={(e) => setProspect({ ...prospect, name: e.target.value })}
                placeholder="e.g., Jane Smith"
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                Role
              </label>
              <input
                type="text"
                value={prospect.role || ""}
                onChange={(e) => setProspect({ ...prospect, role: e.target.value })}
                placeholder="e.g., VP of Sales"
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                Industry
              </label>
              <input
                type="text"
                value={prospect.industry || ""}
                onChange={(e) => setProspect({ ...prospect, industry: e.target.value })}
                placeholder="e.g., SaaS"
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Signal Builder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Build Signal Sequence
          </CardTitle>
          <CardDescription>Add signals to analyze buyer intent</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Signal Types */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium">Add Signals:</p>
              <Badge variant="secondary" className="text-xs">
                <Edit2 className="h-3 w-3 mr-1" />
                Click edit to add details
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {SIGNAL_TYPES.map((signalType) => (
                <Button
                  key={signalType.value}
                  onClick={() => addSignal(signalType.value)}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  {signalType.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Added Signals */}
          {signals.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-3">
                Signal Timeline ({signals.length} signals):
              </p>
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {signals.map((signal, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${
                      editingIndex === index ? "border-primary bg-primary/5" : "bg-muted"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${getSignalColor(signal.type)}`} />
                        <div>
                          <p className="text-sm font-medium">
                            {getSignalLabel(signal.type)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(signal.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {editingIndex === index ? (
                          <>
                            <Button
                              onClick={() => saveEdit(index)}
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={cancelEdit}
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-gray-600 hover:text-gray-700"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              onClick={() => startEdit(index)}
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() => removeSignal(index)}
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Show metadata or edit form */}
                    {editingIndex === index ? (
                      <div className="mt-3 p-3 bg-background rounded border">
                        <p className="text-xs font-medium mb-2 text-muted-foreground">
                          Add Signal Details:
                        </p>
                        {renderMetadataFields(signal.type)}
                      </div>
                    ) : (
                      signal.metadata &&
                      Object.keys(signal.metadata).length > 0 && (
                        <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
                          {Object.entries(signal.metadata).map(([key, value]) => (
                            <div key={key} className="flex gap-2">
                              <span className="font-medium">{key}:</span>
                              <span className="truncate">{String(value)}</span>
                            </div>
                          ))}
                        </div>
                      )
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {signals.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No signals added yet</p>
              <p className="text-xs mt-1">Click on signal types above to add them</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analyze Button */}
      <div className="flex justify-end gap-4">
        <Button
          onClick={() => {
            setSignals([]);
            setProspect({ company: "", name: "", role: "", industry: "" });
          }}
          variant="outline"
          disabled={loading}
        >
          Clear All
        </Button>
        <Button
          onClick={handleAnalyze}
          disabled={loading || signals.length === 0 || !prospect.company}
          className="min-w-40"
        >
          {loading ? "Analyzing..." : "Analyze Signals"}
        </Button>
      </div>
    </div>
  );
}
