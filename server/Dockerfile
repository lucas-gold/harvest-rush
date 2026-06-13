# Small, single-stage-ish build: compile TS, then run on a slim runtime
# image. No native deps here, so alpine is fine and keeps the image tiny.
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
# Optional: the Expo web export, if you're serving the site from this same
# box. Copy it in as web-client/ before building the image, e.g.:
#   npx expo export --platform web --output-dir ../server/web-client
COPY web-client ./web-client

EXPOSE 8787
CMD ["node", "dist/index.js"]
