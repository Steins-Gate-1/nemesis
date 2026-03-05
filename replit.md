# NEMESIS — National Enterprise Monitoring & Early Security Intelligence System

## Overview
Military-grade cyber defense command platform for intelligence agencies and special forces.
Dark, cinematic UI with matte black/navy gradients, neon red/cyan highlights, terminal-style animations.

## Architecture

### Frontend (client/)
- React + TypeScript + Vite
- Tailwind CSS with custom dark military theme
- Shadcn UI components + custom TacticalCard
- Recharts for data visualization (RadarChart, LineChart, BarChart)
- Framer Motion for animations
- wouter for routing
- TanStack Query for data fetching

### Pages (12 total)
- `/` - Dashboard (3-zone Command Center): animated risk meter, 6 stat cards, OSINT scanner, active alerts with status management, intelligence timeline
- `/threats` - Threat intelligence with Attack Simulation Engine, stored scenarios, breach/infra/github tabs
- `/external-intel` - External Intelligence Analyzer with correlation engine, attack probability gauge
- `/threat-map` - Global Threat Intelligence Map: SVG world map with geo-located threat indicators, pulsing dots, attack arcs, auto-refresh
- `/attack-matrix` - MITRE ATT&CK Enterprise Matrix: 14-tactic interactive heatmap, technique coverage, radar chart, detail panel
- `/topology` - Attack Surface Topology Graph: custom force-directed SVG graph, draggable nodes, domain→IP→port→CVE→breach connections
- `/url-scanner` - URL Threat Intelligence Scanner: ML-powered phishing detection + 651K malicious URL database lookup, risk gauge, feature extraction, batch scanning
- `/deception` - Deception & Counter-Intelligence Engine (6 modules)
- `/deepfake` - Deepfake Warfare Defense Unit (4-tab: Scanner, Exposure Profiles, Scan History, Mitigation)
- `/risk` - Risk scoring with radar chart, risk evolution line chart, alert frequency bar chart, report generation
- `/audit` - Audit log timeline with search/filter, hash signature display, expandable JSON, report generation
- `/terminal` - Operator Command Terminal: military CLI with ASCII art banner, 10 commands (incl. urlscan), typing animation, command history

### Backend (server/)
- Express.js with Helmet security headers and rate limiting
- PostgreSQL via Drizzle ORM
- OpenAI integration via Replit AI Integrations (lazy-initialized)
- Trust proxy enabled for rate limiter

### OSINT Intelligence Engine (server/osint/)
- `pipeline.ts` - Main `analyzeDomain()` function, orchestrates parallel API calls + attack simulation
- `hibp.ts` - HaveIBeenPwned API integration (breach detection, free domain-level + paid email-level)
- `pwned-passwords.ts` - Pwned Passwords API (k-Anonymity model, free, no key needed)
- `shodan.ts` - Shodan API integration (infrastructure exposure)
- `github.ts` - GitHub REST API (secret/leak scanning)
- `whois.ts` - RDAP/WHOIS domain metadata lookup
- `cve.ts` - NIST NVD API integration (real CVE lookup with CVSS scores, descriptions, references)
- `threat-geo.ts` - Geo-located threat data aggregation for the threat map
- `severity.ts` - Deterministic severity scoring framework + attack risk classifier
- `utils.ts` - Domain normalization, fetch with timeout/retry
- `attack-simulator.ts` - Deterministic attack path modeling engine (5 scenario generators)
- `playbook-generator.ts` - AI-powered tactical playbook generation via OpenAI (lazy-init)

### MITRE ATT&CK Mapper (server/mitre/)
- `attack.ts` - Maps OSINT findings to MITRE ATT&CK Enterprise framework
- 14 tactics, ~45 techniques with evidence-based mapping
- Breach → Initial Access, Credential Access; Infra → Discovery, Lateral Movement; GitHub → Collection; Deepfake → Defense Evasion; Deception → Reconnaissance
- Returns coverage percentage, active tactics/techniques, highest risk tactic

### AI Threat Briefing Generator (server/briefing/)
- `generator.ts` - CISO-grade daily intelligence briefings via OpenAI (lazy-init)
- 7 sections: Executive Summary, Threat Landscape, IOCs, Risk Matrix, MITRE Coverage, Recommended Actions, 72-Hour Outlook
- Deterministic fallback when OpenAI unavailable
- Classification: CLASSIFIED // NEMESIS SIGINT

