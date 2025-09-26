FROM mcr.microsoft.com/playwright:v1.55.0-jammy

WORKDIR /app

COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then \
      npm ci; \
    else \
      npm install; \
    fi \
    && npx playwright install chromium --with-deps

COPY . .

ENV NODE_ENV=production

CMD ["npm", "run", "capture"]
