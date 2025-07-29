# プロジェクト「Opusrium/cataloger-shelf」開発ドキュメント

このドキュメントは，Jamstack構成（Laravel + Next.js）で構築された作品ログアプリケーション「Opusrium/cataloger-shelf」の開発手順，設定，アーキテクチャをまとめたものです。

## 1. プロジェクト概要

- **目的**: あらゆる作品（本，アニメ，映画など）の感想やデータを記録・管理する個人用データベースサイト．
- **アーキテクチャ**: Jamstack (ヘッドレス)
  - **バックエンド**: Laravel (APIモード)
  - **フロントエンド**: Next.js (Reactフレームワーク)
- **データベース**: MySQL

---

## 2. 開発環境の起動と停止

このプロジェクトはDockerで環境を構築しています．

### サーバーの起動
ターミナルを2つ開き，それぞれ以下のコマンドを実行します．

1.  **バックエンド (Laravel API) の起動**
    ```bash
    # プロジェクトルートで実行
    docker compose up -d
    ```
    - APIサーバーは `http://localhost:8080` で利用可能になります．

2.  **フロントエンド (Next.js) の起動**
    ```bash
    # プロジェクトルートで実行
    cd frontend
    npm run dev
    ```
    - フロントエンドのWebページは `http://localhost:3000` で表示されます．

### サーバーの停止
1.  **バックエンド**: `docker compose down`
2.  **フロントエンド**: `Ctrl + C`

---

## 3. 本番環境のデプロイメント

### 本番環境の起動
```bash
# 本番環境用のDocker Composeファイルを使用
docker compose -f docker-compose.prod.yml up -d
```

### 本番環境の構成
- **Docker Compose**: `docker-compose.prod.yml`
- **Nginx Proxy**: Let's Encrypt SSL証明書の自動発行
- **Container Services**:
  - フロントエンド: Next.js (ポート3003)
  - バックエンド用Nginx: リバースプロキシとして動作
  - アプリケーション: Laravel/PHP-FPM
  - データベース: MySQL 8.0

### 本番環境の管理コマンド
```bash
# マイグレーション実行
docker exec [app-container-name] sh -c 'cd /shared && php artisan migrate'

# キャッシュクリア
docker exec [app-container-name] sh -c 'cd /shared && php artisan config:clear && php artisan cache:clear'

# ログ確認
docker logs [app-container-name]
docker exec [app-container-name] tail -f /app/storage/logs/laravel.log
```

---

## 4. ディレクトリ構造と主要ファイル

```
├── backend/                # Laravel (バックエンド) の全ファイル
├── docker/                 # Dockerの設定ファイル
│   ├── nginx/
│   │   ├── default.conf           # 開発環境用Nginx設定
│   │   └── default.prod.conf      # 本番環境用Nginx設定
│   └── php/
│       ├── Dockerfile             # 開発環境用PHP設定
│       └── Dockerfile.prod        # 本番環境用PHP設定
├── frontend/               # Next.js (フロントエンド) の全ファイル
│   ├── Dockerfile.prod            # 本番環境用フロントエンド設定
│   └── next.config.ts             # Next.js設定
├── docker-compose.yml      # 開発環境用Docker設計図
├── docker-compose.prod.yml # 本番環境用Docker設計図
├── README.md               # このファイル
└── TROUBLESHOOTING.md      # トラブルシューティングガイド
```

---

## 5. バックエンド (Laravel) 詳細

### 5.1. Docker設定 (`docker-compose.yml`, `docker/`)

- **`docker-compose.yml`**:
  - `web` (Nginx), `app` (PHP), `db` (MySQL) の3つのコンテナを定義する設計図です．
  - **ポートフォワーディング**:
    - `8080:80` (web): PCの8080番ポートをNginxコンテナの80番に接続．
    - `33060:3306` (db): PCの33060番ポートをMySQLコンテナの3306番に接続．
- **`docker/nginx/default.conf`**:
  - Nginxの設定ファイル．リクエストをPHPコンテナ(`app`)に渡す役割を担います．
- **`docker/php/Dockerfile`**:
  - PHPコンテナの設計図．PHP本体や必要な拡張機能（`pdo_mysql`など），Composerをインストールします．

### 5.2. データベース (MySQL)

- **接続情報 (`backend/.env`)**:
  - LaravelからMySQLコンテナへの接続情報を定義しています．
  - `DB_HOST=db` となっているのがポイントで，これは`docker-compose.yml`で定義したサービス名です．
- **テーブル設計 (`backend/database/migrations/`)**:
  - `opuses`テーブルの構造は`...create_opuses_table.php`ファイルに定義されています．
  - カラムの追加や変更は，新しいマイグレーションファイルを作成して行います．
- **マイグレーションの実行**:
  - テーブル設計を実際のデータベースに反映させるコマンドです．
  ```bash
  docker compose exec app php artisan migrate
  ```

### 5.3. API (ルートとコントローラー)

