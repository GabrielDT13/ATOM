FROM node:20-alpine

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY frontend /app/frontend
COPY scripts/checks/frontend.sh /app/scripts/checks/frontend.sh
RUN chmod +x /app/scripts/checks/frontend.sh

EXPOSE 3000

CMD ["npm", "run", "dev"]