### URL Threat Intelligence Scanner (server/threat-intel/)
- `url-scanner.ts` - Dual-dataset URL threat analysis engine:
  - **Malicious URL Database**: Loads 651K URLs from Kaggle dataset (attached_assets/malicious_phish_1772725520710.csv), builds domain-level and exact-URL lookup maps. 223K threats: 94K phishing, 32K malware, 96K defacement
  - **ML Phishing Feature Model**: 26-feature URL analysis model derived from 10K labeled phishing/legitimate dataset (attached_assets/Phishing_Legitimate_full_1772725518950.csv). Features: NumDots, SubdomainLevel, PathLevel, UrlLength, RandomString, IpAddress, SensitiveWords, EmbeddedBrandName, etc.
  - `scanUrl(url)` → { riskScore, riskLevel, threatType, confidence, datasetMatch, phishingAnalysis, features, indicators }
  - `batchScanUrls(urls)` → scan up to 50 URLs in parallel
  - `getUrlScannerStats()` → dataset statistics (total threats, breakdown by type)
  - `getTopThreatenedDomains()` → most-targeted domains from dataset
  - `searchMaliciousUrls(query)` → search within malicious URL database
  - Legitimate domain safelist prevents false positives on Google, Facebook, etc.
  - Risk levels: SAFE <15, LOW 15-29, MODERATE 30-49, HIGH 50-74, CRITICAL 75+
  - Creates alerts for HIGH/CRITICAL URL scan results
  - Terminal command: `urlscan <url>` in operator terminal

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

### External Intelligence & Correlation Engine
- `server/correlation/engine.ts` - SOC-grade signal correlation module:
  - Base weights: Dark Web (LOW=5, MODERATE=15, HIGH=30, CRITICAL=50), Credentials (SAFE=0, MODERATE=10, HIGH=25, CRITICAL=40)
  - 3 conditional escalation rules: ESC-001 Credential Stuffing (+25), ESC-002 Breach Amplification (+20), ESC-003 Reconnaissance Pattern (+15)
  - Attack probability: min(combined_score * 1.2, 100)
  - SOC-grade explainability report generation
- `POST /api/analyze` - Hybrid: tries ngrok Flask backend first, falls back to real HIBP + Pwned Passwords APIs
- `POST /api/correlate` - Standalone correlation endpoint
- Frontend: `/external-intel` page with attack probability gauge, signal decomposition, escalation triggers, explainability report

### Database Tables
- `domains` - Tracked domains
- `emails` - Tracked emails
- `breach_records` - HIBP breach data
- `infrastructure_exposure` - Shodan host/port/CVE data
- `github_exposure` - GitHub secret leaks
- `attack_scenarios` - Structured attack scenarios with full kill-chain data
- `deception_assets` - Honeytokens with token_id, type, placement, status, trigger data
- `honey_personas` - Synthetic decoy identities
- `deepfake_scans` - Deepfake detection results
- `deepfake_exposure_profiles` - Subject exposure assessments
- `alerts` - System alerts with lifecycle status
- `risk_scores` - Computed risk classifications
- `audit_logs` - Immutable audit trail with SHA-256 hash chaining
- `incident_reports` - Generated reports

### API Routes
- `POST /api/analyze` - External intelligence + correlation engine analysis
- `POST /api/correlate` - Standalone correlation engine
- `POST /api/scans/analyze` - OSINT analysis + attack simulation
- `POST /api/threats/simulate` - Run full attack simulation
- `GET /api/cve/:id` - Real CVE lookup from NIST NVD API
- `GET /api/mitre/matrix` - MITRE ATT&CK coverage mapping
- `POST /api/briefing/generate` - AI threat intelligence briefing
- `GET /api/threat-map/data` - Geo-located threat data for map
- `POST /api/url/scan` - URL threat intelligence scan (single URL)
- `POST /api/url/batch-scan` - Batch URL scan (up to 50 URLs)
- `GET /api/url/stats` - URL scanner dataset statistics
- `GET /api/url/top-threats` - Top threatened domains from dataset
- `GET /api/url/search?q=` - Search malicious URL database
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
- Helmet security headers (CSP disabled for dev, XSS, HSTS, etc.)
- Express rate limiting: API 100 req/min, webhook 20 req/min
- JSON payload size limit (5mb)
- URL-encoded payload size limit (2mb)
- Request timeout (30s)
- Trust proxy enabled
- All API keys server-side only

### Real API Integrations
- **NIST NVD** - Free CVE lookup (no key needed), cached 1hr
- **HaveIBeenPwned** - Free breach-by-domain API + paid email-level (HIBP_API_KEY optional)
- **Pwned Passwords** - Free k-Anonymity password check (no key needed)
- **Shodan** - Infrastructure exposure (SHODAN_API_KEY)
- **GitHub** - Code leak scanning (GITHUB_TOKEN)
- **OpenAI** - AI briefings, playbooks, reports (via Replit AI Integrations)

### Shared Types (shared/)
- `schema.ts` - Drizzle table definitions + Zod insert schemas + TypeScript types
- `routes.ts` - API contract with Zod schemas, paths, buildUrl helper
