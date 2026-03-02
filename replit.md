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
- `/deception` - Deception & Counter-Intelligence Engine (6 modules)
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
- `severity.ts` - Deterministic severity scoring framework + attack risk classifier
- `utils.ts` - Domain normalization, fetch with timeout/retry
- `attack-simulator.ts` - Deterministic attack path modeling engine (5 scenario generators)
- `playbook-generator.ts` - AI-powered tactical playbook generation via OpenAI (lazy-init)

### Attack Simulation Engine
- Consumes normalized OSINT AnalysisResult data
- 5 deterministic scenario generators
- Risk formula: risk_score = (likelihood × impact) / 100
- Attack risk classifier: <15 LOW, 15-34 MODERATE, 35-59 HIGH, 60+ CRITICAL
- AI playbook with fallback when unavailable

### Deception & Counter-Intelligence Engine (server/deception/)
- `engine.ts` - Core deception operations module with 6 sub-modules:
  1. **Honeytoken Deployment** - Dynamic token generation (AWS keys, URLs, docs, DNS, SMTP), unique token IDs, placement tracking
  2. **Webhook Listener** - `/webhook/canary` endpoint for external trigger ingestion, IP/UA/geo capture
  3. **Active Targeting Detection** - Auto-escalation on trigger, risk score boosting (+15), alert generation
  4. **Honey Persona Generator** - Synthetic decoy identities with random names/roles/emails/departments
  5. **Correlation Engine** - Cross-references triggered tokens, computes escalation level, recommends actions
  6. **Forensic Logging** - Immutable audit trail for all deception events

### Database Tables
- `domains` - Tracked domains
- `emails` - Tracked emails
- `breach_records` - HIBP breach data
- `infrastructure_exposure` - Shodan host/port/CVE data
- `github_exposure` - GitHub secret leaks
- `attack_scenarios` - Structured attack scenarios with full kill-chain data
- `deception_assets` - Honeytokens with token_id, type, placement, status, trigger data (IP/geo/UA), trigger count
- `honey_personas` - Synthetic decoy identities with name, role, email, department, deployment context
- `deepfake_scans` - Deepfake detection results
- `alerts` - System alerts (uppercase severity: CRITICAL/HIGH/MODERATE/LOW)
- `risk_scores` - Computed risk classifications
- `audit_logs` - Immutable action audit trail

### API Routes
- `POST /api/threats/simulate` - Run full attack simulation
- `POST /api/scans/analyze` - OSINT analysis + attack simulation
- `POST /api/deception/deploy` - Deploy new honeytoken
- `DELETE /api/deception/:id` - Decommission asset
- `POST /api/deception/simulate-trigger` - Simulate token trigger (testing)
- `POST /webhook/canary` - External webhook for real Canarytoken triggers
- `GET /api/deception/correlation` - Correlation engine results
- `GET /api/deception/stats` - Deception grid statistics
- `POST /api/deception/personas` - Generate honey persona
- `PATCH /api/deception/personas/:id/retire` - Retire persona
- Standard CRUD for alerts, breaches, infra, github, deepfake, risk, audit

### API Keys (Environment Variables)
- `HIBP_API_KEY` - HaveIBeenPwned API key (optional, degrades gracefully)
- `SHODAN_API_KEY` - Shodan API key (optional, degrades gracefully)
- `GITHUB_TOKEN` - GitHub personal access token (optional, degrades gracefully)
- `AI_INTEGRATIONS_OPENAI_API_KEY` - Provided by Replit AI Integrations
- `AI_INTEGRATIONS_OPENAI_BASE_URL` - Provided by Replit AI Integrations

### Shared Types (shared/)
- `schema.ts` - Drizzle table definitions + Zod insert schemas + TypeScript types
- `routes.ts` - API contract with Zod schemas, paths, buildUrl helper
