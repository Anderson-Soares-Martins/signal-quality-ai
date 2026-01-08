# 🚀 Deployment Guide - Signal Quality AI

Este guia contém instruções passo a passo para fazer deploy do projeto na Vercel.

## 📋 Pré-requisitos

- Conta na [Vercel](https://vercel.com)
- Repositório Git (GitHub, GitLab ou Bitbucket)
- Node.js v22+ instalado localmente
- Yarn instalado (`npm install -g yarn`)

## 🏗️ Arquitetura do Monorepo

O projeto usa **Yarn** para gerenciar o monorepo com dois apps:

```
signal-quality-ai/
├── frontend/          # React + Vite app
├── backend/           # Express API
├── vercel.json        # Root config (ignora builds)
├── frontend/vercel.json
├── backend/vercel.json
└── package.json
```

**⚠️ IMPORTANTE:** O deploy na Vercel deve ser feito com **projetos separados**, não do repositório root.

## 🎯 Estratégia de Deploy

### Opção A: Frontend na Vercel + Backend Alternativo (Recomendado)

**Frontend → Vercel** ✅
- Deploy do React app na Vercel
- CDN global, preview deployments automáticos

**Backend → Railway/Render/Fly.io** ✅
- Melhor para Express com Claude API
- Sem limitações de serverless (250MB, timeouts)
- Suporte a conexões persistentes

### Opção B: Tudo na Vercel (Serverless)

Deploy de frontend E backend na Vercel como funções serverless.

**⚠️ Limitações do Backend Serverless:**
- Limite de 250MB para o bundle
- Timeouts (Hobby: 10s, Pro: 60s)
- Sem WebSocket persistente
- `express.static()` não funciona

## 📦 Deploy do Frontend na Vercel

### 1. Via Dashboard Vercel

1. Acesse [vercel.com/new](https://vercel.com/new)
2. Importe seu repositório Git
3. **IMPORTANTE**: Configure o Root Directory:
   - **Root Directory**: `frontend` ← **OBRIGATÓRIO!**
   - **Framework Preset**: Vite
   - **Build Command**: `yarn build` (auto-detectado)
   - **Output Directory**: `dist` (auto-detectado)
   - **Install Command**: `yarn install` (auto-detectado)
   - **Node Version**: 22.x

4. Adicione Environment Variables:
   - `VITE_API_URL`: URL do seu backend (ex: `https://api.seudominio.com`)

5. Click em **Deploy**

**⚠️ ATENÇÃO:** Se você não configurar o Root Directory como `frontend`, a Vercel vai tentar fazer build do repositório root e vai falhar com erros do Turbo!

### 2. Via Vercel CLI

```bash
# Instale Vercel CLI
npm i -g vercel

# Na raiz do projeto
cd frontend
vercel

# Siga o wizard:
# - Link to existing project? No
# - What's your project's name? signal-quality-ai-frontend
# - In which directory is your code located? ./
# - Want to override settings? Yes
#   - Build Command: yarn build
#   - Output Directory: dist
#   - Development Command: yarn dev

# Deploy para produção
vercel --prod
```

## 🔧 Deploy do Backend

### Opção 1: Vercel Serverless

1. Crie um **novo projeto** na Vercel
2. Use o mesmo repositório Git
3. **IMPORTANTE**: Configure o Root Directory:
   - **Root Directory**: `backend` ← **OBRIGATÓRIO!**
   - **Framework Preset**: Other
   - **Build Command**: `yarn build` (auto-detectado)
   - **Output Directory**: `dist`
   - **Node Version**: 22.x

4. Environment Variables:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   NODE_ENV=production
   VERCEL=1
   ```

5. Deploy

**Teste:**
```bash
curl https://seu-backend.vercel.app/api/health
```

### Opção 2: Railway (Recomendado para o Backend)

1. Acesse [railway.app](https://railway.app)
2. Click em **New Project** → **Deploy from GitHub repo**
3. Selecione seu repositório
4. Railway detecta o monorepo automaticamente
5. Selecione o diretório `backend`
6. Adicione variáveis de ambiente:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   PORT=$PORT
   NODE_ENV=production
   ```

7. Railway faz deploy automaticamente

8. Copie a URL gerada (ex: `https://signal-quality-ai-production.up.railway.app`)

9. Atualize a variável `VITE_API_URL` no frontend da Vercel

## 🔄 Cache e Performance

Para melhorar performance dos builds:

- Vercel já faz cache automático de `node_modules` e build outputs
- Yarn mantém cache local de pacotes
- Configure dependências como `devDependencies` quando possível para reduzir bundle size

## 🌍 Configuração de Environment Variables

### Frontend (`frontend/.env`)
```bash
VITE_API_URL=https://seu-backend.railway.app
```

### Backend (`backend/.env`)
```bash
ANTHROPIC_API_KEY=sk-ant-api-03-...
PORT=3000
NODE_ENV=production
```

**Na Vercel/Railway**: Adicione essas variáveis no dashboard do projeto.

## ✅ Checklist de Deploy

### Pré-Deploy
- [ ] Código commitado e pushed para Git
- [ ] `.env` files configurados localmente
- [ ] `yarn build` roda sem erros no frontend e backend
- [ ] Testes passando (se houver)

### Deploy Frontend
- [ ] Projeto criado na Vercel
- [ ] Root Directory configurado para `frontend`
- [ ] Build rodou com sucesso
- [ ] `VITE_API_URL` configurada
- [ ] Site acessível

### Deploy Backend
- [ ] Projeto criado (Vercel ou Railway)
- [ ] Root Directory configurado para `backend` (se Vercel)
- [ ] `ANTHROPIC_API_KEY` configurada
- [ ] Health check funcionando: `/api/health`
- [ ] Endpoint de análise testado: `/api/analyze`

### Pós-Deploy
- [ ] Frontend conecta com backend corretamente
- [ ] Testar cenários demo no frontend
- [ ] Testar custom signal analysis
- [ ] Verificar logs de erro

## 🐛 Troubleshooting

### Frontend não conecta ao backend
- Verifique `VITE_API_URL` no Vercel
- Confira CORS no backend (middleware.ts)
- Teste o endpoint diretamente: `curl https://backend-url/api/health`

### Backend timeout na Vercel
- Vercel Hobby tem limite de 10s por request
- Claude API pode demorar mais que isso
- **Solução**: Use Railway/Render para backend

### Build falha com "Cannot find module"
- Execute `yarn install` localmente na pasta do projeto (frontend ou backend)
- Verifique se `package.json` tem todas as dependências
- Confira se você configurou o **Root Directory** corretamente na Vercel

### Vercel tenta usar Turbo automaticamente
- Adicione `vercel.json` na raiz com `"ignoreCommand": "exit 1"`
- Configure o **Root Directory** como `frontend` ou `backend` no dashboard
- Não faça deploy do repositório root, sempre use um subdiretório

### Environment variables não aparecem
- Adicione as variáveis no dashboard da Vercel em Settings → Environment Variables
- Variáveis com prefixo `VITE_` são expostas no frontend (cuidado com dados sensíveis!)
- Rebuilde o projeto após adicionar novas variáveis

## 📚 Recursos

- [Vercel Monorepos Docs](https://vercel.com/docs/monorepos)
- [Vercel Root Directory](https://vercel.com/docs/projects/project-configuration#root-directory)
- [Railway Monorepo Deploy](https://docs.railway.app/deploy/deployments)
- [Express on Vercel](https://vercel.com/guides/using-express-with-vercel)
- [Yarn Workspaces](https://classic.yarnpkg.com/en/docs/workspaces/)

## 🎉 Deploy Bem-Sucedido!

Após seguir este guia, você terá:

- ✅ Frontend rodando na Vercel com CDN global
- ✅ Backend rodando (Vercel serverless OU Railway/Render)
- ✅ Preview deployments automáticos para PRs
- ✅ CI/CD configurado via Git push
- ✅ Environment variables seguras

---

**Próximos Passos:**
- Configure domínio customizado na Vercel
- Add monitoramento (Sentry, LogRocket)
- Configure analytics (Vercel Analytics, Google Analytics)
