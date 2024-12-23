FROM node:16-alpine

# Установим рабочую директорию
WORKDIR /app

# Скопируем файлы проекта
COPY package*.json ./

# Установим зависимости
RUN npm install

# Скопируем весь проект
COPY . .

# Открываем порт для WebSocket
EXPOSE 3001

# Указываем команду запуска
CMD ["node", "server.js"]
