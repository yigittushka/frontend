# Multi-stage build для Next.js приложения
FROM node:20-alpine AS deps

WORKDIR /app

# Копируем package files
COPY package.json package-lock.json* ./

# Устанавливаем зависимости
RUN npm ci

# Stage для сборки
FROM node:20-alpine AS builder

WORKDIR /app

# Копируем зависимости
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Собираем приложение
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Production образ
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Создаем пользователя для безопасности
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Копируем необходимые файлы из standalone сборки
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]

