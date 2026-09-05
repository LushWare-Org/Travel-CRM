FROM node:20-slim

# PRISMA-ONLY (8 services listed above)
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
# END PRISMA-ONLY

WORKDIR /app

# Shared packages, in dependency order — assistant-service only depends on
# policy-retrieval (no constants/pricing-engine/contracts/lead-pricing-engine).
COPY shared/policy-retrieval ./shared/policy-retrieval
RUN npm ci --prefix ./shared/policy-retrieval

COPY assistant-service ./assistant-service
WORKDIR /app/assistant-service
RUN npm ci

# PRISMA-ONLY
RUN npx prisma generate
# END PRISMA-ONLY

RUN npm prune --omit=dev

ENV NODE_ENV=production

CMD ["node", "src/index.js"]
