<div align="center">

# HAF — Monitor de Vagas

**Portal inteligente de busca, filtragem e acompanhamento de vagas com varredura simultânea em 136 fontes confiáveis, estúdio de currículo ATS e alertas automáticos.**

[![Acesse online](https://img.shields.io/badge/Demo-haf--two.vercel.app-164081?style=for-the-badge&logo=vercel&logoColor=white)](https://haf-two.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-16.4.6-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.3-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-0F172A?style=for-the-badge&logo=tailwindcss&logoColor=38BDF8)](https://tailwindcss.com/)
[![Postgres](https://img.shields.io/badge/Neon_Postgres-Serverless-00E599?style=for-the-badge&logo=postgresql&logoColor=0F172A)](https://neon.tech/)
[![PWA](https://img.shields.io/badge/PWA-Instalável-164081?style=for-the-badge)](#)

</div>

---

## Visão Geral

O **HAF** centraliza a busca por oportunidades de tecnologia e mercado corporativo em uma interface moderna inspirada no layout dividido do Indeed (`master-detail`), combinada com monitoramento automatizado em múltiplos portais de recrutamento (Gupy, Greenhouse, Lever, Ashby, Workable, SmartRecruiters, Recruitee, Breezy HR, BambooHR, Pinpoint, Personio, GitHub Issues, feeds RSS e APIs globais).

Cada usuário conta com ambiente isolado por autenticação própria: currículo salvo no banco, palavras-chave sincronizadas automaticamente, filtros geográficos por estado e até 5 cidades do Brasil, lista de bloqueio, funil Kanban de candidaturas e alertas instantâneos via **Telegram** e **E-mail**.

---

## Principais Funcionalidades

### Busca e Filtros (Layout Estilo Indeed)
- **Visualização Master-Detail fixa (`sticky`):** lista de cards à esquerda com detalhes completos fixos à direita (ou drawer no mobile).
- **Busca dupla (`O quê` + `Onde`):** pesquisa por cargo, empresa ou palavra-chave combinada com cidade, estado ou modalidade, com buscas rápidas salvas no navegador.
- **Filtros avançados:** data de publicação (`24h` a `30d`), modelo de trabalho (`Remoto`, `Híbrido`, `Presencial`), senioridade, tipo de contrato (`CLT`, `PJ`, `Estágio`), fonte, compatibilidade com currículo (`Match`), status, filtro **Com salário**, modo **Apenas Brasil / Global** e seleção de estado + até 5 cidades.
- **Descrição e faixa salarial:** extração automática de descrição e salário quando informados nas fontes, com detecção de skills ausentes no currículo e adição em 1 clique às palavras-chave monitoradas.
- **Deduplicação e bloqueio:** remoção de vagas duplicadas entre fontes distintas e exclusão automática por **Lista de Bloqueio** (empresas ocultas ou palavras negativas).
- **Insights & Comparação:** painel **Insights do Mercado** com top tecnologias, empresas e modalidades, além de **comparação lado a lado** de até 3 vagas.
- **Produtividade:** navegação por teclado (`↑` / `↓` ou `J` / `K` para alternar vaga e `S` para salvar), carta de apresentação editável, mensagem pronta para recrutadores e exportação em **CSV** e **JSON**.

### 136 Fontes Verificadas ao Vivo e 21 Conectores
Varredura paralela com botão de **teste individual por fonte**, resumo de saúde (`Ativas`, `Pausadas`, `Com erro`), limpeza automática de fontes obsoletas, filtro por fontes com falha e ações em massa:

| Categoria | Exemplos / Plataformas | Cobertura |
| :--- | :--- | :--- |
| **Gupy (Brasil)** | Localiza, PagBank/PagSeguro, Sicredi, Ambev, Grupo Boticário, Stefanini, Renner, Porto Seguro, WEG, Vivo, Suzano, Globo, Creditas, Softplan | **15 empresas** |
| **Boards ATS Globais** | Databricks, Stripe, Anthropic, OpenAI, Ramp, Notion, Perplexity, Cursor, Supabase, Spotify, Palantir, Canva, Wise, Hugging Face, bunq (+ BambooHR, Pinpoint, Personio) | **89 empresas** |
| **Feeds RSS / Atom** | WeWorkRemotely (10 categorias), Himalayas RSS, Jobicy RSS, Remotive RSS, RealWorkFromAnywhere | **14 feeds** |
| **GitHub Vagas Brasil** | FrontendBR, BackendBR, React Brasil, QA Brasil, PHP BR, Android Dev BR, CocoaHeads, SouJava, .NET BR, DataScience BR, UX Brasil, Flutter BR | **12 repositórios** |
| **APIs Públicas Globais** | Remotive, Arbeitnow, RemoteOK, Jobicy, Himalayas, Working Nomads | **6 APIs** |
| **Scraper Genérico** | Páginas de carreiras via JSON-LD (`JobPosting`) ou seletor CSS customizado | **Sob demanda** |

### Estúdio de Currículo & Score ATS
- **Importação de PDF (`unpdf`):** preenche automaticamente nome, contatos, links, resumo, skills, experiência e formação a partir de um currículo existente.
- **Pontuação ATS (`0–100`):** análise em tempo real com checklist do que melhorar (métricas de resultado, tamanho ideal do resumo, skills e links).
- **3 Modelos de PDF (`jsPDF`) + `.TXT` ATS:**
  - `Executivo` (cabeçalho escuro com foto opcional)
  - `Moderno Azul` (paleta azul HAF/Indeed com foto opcional)
  - `ATS Puro` (layout branco em alto contraste otimizado para leitores automáticos)
  - Exportação em `.TXT` limpo e **Backup / Restauração JSON**.
- **Assistentes de escrita:** gerador automático de resumo em 1 clique, banco de skills categorizado em 6 áreas e chips de bullets com foco em impacto mensurável.

### Candidaturas, Kanban & Notificações
- **Alternância Lista / Kanban + Vaga Manual:** visualize o funil em 5 colunas (`Salvas`, `Enviadas`, `Teste Técnico`, `Entrevista`, `Proposta`) com movimentação rápida entre etapas (`←` / `→`) e cadastro de oportunidades externas via **+ Vaga Manual**.
- **Lembretes de retorno (`Follow-up`):** agende datas manualmente ou com atalho `+5 dias` e receba avisos no sininho quando o prazo vencer.
- **Central de Notificações (Sininho):** popover com vagas novas das últimas 24h, lembretes de follow-up, status dos canais (E-mail/Telegram) e botão de teste imediato.

### Conta, Temas e PWA
- **Painel Lateral "Minha Conta":** métricas do perfil, resumo do monitoramento e edição inline de nome, e-mail de acesso e troca de senha com renovação segura de sessão.
- **Modo Claro e Escuro:** alternância instantânea com persistência em `localStorage`.
- **PWA Instalável:** manifesto e ícone vetorial em `public/manifest.json` e `public/icon.svg` para instalação no desktop e mobile.

---

## Stack Tecnológica

- **Framework:** [Next.js 16.4](https://nextjs.org/) (App Router + Turbopack + Cron Route)
- **Interface:** [React 19](https://react.dev/), [Tailwind CSS v4](https://tailwindcss.com/) e [Lucide Icons](https://lucide.dev/)
- **Linguagem:** TypeScript 5
- **Banco de Dados:** PostgreSQL Serverless via `@neondatabase/serverless` (schema auto-inicializável em `src/lib/db.ts`)
- **Scraping & Documentos:** `cheerio`, `unpdf` e `jspdf`
- **Notificações:** `resend` (E-mail) e Telegram Bot API
- **Autenticação:** Sessão assinada em HMAC-SHA256 (`httpOnly` cookie) e hash de senha com `crypto.scryptSync`

---

## Estrutura do Projeto

```text
public/
├── icon.svg                  # Ícone vetorial do PWA
└── manifest.json             # Configuração PWA (standalone)
src/
├── app/
│   ├── api/
│   │   ├── auth/             # Login, cadastro, recuperação de senha e edição da conta
│   │   ├── cron/scrape/      # Endpoint agendado para varredura diária de todos os usuários
│   │   ├── dashboard/        # Agregador inicial do painel do usuário
│   │   ├── jobs/             # Cadastro manual, favoritos, estágio no funil, notas, follow-up e limpeza
│   │   ├── keywords/         # CRUD de palavras-chave monitoradas
│   │   ├── resume/           # Salvamento do currículo e parser de PDF
│   │   ├── scrape/           # Execução manual sob demanda
│   │   ├── settings/         # Alertas, filtros regionais e lista de bloqueio
│   │   ├── sources/          # CRUD, sincronização padrão e teste individual de fontes
│   │   └── test-notifications/
│   ├── globals.css           # Tokens visuais Light/Dark e estilos do tema
│   ├── layout.tsx            # Metadata PWA, fontes Geist e script de tema
│   └── page.tsx              # Portal principal (Busca, Candidaturas, Currículo, Fontes)
├── components/
│   ├── AuthGate.tsx          # Fluxo de login, criação de conta e redefinição de senha
│   ├── ResumeBuilder.tsx     # Estúdio completo de currículo e pontuação ATS
│   └── ThemeToggle.tsx       # Seletor Claro/Escuro
└── lib/
    ├── auth.ts               # Helpers de senha e cookies de sessão
    ├── brazilLocations.ts    # Estados, cidades e detecção de vagas no Brasil
    ├── db.ts                 # Conexão Neon, criação/migração automática de tabelas
    ├── defaultSources.ts     # Catálogo com 136 fontes confiáveis pré-configuradas
    ├── generateResumePdf.ts  # Gerador PDF (Executivo, Moderno Azul, ATS) e TXT
    ├── notifications.ts      # Envios de alerta por Telegram e Resend E-mail
    ├── resumeParser.ts       # Extração de campos a partir de texto de PDF
    └── scrapers/
        ├── connectors.ts     # 21 conectores ATS, APIs públicas, RSS, GitHub e HTML
        ├── runner.ts         # Orquestração paralela, deduplicação, bloqueio e gravação
        └── types.ts          # Contratos TypeScript
```

---

## Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto para executar localmente (ou configure diretamente na Vercel):

| Variável | Obrigatória | Descrição |
| :--- | :---: | :--- |
| `DATABASE_URL` *(ou `POSTGRES_URL`)* | Sim | Connection string do Neon / PostgreSQL Serverless |
| `AUTH_SECRET` | Recomendada | Segredo usado na assinatura HMAC dos cookies de sessão |
| `CRON_SECRET` | Opcional | Token Bearer para proteger `GET /api/cron/scrape` em produção |
| `TELEGRAM_BOT_TOKEN` | Opcional | Token do bot criado no `@BotFather` para envio de alertas no Telegram |
| `TELEGRAM_CHAT_ID` | Opcional | Chat ID padrão de fallback para alertas via Telegram |
| `RESEND_API_KEY` | Opcional | Chave de API do [Resend](https://resend.com/) para alertas por e-mail |
| `ALERT_EMAIL_FROM` | Opcional | Remetente verificado no Resend (padrão: `HAF Monitor <onboarding@resend.dev>`) |
| `ALERT_EMAIL_TO` | Opcional | E-mail padrão de fallback caso não definido pelo usuário no painel |

---

## Como Executar Localmente

```bash
# 1. Clone o repositório
git clone https://github.com/HigorAmaral/HAF.git
cd HAF

# 2. Instale as dependências
npm install

# 3. Configure o arquivo .env.local com DATABASE_URL e AUTH_SECRET

# 4. Inicie o servidor de desenvolvimento
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000) — as tabelas no PostgreSQL são criadas e atualizadas automaticamente na primeira requisição.

### Scripts Disponíveis

```bash
npm run dev    # Ambiente de desenvolvimento
npm run lint   # Verificação ESLint
npm run build  # Build de produção Next.js
npm run start  # Executa o build gerado em produção
```

---

## Deploy na Vercel & Cron Automático

O repositório já inclui [`vercel.json`](vercel.json) configurado com Vercel Cron Jobs para executar automaticamente `/api/cron/scrape` todos os dias às **09:00 UTC**:

```json
{
  "crons": [
    {
      "path": "/api/cron/scrape",
      "schedule": "0 9 * * *"
    }
  ]
}
```

---

## Autor

Desenvolvido por [**Higor Amaral**](https://github.com/HigorAmaral).
