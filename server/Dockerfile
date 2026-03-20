FROM node:20-alpine

WORKDIR /app

# Installer les dépendances système nécessaires pour sharp
RUN apk add --no-cache python3 make g++ vips-dev

# Copier les fichiers de dépendances
COPY package*.json ./
COPY prisma ./prisma/

# Installer les dépendances
RUN npm install

# Générer le client Prisma
RUN npx prisma generate

# Copier le reste du code
COPY . .

# Créer le dossier uploads
RUN mkdir -p /app/uploads

EXPOSE 3001

CMD ["npm", "run", "dev"]
