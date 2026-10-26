FROM node:20-alpine
WORKDIR /app
COPY package.json ./
COPY server.js ./
COPY public ./public
COPY data ./data
RUN mkdir -p uploads
EXPOSE 5000
ENV PORT=5000
ENV NODE_ENV=production
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:5000/api/files || exit 1
CMD ["node", "server.js"]
