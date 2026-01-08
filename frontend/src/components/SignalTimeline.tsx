import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import type { Signal } from "@/types";
import { Clock } from "lucide-react";

interface SignalTimelineProps {
  signals: Signal[];
}

export function SignalTimeline({ signals }: SignalTimelineProps) {
  // Group signals by day
  const groupedByDay = signals.reduce((acc, signal) => {
    const date = new Date(signal.timestamp).toLocaleDateString();
    if (!acc[date]) {
      acc[date] = 0;
    }
    acc[date]++;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(groupedByDay).map(([date, count]) => ({
    date,
    count,
  }));

  const getSignalColor = (type: string): string => {
    const colorMap: Record<string, string> = {
      linkedin_engagement: "#0A66C2",
      website_visit: "#3B82F6",
      content_engagement: "#10B981",
      email_open: "#F59E0B",
      demo_request: "#EF4444",
      email_interaction: "#8B5CF6",
    };
    return colorMap[type] || "#6B7280";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Signal Timeline
        </CardTitle>
        <CardDescription>Signal activity over time</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Chart */}
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <XAxis
                dataKey="date"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                fontSize={12}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip />
              <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>

          {/* Signal List */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Recent Signals</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {signals
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .slice(0, 10)
                .map((signal, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div
                      className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                      style={{ backgroundColor: getSignalColor(signal.type) }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium truncate">
                          {signal.type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                        </p>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(signal.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      {signal.content && (
                        <p className="text-xs text-muted-foreground truncate mt-1">
                          {signal.content}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
