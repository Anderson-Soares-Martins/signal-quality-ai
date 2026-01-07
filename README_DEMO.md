# Signal Quality Score AI - Interactive Demo

## The "Wow Moment"

This isn't just another backend API - it's a **complete, production-ready demo** that shows exactly how the system transforms raw buyer intent signals into actionable sales intelligence.

### What Makes This Different

**Before (What evaluators usually see):**
- JSON responses in Postman
- Technical documentation
- Abstract API endpoints
- "Imagine if you could..."

**Now (What they'll experience):**
- Click a scenario → See results in **3 seconds**
- Visual score gauge (0-100) with color-coded priority
- AI-generated personalized outreach messages
- Timeline visualization of signal activity
- Pattern matching from historical data
- Estimated deal value and conversion probability

## Quick Start (< 2 minutes)

### Prerequisites
- Node.js 18+
- pnpm (install with `npm install -g pnpm`)
- Anthropic API key

### Setup

1. **Clone and install dependencies:**
```bash
cd signal-quality-ai
pnpm install
```

2. **Configure API key:**
```bash
# Create .env in backend/
cp backend/.env.example backend/.env

# Add your Anthropic API key
echo "ANTHROPIC_API_KEY=your_key_here" >> backend/.env
```

3. **Start both servers:**
```bash
pnpm dev
```

4. **Open the demo:**
```
Frontend: http://localhost:5173
Backend:  http://localhost:3000
```

## Demo Scenarios

The interface includes 3 pre-loaded scenarios that demonstrate different signal quality levels:

### 1. Hot Lead (Score: 85-95)
**What it shows:**
- Strong buying signals across multiple channels
- High-intent actions (pricing page visits, demo requests)
- Pattern match: "Ready to Buy" (87% historical conversion)
- Recommended action: Contact within 24-48 hours via LinkedIn
- AI-generated personalized message based on their specific interactions

**Use case:**
SDR needs to prioritize their outreach for the day. This prospect gets flagged as urgent.

### 2. False Positive (Score: 15-30)
**What it shows:**
- Low-quality signals (single like, brief visit)
- No meaningful engagement pattern
- Recommended action: Monitor, don't reach out yet
- Saves wasted time on unqualified leads

**Use case:**
Prevents sales team from chasing cold leads that look warm in traditional systems.

### 3. Mixed Signals (Score: 50-65)
**What it shows:**
- Some positive indicators but not ready to buy
- Recommended action: Nurture campaign, follow up in 1 week
- Pattern match: "Engaged Evaluator" (73% conversion, 14 days avg)

**Use case:**
Helps identify prospects in early research phase who need education before sales contact.

## Tech Stack

### Backend
- **Node.js + TypeScript + Express**
- **Claude AI (Anthropic)** - For qualitative signal analysis and message generation
- **Zod** - Schema validation
- **Custom scoring algorithm** - Combines quantitative and qualitative analysis

### Frontend
- **React 19 + TypeScript**
- **Vite** - Ultra-fast dev server and build tool
- **Tailwind CSS v4** - Latest version with CSS-first configuration
- **shadcn/ui** - Modern, accessible component library
- **Recharts** - Beautiful data visualization
- **Lucide React** - Icon library

### Architecture
- **Monorepo** structure (pnpm workspaces)
- **Clean separation** between backend logic and UI
- **Type-safe** end-to-end with shared TypeScript types

## Project Structure

```
signal-quality-ai/
├── backend/                    # Express API
│   ├── src/
│   │   ├── analyzers/         # Signal analysis logic
│   │   ├── scoring/           # Quality scoring algorithm
│   │   ├── recommendations/   # Action & message generation
│   │   └── api/               # Express routes
│   └── data/examples/         # Demo scenarios
│
├── frontend/                   # React UI
│   ├── src/
│   │   ├── components/        # UI components
│   │   │   ├── ScoreGauge.tsx
│   │   │   ├── SignalBreakdown.tsx
│   │   │   ├── SignalTimeline.tsx
│   │   │   └── ActionRecommendation.tsx
│   │   ├── api.ts            # Backend client
│   │   └── types.ts          # TypeScript types
│   └── components.json        # shadcn config
│
└── package.json               # Workspace root
```

## Available Scripts

```bash
# Development
pnpm dev              # Start both backend and frontend
pnpm dev:backend      # Start only backend (port 3000)
pnpm dev:frontend     # Start only frontend (port 5173)

# Backend-only commands
pnpm demo             # Run CLI demo with colored output
pnpm test             # Run backend tests

# Build for production
pnpm build            # Build both apps
pnpm build:backend    # Build backend only
pnpm build:frontend   # Build frontend only
```

## API Endpoints

### `POST /api/analyze`
Analyze buyer intent signals and get recommendations.

**Request:**
```json
{
  "signals": [
    {
      "type": "linkedin_interaction",
      "timestamp": "2024-01-06T10:00:00Z",
      "metadata": { "action": "comment" }
    }
  ],
  "prospect": {
    "company": "Acme Corp",
    "name": "Jane Smith",
    "role": "VP of Sales"
  },
  "options": {
    "generateMessage": true
  }
}
```

**Response:**
```json
{
  "qualityScore": 87,
  "confidence": "high",
  "priorityLevel": "urgent",
  "analysis": {
    "summary": "Strong buying signals...",
    "keyInsights": ["..."]
  },
  "signalBreakdown": [...],
  "matchedPatterns": [...],
  "recommendedAction": {
    "type": "direct_outreach",
    "channel": "LinkedIn",
    "timing": "within 24 hours",
    "suggestedMessage": "Hi Jane, I noticed..."
  },
  "estimatedOutcome": {
    "conversionProbability": 0.87,
    "estimatedDaysToClose": 7,
    "estimatedDealValue": "$50-75k"
  }
}
```

### `GET /api/examples/:type`
Fetch pre-loaded demo scenarios.

Types: `high-quality`, `false-positive`, `mixed-signals`

### `GET /api/health`
Health check endpoint.

## How to Impress Evaluators

### 1. Start with the Hot Lead scenario
- Shows the system at its best
- Clear, immediate value
- Demonstrates AI-generated messaging

### 2. Follow with False Positive
- Shows the system prevents wasted time
- Demonstrates intelligent filtering
- ROI story: "This alone saves 10+ hours/week per SDR"

### 3. Show the timeline visualization
- Click "Signals" tab
- Point out the signal activity chart
- Explain pattern recognition

### 4. Highlight the technical architecture
- Open the code in VS Code
- Show the monorepo structure
- Point out TypeScript, modern stack
- Mention the scoring algorithm combines quantitative + qualitative

### 5. Mention future possibilities
- Chrome extension for LinkedIn
- Real-time signal ingestion
- Learning loop (feedback system already has endpoint)
- Multi-channel signal sources

## Development Notes

### Adding New Demo Scenarios

1. Create a JSON file in `backend/data/examples/`:
```json
{
  "description": "Your scenario description",
  "signals": [...],
  "prospect": {...}
}
```

2. Add to `backend/src/api/routes.ts` validTypes array

3. Add to frontend scenario selector in `ScenarioSelector.tsx`

### Customizing the UI

The design system is based on shadcn/ui and Tailwind CSS v4. All colors and styles are defined in:
- `frontend/src/index.css` - Design tokens
- Individual components use Tailwind utility classes

### Modifying the Scoring Algorithm

The scoring logic is in `backend/src/scoring/qualityScorer.ts`. It combines:
- Quantitative factors (recency, frequency, signal types)
- Qualitative analysis from Claude AI
- Pattern matching against historical data

## Troubleshooting

### Frontend can't connect to backend
- Ensure backend is running on port 3000
- Check `frontend/.env` has correct `VITE_API_URL`
- Look for CORS errors in browser console

### Backend API errors
- Verify `ANTHROPIC_API_KEY` in `backend/.env`
- Check Claude API quota/limits
- Review backend logs in terminal

### Build errors
- Run `pnpm install` in project root
- Clear node_modules and reinstall: `rm -rf node_modules backend/node_modules frontend/node_modules && pnpm install`

## License

MIT

---

**Ready to impress?** Run `pnpm dev` and open http://localhost:5173
