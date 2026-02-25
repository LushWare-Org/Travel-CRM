# AI Agent Architecture (Travel CRM)

## Implemented Components
- Event bus with persistent queue: `src/services/ai/aiEventBus.service.js`
- Master orchestrator: `src/services/ai/aiOrchestrator.service.js`
- Scheduler for due follow-ups: `src/services/ai/aiScheduler.service.js`
- Agent control/override service: `src/services/ai/aiAgentControl.service.js`
- Context memory service: `src/services/ai/aiMemory.service.js`
- Trigger publisher: `src/services/ai/aiTrigger.service.js`

## Agents
- `customer-messaging-agent`
  - Lifecycle-aware messaging across email/WhatsApp/SMS/in-app
  - Conversation memory persistence
  - Retry-safe event processing through queue
- `package-recommendation-agent`
  - Multi-objective ranking and explainable scoring
  - Learned preference boost from memory
- `follow-up-agent`
  - Lead scoring + drop-off prediction
  - Self-adjusting timing via feedback loop (`/ai/followup-feedback`)
  - Auto-publishes follow-up message events
- `document-generation-agent`
  - Auto draft generation for quotation/invoice/receipt/voucher
  - PDF generation + optional auto-send workflows

## Persistence Models
- `AIEvent`: queued/processing/processed/failed events with retry metadata
- `AIAgentLog`: full audit trail of each agent run
- `AIMemory`: per-lead/per-user context memory
- `AIAgentControl`: pause/resume and human-approval controls

## Event-Driven Triggers Wired
- Lead create/update/status change
- Website booking lead creation
- Quotation sent
- Invoice sent
- Payment receipt created
- Scheduler follow-up due trigger

## API Endpoints
- `POST /api/v1/ai/recommend-packages`
- `POST /api/v1/ai/compare-packages`
- `POST /api/v1/ai/generate-documents`
- `POST /api/v1/ai/followup-feedback`
- `GET /api/v1/ai/agents/status`
- `POST /api/v1/ai/agents/override`
- `GET /api/v1/ai/logs`
- `GET /api/v1/ai/events`
- `POST /api/v1/ai/events/publish`

## Human Override Controls
- Pause/resume by agent name
- Require human approval mode per agent
- Replay event from queue for controlled retries

## Reliability and Fail-safe Strategy
- Persistent queued events with attempts and retry scheduling
- Agent-level status logs and errors
- Fallback message generation if LLM unavailable
- Channel-level skip behavior if provider credentials are missing