- **APIルート定義 (`backend/routes/api.php`)**:
  - `Route::apiResource('opuses', OpusController::class);` の一行で，作品(Opus)に関する基本的なCRUD（作成・読取・更新・削除）のAPIエンドポイントをまとめて定義しています．
  - 例: `GET /api/opuses`, `POST /api/opuses`, `PUT /api/opuses/{id}` など．
- **処理ロジック (`backend/app/Http/Controllers/OpusController.php`)**:
  - 各APIエンドポイントがリクエストを受け取った際の具体的な処理を記述します．
  - `index()`は一覧取得，`store()`は新規作成，`update()`は更新，`destroy()`は削除を担当します．
- **モデル (`backend/app/Models/Opus.php`)**:
  - `opuses`テーブルと直接やり取りをするクラスです．
  - `$fillable`プロパティには，プログラムからの書き込みを許可するカラム名を定義します（マスアサインメント対策）．

---

## 6. フロントエンド (Next.js) 詳細

### 6.1. 主要ページコンポーネント

- **一覧ページ (`frontend/app/page.tsx`)**:
  - ページのメインコンポーネントがサーバーサイドで`fetch`を使い，バックエンドAPI (`http://localhost:8080/api/opuses`) から作品一覧を取得して表示します．
- **新規作成ページ (`frontend/app/opuses/new/page.tsx`)**:
  - `'use client';` を先頭に記述し，ブラウザ側で動作するクライアントコンポーネントとして定義されています．
  - `useState`フックでフォームの入力状態を管理します．
  - フォームが送信されると，`fetch`を使ってバックエンドの`POST /api/opuses`エンドポイントにデータを送信します．

### 6.2. 環境設定 (`frontend/next.config.ts`)

- **API URL設定**: 環境変数 `NEXT_PUBLIC_API_URL` を使用してAPIエンドポイントを設定
- **リライト設定**: `/api/*` へのリクエストをバックエンドAPIにプロキシ
- **本番環境設定**: 適切なドメイン設定とSSL対応

### 6.3. データ連携の流れ (一覧表示の例)

1.  ユーザーがブラウザで `http://localhost:3000` にアクセス．
2.  Next.jsサーバーが`frontend/app/page.tsx`を実行．
3.  `page.tsx`内の`getOpuses`関数が，バックエンドAPI `http://localhost:8080/api/opuses` に`fetch`でリクエストを送信．
4.  Laravelの`routes/api.php`がリクエストを受け取り，`OpusController@index`メソッドを呼び出す．
5.  `OpusController`が`Opus`モデルを使い，DBから全作品データを取得．
6.  Laravelが取得したデータをJSON形式でNext.jsサーバーに返す．
7.  Next.jsサーバーが受け取ったJSONデータを元にHTMLを生成し，ユーザーのブラウザに送信・表示する．

---

## 7. セキュリティとデプロイメント

### 機密ファイルの管理

#### 開発用リポジトリ (.dev)
以下のファイルを含む完全なプロジェクト：
- `backend/.env` (データベース認証情報を含む)
- `docker-compose.prod.yml` (本番環境設定)
- すべての設定ファイル

#### 本番用リポジトリ (public)
以下のファイルを除外したプロジェクト：
- `backend/.env`
- 機密性の高い設定情報
- 開発専用ファイル

### 推奨.gitignore設定
```gitignore
# 機密ファイル (本番用リポジトリでは除外)
backend/.env
.env.production
.env.local

# Docker関連
docker-compose.override.yml

# ログファイル
*.log
backend/storage/logs/*

# 一時ファイル
.DS_Store
Thumbs.db
```

---

## 8. API仕様

### Opus (作品) API

**Base URL**: `http://localhost:8080/api` (開発環境)

#### エンドポイント一覧

| メソッド | エンドポイント | 説明 |
|---------|-------------|------|
| GET | `/opuses` | 作品一覧取得 |
| POST | `/opuses` | 新規作品作成 |
| GET | `/opuses/{id}` | 特定作品詳細取得 |
| PUT | `/opuses/{id}` | 作品情報更新 |
| DELETE | `/opuses/{id}` | 作品削除 |

#### レスポンス例
```json
{
  "id": 1,
  "title": "作品タイトル",
  "creator": "作者名",
  "category": "book",
  "sub_category": null,
  "status": "completed",
  "rating": 5,
  "review": "感想テキスト",
  "created_at": "2025-07-29T00:59:19.000000Z",
  "updated_at": "2025-07-29T00:59:19.000000Z"
}
```

---

## 9. トラブルシューティング

本番環境でのデプロイメント中に発生する可能性のある問題とその解決方法については、以下のドキュメントを参照してください：

**[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)**

主な問題項目：
- DNS エラーとAPI URL設定問題
- Laravel Vendor ディレクトリの問題
- MySQL ドライバーエラー
- Laravel APP_KEY 未設定
- Laravel Facade システムエラー