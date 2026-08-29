FROM node:20-slim

WORKDIR /app

# Shared packages, in dependency order — see plan step 4 for why all four
# are always copied regardless of which this service actually imports.
COPY shared/constants ./shared/constants
COPY shared/pricing-engine ./shared/pricing-engine
COPY shared/contracts ./shared/contracts
COPY shared/lead-pricing-engine ./shared/lead-pricing-engine
RUN npm ci --prefix ./shared/constants \
    && npm ci --prefix ./shared/pricing-engine \
    && npm ci --prefix ./shared/contracts \
    && npm ci --prefix ./shared/lead-pricing-engine

COPY analytics-service ./analytics-service
WORKDIR /app/analytics-service
RUN npm ci

RUN npm prune --omit=dev

ENV NODE_ENV=production

CMD ["node", "src/index.js"]
