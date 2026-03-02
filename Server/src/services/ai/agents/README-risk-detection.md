# Risk Detection Agent (V1)

Daily batch service that scores active customers for churn risk, updates retention state, writes immutable daily snapshots, and emits deduped outbox events.

## Manual Run

- Full batch + outbox publish:
  - `npm run risk:run`
- Run for a specific score date:
  - `npm run risk:run -- 2026-03-02`
- Create/sync collections and indexes:
  - `npm run migrate:risk`
- Admin API manual trigger:
  - `POST /api/v1/ai/risk-detection/run` with optional `{ "date": "YYYY-MM-DD" }`
  - `POST /api/v1/ai/risk-outbox/publish` with optional `{ "limit": 50 }`

## Scheduler

- Daily batch cron:
  - `AI_RISK_DETECTION_CRON` (default: `15 2 * * *`)
  - `AI_RISK_DETECTION_CRON_TZ` (default: `UTC`)
- Outbox poller:
  - `RISK_OUTBOX_POLL_MS` (default: `60000`)
  - `RISK_OUTBOX_BATCH_SIZE` (default: `50`)

## Model/Predictor Env

- `RISK_MODEL_PYTHON_BIN` (default: `python`)
- Model path used by default:
  - `Server/src/services/ai/models/advanced_xgb_churn_model.pkl`

The Node agent invokes `scripts/risk_predict.py`, which loads the `.pkl` and returns `predict_proba` for the input feature payload.

## Data Tables (Mongo Collections)

- `customerretentionstates`
  - Current workflow state per customer (unique `customer`)
- `customerrisksnapshots`
  - Daily scored snapshot (unique `(customer, scoreDate)`)
- `eventoutboxes`
  - Reliable event outbox (unique `dedupeKey`)

## Emitted Events

- `customer.at_risk`
- `customer.recovered`

Both are deduped by `dedupeKey = <eventType>:<customerId>:<scoreDate>`.
