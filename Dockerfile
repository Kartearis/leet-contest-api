FROM oven/bun:slim
LABEL authors="Kartearis"

WORKDIR /app

COPY . .

RUN bun install

CMD "bun run serve"
EXPOSE 3000