# Deployment guideline

## Setup source

```shell
git clone https://github.com/Sotatek-TungBui2/tap-game-be.git 
yarn install or npm install
```

## Migrate database

- Start PostgreSQL image:

```shell
docker compose up -d
```

- Check the env, make sure `DATABASE_URL` is set:

```shell
DATABASE_URL="postgres://root:root@localhost/taptap"
```

- Generate Prisma type:

```shell
yarn db:generate
or
npm run db:generate
```

- Run migration:

```shell
yarn db:migrate dev
or 
npm run db:migrate dev
```

## Start service

- Update `DATABASE_URL` to docker host URL:

```shell
DATABASE_URL="postgresql://root:root@postgres:5432/taptap"
```

- Start service:

```shell
docker compose up --build -d
```

- Check service: Make sure `ton-demo-be` and `postgres` are both running

```shell
docker ps
```



