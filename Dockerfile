# ---------- BASE ----------
FROM node:18-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# ---------- DEPENDENCIES (CACHE FORTE) ----------
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm install

# ---------- BUILD ----------
FROM base AS builder
WORKDIR /app

# reaproveita node_modules
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_SUPABASE_PROJECT_ID

ENV NODE_ENV=production
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID

RUN npm run build

# ---------- PRODUCTION ----------
FROM nginx:alpine

RUN apk add --no-cache curl

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD curl -f http://localhost || exit 1

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
