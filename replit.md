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
- `/` - Dashboard (3-zone Command Center): animated risk meter, 6 stat cards, OSINT scanner, active alerts with status management, intelligence timeline, quick actions
- `/threats` - Threat intelligence with Attack Simulation Engine, stored scenarios, breach/infra/github tabs
- `/deception` - Deception & Counter-Intelligence Engine (6 modules)
- `/deepfake` - Deepfake Warfare Defense Unit (4-tab: Scanner, Exposure Profiles, Scan History, Mitigation)
- `/risk` - Risk scoring with radar chart, risk evolution line chart, alert frequency bar chart, report generation
- `/audit` - Audit log timeline with search/filter, hash signature display, expandable JSON, report generation

### Backend (server/)
- Express.js with Helmet security headers and rate limiting
- PostgreSQL via Drizzle ORM
- OpenAI integration via Replit AI Integrations (lazy-initialized)
- Trust proxy enabled for rate limiter

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

### Deepfake Warfare Defense Engine (server/deepfake/)
- `engine.ts` - Deepfake defense operations:
  - `calculateExposureScore()` - Weighted formula: video_minutes×0.4 + audio×0.2 + face_visibility×0.2 + image_availability×0.2, levels: 0-30 LOW, 31-60 MODERATE, 61-80 HIGH, 81+ CRITICAL
  - `processDeepfakeScan()` - Deterministic media analysis (URL patterns, extension, media type → synthetic probability, confidence, detection tags)
  - `generateMitigationGuidanceDeterministic()` - Level-based mitigation checklist
  - Risk integration: syntheticProbability >85 creates CRITICAL alert

### Alert & Reporting Engine
- `server/alerts/engine.ts` - Alert lifecycle (OPEN→ACKNOWLEDGED→UNDER_REVIEW→RESOLVED), auto-escalation, severity classification
- `server/reports/generator.ts` - AI-powered incident reports (4 types: EXPOSURE, ACTIVE_TARGETING, DEEPFAKE_INCIDENT, EXECUTIVE_SUMMARY) with deterministic fallback

### Deception & Counter-Intelligence Engine (server/deception/)
- `engine.ts` - Core deception operations module with 6 sub-modules:
  1. Honeytoken Deployment - Dynamic token generation (AWS keys, URLs, docs, DNS, SMTP)
  2. Webhook Listener - `/webhook/canary` endpoint for external trigger ingestion
  3. Active Targeting Detection - Auto-escalation on trigger, risk score boosting
  4. Honey Persona Generator - Synthetic decoy identities
  5. Correlation Engine - Cross-references triggered tokens, recommends actions
  6. Forensic Logging - Immutable audit trail

### Database Tables
- `domains` - Tracked domains
- `emails` - Tracked emails
- `breach_records` - HIBP breach data
- `infrastructure_exposure` - Shodan host/port/CVE data
- `github_exposure` - GitHub secret leaks
- `attack_scenarios` - Structured attack scenarios with full kill-chain data
- `deception_assets` - Honeytokens with token_id, type, placement, status, trigger data
- `honey_personas` - Synthetic decoy identities
- `deepfake_scans` - Deepfake detection results (mediaType, syntheticProbability, analysisSummary, riskLevel, detectionTags)
- `deepfake_exposure_profiles` - Subject exposure assessments (videoMinutes, audioScore, faceVisibility, imageAvailability, exposureScore, exposureLevel)
- `alerts` - System alerts with lifecycle status (OPEN/ACKNOWLEDGED/UNDER_REVIEW/RESOLVED), alertType, sourceModule, recommendedAction
- `risk_scores` - Computed risk classifications
- `audit_logs` - Immutable audit trail with SHA-256 hash chaining, actorType, actionType, targetEntity, rawEventData
- `incident_reports` - Generated reports (4 types) with executive summary, technical details, risk level

### API Routes
- `POST /api/scans/analyze` - OSINT analysis + attack simulation
- `POST /api/threats/simulate` - Run full attack simulation
- `POST /api/deepfake/scan` - Deepfake media scan pipeline
- `GET /api/deepfake/stats` - Deepfake statistics
- `POST /api/deepfake/exposure` - Create exposure profile
- `GET /api/deepfake/exposure` - List exposure profiles
- `POST /api/deepfake/mitigate` - Generate mitigation guidance
- `PATCH /api/alerts/:id/status` - Update alert status (lifecycle enforced)
- `GET /api/alerts/active` - Active (non-resolved) alerts
- `GET /api/audit/search` - Search audit logs by entity/action/actor
- `POST /api/reports/generate` - Generate incident report
- `GET /api/reports` - List reports
- `GET /api/system/health` - System health check
- `POST /api/deception/deploy` - Deploy new honeytoken
- `DELETE /api/deception/:id` - Decommission asset
- `POST /api/deception/simulate-trigger` - Simulate token trigger
- `POST /webhook/canary` - External webhook for Canarytoken triggers
- `GET /api/deception/correlation` - Correlation engine results
- `GET /api/deception/stats` - Deception grid statistics
- `POST /api/deception/personas` - Generate honey persona
- `PATCH /api/deception/personas/:id/retire` - Retire persona
- Standard CRUD for alerts, breaches, infra, github, risk, audit

### Security Hardening
- Helmet security headers (CSP, XSS, HSTS, etc.)
- Express rate limiting: API 100 req/min, webhook 20 req/min
- JSON payload size limit (10kb)
- Request timeout (30s)
- Trust proxy enabled
- All API keys server-side only

### API Keys (Environment Variables)
- `HIBP_API_KEY` - HaveIBeenPwned API key (optional, degrades gracefully)
- `SHODAN_API_KEY` - Shodan API key (optional, degrades gracefully)
- `GITHUB_TOKEN` - GitHub personal access token (optional, degrades gracefully)
- `AI_INTEGRATIONS_OPENAI_API_KEY` - Provided by Replit AI Integrations
- `AI_INTEGRATIONS_OPENAI_BASE_URL` - Provided by Replit AI Integrations

### Shared Types (shared/)
- `schema.ts` - Drizzle table definitions + Zod insert schemas + TypeScript types
- `routes.ts` - API contract with Zod schemas, paths, buildUrl helper
