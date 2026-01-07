import type { Signal, Prospect, AnalysisResult, ExampleScenario } from './types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export async function analyzeSignals(
  signals: Signal[],
  prospect: Prospect,
  options?: { generateMessage?: boolean }
): Promise<AnalysisResult> {
  const response = await fetch(`${API_BASE_URL}/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ signals, prospect, options }),
  });

  if (!response.ok) {
    throw new Error(`Analysis failed: ${response.statusText}`);
  }

  return response.json();
}

export async function getExample(type: string): Promise<ExampleScenario> {
  const response = await fetch(`${API_BASE_URL}/examples/${type}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch example: ${response.statusText}`);
  }

  return response.json();
}

export async function healthCheck(): Promise<{ status: string }> {
  const response = await fetch(`${API_BASE_URL}/health`);
  return response.json();
}
