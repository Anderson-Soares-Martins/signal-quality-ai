# Arquitetura e Funcionamento da Aplicação

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Estrutura do Projeto](#estrutura-do-projeto)
3. [Arquitetura da Aplicação](#arquitetura-da-aplicação)
4. [Fluxo de Processamento](#fluxo-de-processamento)
5. [Componentes Principais](#componentes-principais)
6. [Fluxo de Dados](#fluxo-de-dados)
7. [API Endpoints](#api-endpoints)
8. [Configurações e Dados](#configurações-e-dados)

---

## Visão Geral

**Signal Quality Score AI** é um sistema de análise de qualidade de sinais de intenção de compra (buyer intent signals) que utiliza IA para avaliar e pontuar sinais de prospects, ajudando equipes de vendas a focar nos 20% de sinais que geram 80% do pipeline.

### Tecnologias Principais

- **Runtime**: Node.js com TypeScript
- **Framework Web**: Express.js
- **IA/LLM**: Anthropic Claude Sonnet 4
- **Validação**: Zod
- **Utilitários**: date-fns, dotenv

---

## Estrutura do Projeto

```
signal-quality-ai/
├── src/
│   ├── analyzers/              # Módulos de análise de sinais
│   │   ├── signalAnalyzer.ts   # Análise quantitativa de sinais
│   │   ├── llmExtractor.ts     # Extração de contexto via LLM
│   │   └── patternMatcher.ts   # Identificação de padrões
│   ├── scoring/                 # Sistema de pontuação
│   │   └── qualityScorer.ts    # Cálculo do score de qualidade
│   ├── recommendations/        # Sistema de recomendações
│   │   ├── actionEngine.ts     # Geração de ações recomendadas
│   │   └── messageGenerator.ts # Geração de mensagens personalizadas
│   ├── api/                    # Camada de API
│   │   ├── routes.ts           # Rotas da API
│   │   └── middleware.ts       # Middlewares (validação, CORS, etc)
│   ├── utils/                  # Utilitários
│   │   ├── schemas.ts          # Schemas Zod para validação
│   │   ├── temporal.ts         # Cálculos temporais (recência, etc)
│   │   └── logger.ts           # Sistema de logging
│   └── index.ts                # Ponto de entrada da aplicação
├── data/
│   ├── patterns/               # Padrões conhecidos de conversão
│   │   └── known-patterns.json
│   ├── weights/                # Pesos configuráveis
│   │   └── signal-weights.json
│   └── examples/                # Exemplos de dados
│       ├── high-quality.json
│       ├── false-positive.json
│       └── mixed-signals.json
├── examples/                   # Exemplos de uso
│   └── cli-demo.ts
├── tests/                      # Testes unitários
│   ├── qualityScorer.test.ts
│   ├── signalAnalyzer.test.ts
│   └── temporal.test.ts
├── package.json
├── tsconfig.json
└── README.md
```

---

## Arquitetura da Aplicação

### Camadas da Aplicação

```
┌─────────────────────────────────────────────────────┐
│              CAMADA DE API (Express)                 │
│  • Rotas REST                                        │
│  • Validação de entrada (Zod)                       │
│  • Middlewares (CORS, logging, error handling)     │
└─────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────┐
│         CAMADA DE PROCESSAMENTO                      │
│  ┌──────────────────────────────────────────────┐  │
│  │ 1. Signal Analyzer (Quantitativo)            │  │
│  │    • Calcula score base por tipo de sinal    │  │
│  │    • Analisa fatores temporais               │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │ 2. LLM Extractor (Qualitativo)                │  │
│  │    • Extrai pain points via Claude           │  │
│  │    • Detecta urgência e especificidade       │  │
│  │    • Identifica risco de false positive      │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │ 3. Pattern Matcher                            │  │
│  │    • Identifica padrões históricos            │  │
│  │    • Calcula confiança e match score         │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │ 4. Quality Scorer                              │  │
│  │    • Combina scores com pesos                │  │
│  │    • Calcula score final (0-100)             │  │
│  │    • Determina prioridade e confiança        │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │ 5. Action Engine                              │  │
│  │    • Gera recomendações de ação              │  │
│  │    • Determina canal e timing                │  │
│  │    • Gera mensagem personalizada             │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────┐
│              CAMADA DE DADOS                         │
│  • Padrões conhecidos (JSON)                         │
│  • Pesos configuráveis (JSON)                        │
│  • Exemplos de dados (JSON)                          │
└─────────────────────────────────────────────────────┘
```

---

## Fluxo de Processamento

### Fluxo Completo de Análise

```
1. RECEPÇÃO DA REQUISIÇÃO
   └─> POST /api/analyze
       ├─> Validação (Zod schemas)
       └─> Extração de dados (signals, prospect, options)

2. ANÁLISE QUANTITATIVA
   └─> signalAnalyzer.analyzeSignals()
       ├─> Para cada sinal:
       │   ├─> Calcula score quantitativo (0-100)
       │   ├─> Analisa recência (quão recente)
       │   ├─> Calcula frequência (quantas vezes)
       │   └─> Determina velocidade (aumentando/diminuindo)
       └─> Retorna: AnalyzedSignal[]

3. ENRIQUECIMENTO QUALITATIVO
   └─> llmExtractor.enrichSignalsWithContext()
       ├─> Para cada sinal:
       │   ├─> Chama Claude Sonnet 4 API
       │   ├─> Extrai pain points
       │   ├─> Detecta urgência (low/medium/high)
       │   ├─> Avalia especificidade
       │   ├─> Identifica estágio de compra
       │   ├─> Analisa sentimento
       │   └─> Calcula risco de false positive
       └─> Retorna: AnalyzedSignal[] (enriquecido)

4. IDENTIFICAÇÃO DE PADRÕES
   └─> patternMatcher.identifyPatterns()
       ├─> Carrega padrões conhecidos (known-patterns.json)
       ├─> Para cada padrão:
       │   ├─> Verifica sinais obrigatórios
       │   ├─> Verifica sinais opcionais (bonus)
       │   └─> Calcula match score e confiança
       └─> Retorna: MatchedPattern[]

5. CÁLCULO DO SCORE DE QUALIDADE
   └─> qualityScorer.calculateQualityScore()
       ├─> Calcula score médio dos sinais (40% peso)
       ├─> Calcula score baseado em padrões (40% peso)
       ├─> Calcula fit do prospect (20% peso)
       ├─> Aplica multiplicadores (urgência, especificidade, etc)
       ├─> Determina nível de confiança (low/medium/high)
       ├─> Determina prioridade (ignore/low/medium/high/urgent)
       └─> Retorna: QualityScoreResult

6. GERAÇÃO DE RECOMENDAÇÕES
   └─> actionEngine.generateActionRecommendation()
       ├─> Determina canal (LinkedIn/Email)
       ├─> Determina timing (24h/48h/semana)
       ├─> Determina ângulo de mensagem
       ├─> Gera lista "não mencionar"
       ├─> Estima probabilidade de conversão
       ├─> Estima dias para fechar
       ├─> Estima valor do deal
       └─> Gera mensagem personalizada (opcional)
       └─> Retorna: ActionRecommendationResult

7. RESPOSTA
   └─> Retorna JSON completo com:
       ├─> Quality Score (0-100)
       ├─> Confiança e Prioridade
       ├─> Breakdown de sinais
       ├─> Padrões identificados
       ├─> Ação recomendada
       ├─> Mensagem sugerida
       └─> Estimativas de resultado
```

---

## Componentes Principais

### 1. Signal Analyzer (`src/analyzers/signalAnalyzer.ts`)

**Responsabilidade**: Análise quantitativa de sinais individuais.

**Funções Principais**:
- `calculateQuantitativeScore(signal)`: Calcula score base (0-100) por tipo de sinal
- `analyzeSignal(signal, allSignals)`: Análise completa de um sinal
- `analyzeSignals(signals)`: Análise de múltiplos sinais

**Tipos de Sinais Suportados**:
1. `linkedin_engagement` - Engajamento no LinkedIn (comentário, like, share)
2. `website_visit` - Visitas ao website (páginas, duração, bounce rate)
3. `job_change` - Mudanças de emprego (novo cargo, senioridade)
4. `content_download` - Downloads de conteúdo (whitepapers, case studies)
5. `email_interaction` - Interações por email (abertura, clique, resposta)
6. `company_news` - Notícias da empresa (funding, expansão)
7. `hiring_signals` - Sinais de contratação (departamentos, volume)
8. `tech_stack_change` - Mudanças no tech stack
9. `intent_data` - Dados de intenção (pesquisa de preços, comparação)

**Exemplo de Scoring**:
- LinkedIn comentário: 85 pontos (alto valor)
- LinkedIn like: 30 pontos (baixo valor)
- Visita à página de preços: 75 pontos
- Visita ao blog: 25 pontos
- Download de guia de implementação: 85 pontos (BOFU)
- Download de ebook: 50 pontos (TOFU)

### 2. LLM Extractor (`src/analyzers/llmExtractor.ts`)

**Responsabilidade**: Extração de contexto qualitativo usando Claude Sonnet 4.

**Funções Principais**:
- `enrichSignalsWithContext(analyzedSignals, prospect)`: Enriquece sinais com contexto LLM
- `extractContextFromSignal(signal, prospect)`: Extrai contexto de um sinal

**Dados Extraídos**:
- **Pain Points**: Problemas explícitos mencionados
- **Urgency**: Urgência da necessidade (low/medium/high)
- **Specificity**: Especificidade do sinal (low/medium/high)
- **Buying Stage**: Estágio da jornada (awareness/consideration/decision)
- **Sentiment**: Sentimento (positive/negative/neutral)
- **False Positive Risk**: Risco de ser falso positivo (low/medium/high)
- **Confidence**: Confiança na análise (0-1)

**Prompt Template**:
O sistema envia para o Claude um prompt estruturado com:
- Dados do sinal (JSON)
- Contexto do prospect (empresa, cargo, indústria)
- Instruções para extrair insights específicos

### 3. Pattern Matcher (`src/analyzers/patternMatcher.ts`)

**Responsabilidade**: Identifica padrões de sinais que historicamente convertem.

**Funções Principais**:
- `identifyPatterns(enrichedSignals)`: Identifica padrões nos sinais
- `loadKnownPatterns()`: Carrega padrões do arquivo JSON
- `detectFalsePositive(patterns)`: Detecta padrões de false positive

**Padrões Conhecidos** (exemplos):
1. **Engaged Evaluator**: Comentário LinkedIn + 2+ visitas a preços → 73% conversão
2. **New Role Evaluator**: Novo cargo (15-90 dias) + funding → 58% conversão
3. **Active Evaluator with Budget**: Pain point público + pesquisa de preços → 81% conversão
4. **Competitor Researcher**: Engajamento raso → 4% conversão (false positive)
5. **Ready to Buy**: 3+ visitas a preços + download BOFU → 87% conversão

**Estrutura de Padrão**:
```typescript
{
  id: string,
  name: string,
  requiredSignals: PatternCriteria[],
  optionalSignals?: PatternCriteria[],
  historicalConversion: number, // %
  avgDaysToClose: number,
  confidence: number,
  weight: number,
  isFalsePositive?: boolean
}
```

### 4. Quality Scorer (`src/scoring/qualityScorer.ts`)

**Responsabilidade**: Calcula o score final de qualidade (0-100).

**Funções Principais**:
- `calculateQualityScore(enrichedSignals, patterns, prospect)`: Calcula score final
- `getScoreInterpretation(score)`: Interpreta o score

**Fórmula de Cálculo**:
```
Quality Score = 
  (Score Médio dos Sinais × 40%) +
  (Score de Padrões × 40%) +
  (Score de Fit do Prospect × 20%)
```

**Multiplicadores Aplicados**:
- **Urgência**: high = 1.3x, medium = 1.0x, low = 0.7x
- **Especificidade**: high = 1.25x, medium = 1.0x, low = 0.8x
- **Estágio de Compra**: decision = 1.4x, consideration = 1.15x, awareness = 0.9x
- **Risco False Positive**: low = 1.2x, medium = 1.0x, high = 0.6x
- **Recência**: Baseado em quão recente é o sinal (0.8x a 1.2x)
- **Velocidade**: increasing = 1.2x, stable = 1.0x, decreasing = 0.8x

**Níveis de Prioridade**:
- **85-100**: Urgent - Ação imediata (24h)
- **70-84**: High - Alta prioridade (48h)
- **50-69**: Medium - Monitorar
- **30-49**: Low - Baixa prioridade
- **0-29**: Ignore - Ignorar ou remover

### 5. Action Engine (`src/recommendations/actionEngine.ts`)

**Responsabilidade**: Gera recomendações de ação baseadas no score.

**Funções Principais**:
- `generateActionRecommendation(scoringResult, enrichedSignals, prospect, options)`: Gera recomendação completa

**Decisões Tomadas**:
1. **Canal**: LinkedIn (se engajou lá) ou Email (se interagiu por email)
2. **Timing**: 
   - Score ≥85 ou urgência alta → 24h
   - Score ≥70 → 48h
   - Score ≥50 → 1 semana
   - Score <50 → sem pressa
3. **Ângulo de Mensagem**: Baseado em pain points identificados
4. **Lista "Não Mencionar"**: Evita mencionar tracking invasivo

**Estimativas Geradas**:
- Probabilidade de conversão (0-1)
- Dias estimados para fechar
- Valor estimado do deal (ACV)

### 6. Message Generator (`src/recommendations/messageGenerator.ts`)

**Responsabilidade**: Gera mensagens personalizadas para outreach.

**Funções Principais**:
- `generatePersonalizedMessage(prospect, signals, angle, painPoint, patterns)`: Gera mensagem

**Estratégias de Mensagem**:
- Baseada em pain points identificados
- Referência a padrões históricos
- Evita mencionar tracking invasivo
- Personalizada por canal (LinkedIn vs Email)

---

## Fluxo de Dados

### Entrada (Request)

```json
{
  "signals": [
    {
      "type": "linkedin_engagement",
      "action": "commented",
      "content": "Nossa equipe luta com entrada manual de dados...",
      "timestamp": "2026-01-02T14:30:00Z"
    },
    {
      "type": "website_visit",
      "page": "/pricing",
      "duration": 180,
      "timestamp": "2026-01-02T16:45:00Z"
    }
  ],
  "prospect": {
    "name": "Jane Doe",
    "company": "TechCorp",
    "role": "VP Sales",
    "industry": "SaaS",
    "companySize": "50-200"
  },
  "options": {
    "includeHistoricalComparison": true,
    "generateMessage": true,
    "llmProvider": "anthropic"
  }
}
```

### Processamento Interno

1. **Signal → AnalyzedSignal**:
```typescript
{
  type: "linkedin_engagement",
  quantitativeScore: 85,
  qualitativeContext: {}, // Vazio inicialmente
  temporalFactors: {
    recency: 0.95,
    frequency: 1,
    velocity: "stable"
  }
}
```

2. **AnalyzedSignal → EnrichedSignal** (após LLM):
```typescript
{
  type: "linkedin_engagement",
  quantitativeScore: 85,
  qualitativeContext: {
    painPoints: ["manual data entry", "team productivity"],
    urgency: "high",
    specificity: "high",
    buyingStage: "consideration",
    falsePositiveRisk: "low"
  },
  temporalFactors: { ... }
}
```

3. **EnrichedSignals → MatchedPatterns**:
```typescript
{
  pattern: "active_evaluator_with_budget",
  name: "Active Evaluator with Budget",
  historicalConversion: 81,
  avgDaysToClose: 12,
  confidence: 0.9
}
```

4. **EnrichedSignals + Patterns → QualityScoreResult**:
```typescript
{
  qualityScore: 84,
  confidence: "high",
  priorityLevel: "high",
  breakdown: [...],
  patterns: [...],
  reasoning: "..."
}
```

### Saída (Response)

```json
{
  "qualityScore": 84,
  "confidence": "high",
  "priorityLevel": "high",
  "analysis": {
    "summary": "Strong signal cluster...",
    "keyInsights": ["Pain points identified...", ...]
  },
  "signalBreakdown": [...],
  "matchedPatterns": [...],
  "recommendedAction": {
    "type": "personalized_outreach",
    "channel": "linkedin_message",
    "timing": "within_48h",
    "suggestedMessage": "Hi Jane,\n\nSaw your comment...",
    "nextSteps": [...]
  },
  "estimatedOutcome": {
    "conversionProbability": 0.68,
    "estimatedDaysToClose": 21,
    "estimatedDealValue": "$150k-200k ACV"
  }
}
```

---

## API Endpoints

### POST /api/analyze

**Descrição**: Endpoint principal para análise de sinais.

**Request Body**:
- `signals`: Array de sinais (obrigatório, mínimo 1)
- `prospect`: Dados do prospect (obrigatório)
- `options`: Opções de análise (opcional)

**Response**: Objeto completo com análise, score, recomendações e estimativas.

**Fluxo**:
1. Valida entrada com Zod
2. Chama pipeline completo de análise
3. Retorna resultado estruturado

### GET /api/health

**Descrição**: Health check da API.

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2026-01-02T...",
  "version": "1.0.0"
}
```

### GET /api/patterns

**Descrição**: Retorna lista de padrões conhecidos.

**Response**: Array de padrões com taxas de conversão históricas.

### POST /api/feedback

**Descrição**: Endpoint para feedback sobre análises (learning loop futuro).

**Request Body**:
- `analysisId`: ID da análise
- `outcome`: won/lost/in_progress/disqualified
- `actualDaysToClose`: Dias reais para fechar
- `actualDealValue`: Valor real do deal

### GET /api/examples/:type

**Descrição**: Retorna exemplos de cenários.

**Tipos**: `high-quality`, `false-positive`, `mixed-signals`

---

## Configurações e Dados

### 1. Signal Weights (`data/weights/signal-weights.json`)

Define pesos base para cada tipo de sinal e multiplicadores de contexto.

**Estrutura**:
```json
{
  "signalTypeWeights": {
    "linkedin_engagement": { "baseWeight": 0.25 },
    "website_visit": { "baseWeight": 0.22 },
    ...
  },
  "contextMultipliers": {
    "urgency": { "high": 1.3, "medium": 1.0, "low": 0.7 },
    ...
  },
  "scoringWeights": {
    "individualSignals": 0.4,
    "patternMatching": 0.4,
    "prospectFit": 0.2
  }
}
```

### 2. Known Patterns (`data/patterns/known-patterns.json`)

Define padrões de sinais que historicamente convertem.

**Estrutura**:
```json
[
  {
    "id": "engaged_evaluator",
    "name": "Engaged Evaluator",
    "requiredSignals": [...],
    "optionalSignals": [...],
    "historicalConversion": 73,
    "avgDaysToClose": 14,
    "confidence": 0.85,
    "weight": 100
  },
  ...
]
```

### 3. Example Data (`data/examples/`)

Arquivos JSON com exemplos de:
- Sinais de alta qualidade
- False positives
- Sinais mistos

---

## Variáveis de Ambiente

```bash
# Obrigatório
ANTHROPIC_API_KEY=your_key_here

# Opcional
PORT=3000
NODE_ENV=development
```

---

## Considerações de Performance

**Tempo de Processamento**:
- Com LLM real (Claude): ~500-1000ms por análise
- Com mock LLM: ~50-100ms por análise

**Otimizações Futuras**:
- Cache Redis para prospects repetidos
- Batch processing de múltiplos prospects
- Pré-computação de padrões
- Indexação em banco de dados

---

## Extensibilidade

### Adicionar Novo Tipo de Sinal

1. Adicionar tipo em `schemas.ts` (SignalType enum)
2. Implementar função de scoring em `signalAnalyzer.ts`
3. Adicionar peso em `signal-weights.json`

### Adicionar Novo Padrão

1. Adicionar entrada em `known-patterns.json`
2. Definir sinais obrigatórios e opcionais
3. Configurar taxa de conversão histórica

### Modificar Pesos

1. Editar `signal-weights.json`
2. Ajustar multiplicadores conforme necessário
3. Recalibrar baseado em dados históricos

---

## Conclusão

Esta aplicação implementa um pipeline completo de análise de sinais de buyer intent, combinando:

- **Análise Quantitativa**: Scoring baseado em métricas objetivas
- **Análise Qualitativa**: Extração de contexto via LLM
- **Pattern Matching**: Identificação de padrões históricos
- **Scoring Inteligente**: Combinação ponderada de fatores
- **Recomendações Acionáveis**: Ações específicas com mensagens personalizadas

O sistema é modular, extensível e projetado para escalar conforme novos dados e padrões são descobertos.


