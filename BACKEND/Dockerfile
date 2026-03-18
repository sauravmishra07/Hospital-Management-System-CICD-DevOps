FROM node:18-alpine

WORKDIR /app

# Create non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Change ownership
RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 4000

CMD ["node", "server.js"]

