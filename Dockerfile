FROM node:20-slim

# Instalar Ghostscript para compresión de PDFs
RUN apt-get update && \
    apt-get install -y ghostscript --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Instalar dependencias
COPY package*.json ./
RUN npm install --legacy-peer-deps --include=dev

# Copiar código y compilar
COPY . .
RUN npm run build

EXPOSE 10000

CMD ["npm", "start"]
