# docker build -t heartauth-core-e2e  .
FROM mcr.microsoft.com/playwright:focal

COPY . /e2e

WORKDIR /e2e

RUN npm install

CMD [ "npm", "run", "test:e2e" ]