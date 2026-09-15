FROM node:20-slim

# PRISMA-ONLY (voice-service runs Prisma against Supabase Postgres)
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
# END PRISMA-ONLY

WORKDIR /app

# voice-service has no @travel-crm/* dependencies — nothing shared to copy.
COPY voice-service ./voice-service
WORKDIR /app/voice-service
RUN npm ci

# PRISMA-ONLY
RUN npx prisma generate
# END PRISMA-ONLY

RUN npm prune --omit=dev

ENV NODE_ENV=production

CMD ["node", "src/index.js"]
