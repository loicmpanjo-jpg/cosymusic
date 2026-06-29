FROM node:20-slim
WORKDIR /app
COPY . .
# Le serveur écoute sur le port 3000 par défaut ou process.env.PORT
ENV PORT=10000
EXPOSE 10000
CMD ["node", "server.js"]
