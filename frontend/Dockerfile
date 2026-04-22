FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

EXPOSE 3000

# `npm install` runs on every start so that changes to package.json picked
# up by bind-mounted source files also land in the persistent
# `/app/node_modules` anonymous volume. When nothing's changed the install
# is a fast no-op.
CMD ["sh", "-c", "npm install --no-audit --no-fund --loglevel=error && npm run dev"]
