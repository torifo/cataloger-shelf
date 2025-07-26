# Xserver VPSへのデプロイ計画 (GHCR版・実践編)

このドキュメントは、現在のプロジェクトの状態から、GitHub Container Registry (GHCR) を利用してXserverのVPSにアプリケーションをデプロイするための、具体的な手順書です。

---

## 前提条件

- GitHub Container Registry (GHCR) へのログイン設定は完了済み。
- VPSにはDocker、Docker Compose、そしてglobal-proxy-networkが設定済み。

---

## フェーズ1：【ローカルPCでの作業】 本番用イメージの準備

### ステップ1：本番用Dockerfileの作成（マルチステージビルド）

本番用イメージを軽量化するため、マルチステージビルドという手法を用います。開発時にしか使わないツールを含まない、実行に必要な最小限のイメージを作成します。

#### a. バックエンド (Laravel) のDockerfile

`docker/php/ディレクトリ`に、`Dockerfile.prod`という名前で新しいファイルを作成し、以下の内容を貼り付けてください。

```dockerfile
# ---- ビルドステージ (Builder Stage) ----
# 依存関係のインストールやアセットのビルドを行う
FROM php:8.2-fpm-alpine AS builder

RUN apk update && apk add --no-cache \
      build-base libzip-dev zip curl nodejs npm mysql-client

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /app

COPY backend/composer.json backend/composer.lock ./
RUN composer install --optimize-autoloader --no-dev

COPY backend/ .

RUN php artisan config:cache && \
    php artisan route:cache && \
    php artisan view:cache

# ---- 本番ステージ (Production Stage) ----
# 実行に必要な最小限のファイルだけをコピーする
FROM php:8.2-fpm-alpine

RUN apk update && apk add --no-cache libzip mysql-client

WORKDIR /app

COPY --from=builder /app .

RUN chown -R www-data:www-data /app/storage /app/bootstrap/cache

EXPOSE 9000
CMD ["php-fpm"]
```

#### b. フロントエンド (Next.js) のDockerfile

`frontend/ディレクトリ`に、`Dockerfile.prod`という名前で新しいファイルを作成し、以下の内容を貼り付けてください。

```dockerfile
# ---- ビルドステージ (Builder Stage) ----
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# ---- 本番ステージ (Production Stage) ----
FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# ポートを3003に変更
EXPOSE 3003
# 起動コマンドでポート3003を指定
CMD ["next", "start", "-p", "3003"]
```

---

### ステップ2：本番アーキテクチャ向けのビルドとプッシュ (buildx)

ローカルPCのターミナルで、以下のコマンドを実行します。これにより、VPSのCPUアーキテクチャ（linux/amd64）向けのイメージがビルドされ、直接GHCRにプッシュされます。

```sh
# バックエンドイメージのビルドとプッシュ
docker buildx build --platform linux/amd64 -t ghcr.io/torifo/cataloger-shelf-backend:latest -f docker/php/Dockerfile.prod . --push

# フロントエンドイメージのビルドとプッシュ
docker buildx build --platform linux/amd64 -t ghcr.io/torifo/cataloger-shelf-frontend:latest -f frontend/Dockerfile.prod ./frontend --push
```

> `torifo`の部分は、あなたのGitHubユーザー名に置き換えてください。

---

## フェーズ2：【VPSでの作業】 サーバー環境の構築と起動

### ステップ1：本番用docker-compose.ymlの作成

VPSにSSHでログインし、プロジェクトディレクトリ（例: `~/apps/opusrium`）を作成します。その中に、以下の内容で`docker-compose.yml`を新規作成してください。

```yaml
services:
  # バックエンド (Laravel)
  app:
    image: ghcr.io/torifo/cataloger-shelf-backend:latest
    restart: always
    volumes:
      - laravel-storage:/app/storage
    env_file:
      - ./backend/.env
    networks:
      - default
      - global-proxy-network # 既存の外部ネットワークに接続

  # フロントエンド (Next.js)
  frontend:
    image: ghcr.io/torifo/cataloger-shelf-frontend:latest
    restart: always
    # ポートマッピングを3003に変更
    ports:
      - "3003:3003"
    networks:
      - default
      - global-proxy-network # 既存の外部ネットワークに接続

  # Webサーバー (Nginx) - Laravel用
  web:
    image: nginx:alpine
    restart: always
    # このNginxはコンテナ間通信専用なので、ポートは公開しない
    volumes:
      - ./docker/nginx/default.conf:/etc/nginx/conf.d/default.conf
    depends_on:
      - app
    networks:
      - default
      - global-proxy-network # 既存の外部ネットワークに接続

  # データベース (MySQL)
  db:
    image: mysql:8.0
    restart: always
    volumes:
      - mysql-data:/var/lib/mysql
    environment:
      MYSQL_DATABASE: opusrium_prod
      MYSQL_USER: prod_user
      MYSQL_PASSWORD: YOUR_STRONG_DB_PASSWORD
      MYSQL_ROOT_PASSWORD: YOUR_STRONG_ROOT_PASSWORD
    networks:
      - default

# 外部の既存ネットワークに接続するための定義
networks:
  global-proxy-network:
    external: true

volumes:
  mysql-data:
  laravel-storage:
```

> 注意: このファイルと一緒に、ローカルの`docker/nginx/default.conf`もVPSの同じディレクトリ構造の場所にコピーしてください。また、VPSのリバースプロキシ設定で、フロントエンドへの転送先を`http://localhost:3003`に変更する必要があります。

---

### ステップ2：本番用.envファイルの作成

VPSの`~/apps/opusrium/backend/`ディレクトリに、`.env`ファイルを新規作成し、本番用の設定を記述します。

```env
APP_NAME=Opusrium
APP_ENV=production
APP_KEY= # この後、`php artisan key:generate`で生成
APP_DEBUG=false
APP_URL=https://api.sheloger.opus.riumu.net

DB_CONNECTION=mysql
DB_HOST=db
DB_PORT=3306
DB_DATABASE=opusrium_prod
DB_USERNAME=prod_user
DB_PASSWORD=YOUR_STRONG_DB_PASSWORD # 上記と同じパスワード
```

---

### ステップ3：アプリケーションの起動

```sh
# 1. GHCRから最新のイメージを取得
sudo docker compose pull

# 2. Laravelの暗号化キーを生成
sudo docker compose run --rm app php artisan key:generate

# 3. データベースのマイグレーション
sudo docker compose run --rm app php artisan migrate --force

# 4. 起動！
sudo docker compose up -d


---

## デプロイ状況 (2025年7月26日時点)

### プロダクションリポジトリ設定完了
- **プロダクションリポジトリ**: `https://github.com/torifo/cataloger-shelf.git`
- **標準ブランチ**: `main` (releaseブランチから作成済み)
- **リモート設定**: `production` remote が設定済み

### 今後のデプロイワークフロー
1. 開発環境でreleaseブランチに変更をプッシュ
2. プロダクションリポジトリにデプロイする際は以下のコマンドを実行：
   ```bash
   git push production release:main
   ```
3. VPS側で最新イメージをプルして再起動

### 本番用Dockerfileの状況
- ✅ `docker/php/Dockerfile.prod` - バックエンド用本番Dockerfile作成済み
- ✅ `frontend/Dockerfile.prod` - フロントエンド用本番Dockerfile作成済み
