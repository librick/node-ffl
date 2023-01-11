# Node.js Dockerfile
# See: https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md
# Build Stage 1
# Create a staging docker image 
#
FROM node:18.13.0-alpine AS builder
WORKDIR /home/node/builder
COPY package.json ./
COPY package-lock.json ./
RUN npm install
#ENV NPM_CONFIG_PREFIX=/home/node/.npm-global
COPY ./src ./src
COPY .eslintignore ./
COPY .eslintrc.json ./
COPY .prettierrc.js ./
COPY tsconfig.json ./
RUN npm run compile
USER node

# Build Stage 2
# Create a production image from the stagin image
#
FROM node:18.13.0-alpine
ENV NODE_ENV=production
WORKDIR /home/node/app
# Create directory for csv outputs
RUN mkdir ./output
COPY package.json ./
RUN npm --omit=dev --omit=optional install
COPY --from=builder /home/node/builder/build ./
CMD ["node","index.js"]
USER node
