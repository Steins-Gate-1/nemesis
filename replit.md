# NEMESIS — National Enterprise Monitoring & Early Security Intelligence System

## Overview
Military-grade cyber defense command platform for intelligence agencies and special forces.
Dark, cinematic UI with matte black/navy gradients, neon red/cyan highlights, terminal-style animations.

## Architecture

### Frontend (client/)
- React + TypeScript + Vite
- Tailwind CSS with custom dark military theme
- Shadcn UI components + custom TacticalCard
- Recharts for data visualization
- Framer Motion for animations
- wouter for routing
- TanStack Query for data fetching

### Pages
- `/` - Dashboard (Command Center) with OSINT scanner, stats, alerts, traffic chart
- `/threats` - Threat intelligence with Attack Simulation Engine, stored scenarios, breach/infra/github tabs
- `/deception` - Deception asset management (canarytokens)
- `/deepfake` - Deepfake detection interface
- `/risk` - Risk scoring and classification
- `/audit` - Audit log timeline

### Backend (server/)
- Express.js
- PostgreSQL via Drizzle ORM
- OpenAI integration via Replit AI Integrations (lazy-initialized for playbooks/reports)

### OSINT Intelligence Engine (server/osint/)
- `pipeline.ts` - Main `analyzeDomain()` function, orchestrates parallel API calls + attack simulation
- `hibp.ts` - HaveIBeenPwned API integration (breach detection)
- `shodan.ts` - Shodan API integration (infrastructure exposure)
- `github.ts` - GitHub REST API (secret/leak scanning)
- `whois.ts` - RDAP/WHOIS domain metadata lookup
- `severity.ts` - Deterministic severity scoring framework (LOW=1, MEDIUM=3, HIGH=6, CRITICAL=10)
- `utils.ts` - Domain normalization, fetch with timeout/retry
- `attack-simulator.ts` - Deterministic attack path modeling engine (5 scenario generators)
- `playbook-generator.ts` - AI-powered tactical playbook generation via OpenAI (lazy-init)

### Attack Simulation Engine
- Consumes normalized OSINT AnalysisResult data
- 5 deterministic scenario generators:
  1. Credential Reuse Attack (breach + exposed services)
  2. Remote Service Exploitation (open ports + CVEs)
  3. Key-Based Infrastructure Compromise (GitHub leaks)
  4. Phishing & Brand Impersonation (domain age + risk flags)
  5. Full Kill Chain Multi-Vector Attack (combined surfaces)
- Each scenario includes: entry point, attack category, step-by-step chain, required conditions, risk explanation
- Risk formula: risk_score = (likelihood × impact) / 100
- Classification: <5 LOW, 5-14 MODERATE, 15-29 HIGH, 30+ CRITICAL
- AI playbook: executive summary, tactical brief, mitigation checklist, confidence assessment
- Fallback playbook when AI unavailable

### Database Tables
- `domains` - Tracked domains
- `emails` - Tracked emails
- `breach_records` - HIBP breach data
- `infrastructure_exposure` - Shodan host/port/CVE data
- `github_exposure` - GitHub secret leaks
- `attack_scenarios` - Structured attack scenarios (with entry_point, attack_category, attack_steps, required_conditions, likelihood/impact/risk scores, scenario_json)
- `deception_assets` - Canarytoken management
- `deepfake_scans` - Deepfake detection results
- `alerts` - System alerts
- `risk_scores` - Computed risk classifications
- `audit_logs` - Immutable action audit trail

### API Routes
- `POST /api/threats/simulate` - Run full attack simulation for a domain (OSINT + simulation + AI playbook)
- `GET /api/threats/scenarios` - Retrieve all stored attack scenarios
- `POST /api/scans/analyze` - Run OSINT analysis (now includes attack simulation)
- Other CRUD routes for alerts, breaches, infra, github, deception, deepfake, risk, audit

### API Keys (Environment Variables)
- `HIBP_API_KEY` - HaveIBeenPwned API key (optional, degrades gracefully)
- `SHODAN_API_KEY` - Shodan API key (optional, degrades gracefully)
- `GITHUB_TOKEN` - GitHub personal access token (optional, degrades gracefully)
- `AI_INTEGRATIONS_OPENAI_API_KEY` - Provided by Replit AI Integrations
- `AI_INTEGRATIONS_OPENAI_BASE_URL` - Provided by Replit AI Integrations

### Shared Types (shared/)
- `schema.ts` - Drizzle table definitions + Zod insert schemas + TypeScript types
- `routes.ts` - API contract with Zod schemas, paths, buildUrl helper
