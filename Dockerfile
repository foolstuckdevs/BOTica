# Step 1
FROM node:20.12-alpine

WORKDIR /app

COPY package*.json ./

# Prisma ni Yohan
# COPY ../prisma /app/prisma

# Generate Prisma client
# RUN npx prisma generate

# Reccomendations ni Compiler kunu, hahaha
RUN npm i sharp

# install dependencies
RUN npm  install

# Next Slave
RUN npm install -g next@14.2.16

COPY . .

EXPOSE 3000

# CMD npm run dev
CMD ["npm", "run", "dev"]
