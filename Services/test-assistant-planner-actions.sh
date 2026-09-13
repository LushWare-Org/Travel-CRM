#!/usr/bin/env bash
# One assistant turn, driven through the gateway with a planner page manifest —
# the same request the widget sends from /planner or /package/:id/customize. The
# route allowlist mirrors getEnabledAssistantRoutes() (Client/src/config/
# assistantRoutes.ts) with the destination vocabulary read off the live
# catalogue, so a turn here decides over the same choices a real visitor's does.
#
# Prints the tool the assistant chose, the action the page is asked to run, and
# the reply. Read it as: does a page-shaped request produce a page action, and
# does a travel question produce a searched answer with sources?
#
# Usage:
#   Services/test-assistant-planner-actions.sh "add whale watching to day 2"
#   Services/test-assistant-planner-actions.sh "two travellers please" customize
#   Services/test-assistant-planner-actions.sh "hello" no-actions
#
# Requires the stack up (gateway on :3000, assistant-service, package-service).
set -euo pipefail

PROMPT="${1:-add whale watching to day 2}"
SURFACE="${2:-planner}"
GATEWAY="${GATEWAY_URL:-http://localhost:3000/api/v1}"

case "$SURFACE" in
  no-actions)
    # Still a page the assistant can see — a planner page that registered
    # nothing, which is what "no page actions here" looks like on the wire.
    SURFACE_NAME="planner"
    ACTIONS='[]'
    ;;
  customize)
    SURFACE_NAME="customize"
    ACTIONS='["set_destination","set_travellers","set_preferences","set_contact_details","go_to_step","generate_itinerary","regenerate_days","edit_day"]'
    ;;
  *)
    SURFACE_NAME="planner"
    ACTIONS='["set_destination","set_travellers","set_preferences","set_contact_details","go_to_step","generate_itinerary","regenerate_days","edit_day"]'
    ;;
esac

PAYLOAD=$(cat <<JSON
{
  "sessionId": "smoke-$(date +%s)",
  "messages": [
    { "id": "smoke-1", "role": "user", "content": "$PROMPT", "at": "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)" }
  ],
  "availableRoutes": [
    { "name": "home", "path": "/", "params": [] },
    {
      "name": "packages",
      "path": "/packages",
      "params": ["destination", "category", "priceMin", "priceMax", "durationMin", "durationMax", "rating", "sort"],
      "paramValues": {
        "destination": [
          { "value": "bhutan", "label": "Bhutan" },
          { "value": "kenya", "label": "Kenya" },
          { "value": "morocco", "label": "Morocco" },
          { "value": "egypt", "label": "Egypt" },
          { "value": "turkey", "label": "Turkey" },
          { "value": "nepal", "label": "Nepal" },
          { "value": "vietnam", "label": "Vietnam" },
          { "value": "singapore", "label": "Singapore" },
          { "value": "japan", "label": "Japan" },
          { "value": "uae", "label": "Dubai" },
          { "value": "indonesia", "label": "Bali" },
          { "value": "thailand", "label": "Thailand" },
          { "value": "maldives", "label": "Maldives" },
          { "value": "sri-lanka", "label": "Sri Lanka" },
          { "value": "italy", "label": "Europe (UK" }
        ]
      }
    },
    { "name": "destinations", "path": "/destinations-international", "params": [] },
    { "name": "about", "path": "/about", "params": [] },
    { "name": "contact", "path": "/contact", "params": [] },
    { "name": "career", "path": "/career", "params": [] },
    { "name": "planner", "path": "/planner", "params": [] },
    { "name": "customize", "path": "/package/:id/customize", "params": [] }
  ],
  "capabilities": { "version": 1, "surface": "$SURFACE_NAME", "actions": $ACTIONS },
  "pageContext": {
    "surface": "$SURFACE_NAME",
    "revision": "$SURFACE_NAME:sample",
    "step": 3,
    "destination": "Kandy",
    "duration": 3,
    "travelers": 2,
    "days": [{ "dayNumber": 1, "title": "Arrival" }, { "dayNumber": 2, "title": "Temple day" }]
  }
}
JSON
)

HTTP_STATUS=$(curl -s -o /tmp/assistant-smoke.json -w '%{http_code}' \
  -X POST "$GATEWAY/assistant/turn" \
  -H 'Content-Type: application/json' \
  -H "x-request-id: smoke-$(date +%s)" \
  -d "$PAYLOAD")

echo "prompt:   $PROMPT"
echo "surface:  $SURFACE_NAME (actions: $ACTIONS)"
echo "status:   $HTTP_STATUS"
if [ "$HTTP_STATUS" != "200" ]; then
  cat /tmp/assistant-smoke.json
  exit 1
fi

jq -r '"tool:     " + .data.toolCall.tool' /tmp/assistant-smoke.json
jq -r 'if .data.serverResult.route then "route:    " + .data.serverResult.route else empty end' /tmp/assistant-smoke.json
jq -r 'if .data.serverResult.path then "path:     " + .data.serverResult.path else empty end' /tmp/assistant-smoke.json
jq -r 'if .data.serverResult.total != null then "total:    " + (.data.serverResult.total | tostring) else empty end' /tmp/assistant-smoke.json
jq -r 'if .data.serverResult.action then "action:   " + (.data.serverResult.action | tostring) else empty end' /tmp/assistant-smoke.json
jq -r 'if .data.serverResult.revision then "revision: " + (.data.serverResult.revision | tostring) else empty end' /tmp/assistant-smoke.json
jq -r 'if .data.serverResult.citations then "sources:  " + (.data.serverResult.citations | map(.title) | join(", ")) else empty end' /tmp/assistant-smoke.json
jq -r '"reply:    " + .data.message' /tmp/assistant-smoke.json
