# Cataloger Shelf - トラブルシューティングガイド

本ドキュメントでは、Cataloger Shelfの本番環境デプロイメント中に発生した問題と解決方法を記録しています。

## 発生した問題と解決策

### 1. DNS エラー: `api.api.sheloger.opus.riumu.net`

**問題**:
- Next.jsアプリケーションが `DNS_PROBE_FINISHED_NXDOMAIN` エラーで500エラーを発生
- API URLが重複して `api.api.sheloger.opus.riumu.net` になっていた

**原因**:
- `next.config.ts` の `rewrites` 設定で `/api` パスが重複
- 環境変数 `NEXT_PUBLIC_API_URL` に既に `/api` が含まれているのに、さらに `/api` を追加

**解決策**:
```typescript
// 修正前 (frontend/next.config.ts)
destination: `${apiUrl}/api/:path*`

// 修正後
destination: `${apiUrl}/:path*`
```

### 2. Laravel Vendor ディレクトリの問題

**問題**:
- `vendor/autoload.php` が見つからないエラー
- マルチステージDockerビルドでvendorディレクトリが共有されていない

**原因**:
- ビルドステージで作成されたvendorディレクトリが本番ステージで利用できない
- 共有ボリュームにvendorディレクトリがコピーされていない

**解決策**:
```dockerfile
# docker/php/Dockerfile.prod に追加
RUN echo '#!/bin/sh' > /entrypoint.sh && \
    echo 'if [ ! -f /shared/public/index.php ]; then' >> /entrypoint.sh && \
    echo '  echo "Copying application files to shared volume..."' >> /entrypoint.sh && \
    echo '  cp -r /app/* /shared/' >> /entrypoint.sh && \
    echo '  chown -R www-data:www-data /shared/storage /shared/bootstrap/cache' >> /entrypoint.sh && \
    echo 'fi' >> /entrypoint.sh && \
    echo 'cd /shared' >> /entrypoint.sh && \
    echo 'exec php-fpm' >> /entrypoint.sh && \
    chmod +x /entrypoint.sh
```

### 3. MySQL ドライバーが見つからない

**問題**:
- `could not find driver` エラー
- PDO MySQLエクステンションがインストールされていない

**解決策**:
```dockerfile
# docker/php/Dockerfile.prod
RUN apk update && apk add --no-cache libzip libzip-dev mysql-client
RUN docker-php-ext-install pdo pdo_mysql zip
```

### 4. Laravel APP_KEY 未設定

**問題**:
- Laravel アプリケーションキーが設定されていない
- 暗号化関連の機能でエラー発生

**解決策**:
```yaml
# docker-compose.prod.yml
environment:
  - APP_KEY=base64:l/gurd9Eclxom/J/3gAFMAYD1YgXNw7HHs0ws8EyL50=
```

### 5. Laravel Facade システムエラー

**問題**:
- "A facade root has not been set" エラー
- Laravelがデフォルト設定（127.0.0.1、ユーザー名forge）を使用

**原因**:
- `.env` ファイルが存在しないため、環境変数が正しく読み込まれない
- キャッシュされた設定ファイルが古い環境変数を使用

**解決策**:
1. `.env` ファイルを作成：
```bash
docker exec cataloger-shelf-app-1 sh -c 'cd /shared && cat > .env << EOF
APP_NAME=Laravel
APP_ENV=production
APP_KEY=base64:l/gurd9Eclxom/J/3gAFMAYD1YgXNw7HHs0ws8EyL50=
APP_DEBUG=true
APP_URL=https://api.sheloger.opus.riumu.net

DB_CONNECTION=mysql
DB_HOST=db
DB_PORT=3306
DB_DATABASE=laravel_db
DB_USERNAME=user
DB_PASSWORD=password
EOF'
```

2. キャッシュクリア：
```bash
docker exec cataloger-shelf-app-1 sh -c 'cd /shared && php artisan config:clear && php artisan cache:clear && php artisan route:clear && php artisan view:clear'
```

## デバッグ用コマンド

### コンテナ状態確認
```bash
docker ps
docker logs cataloger-shelf-app-1
docker logs cataloger-shelf-web-1
```

### Laravel エラーログ確認
```bash
docker exec cataloger-shelf-app-1 tail -f /app/storage/logs/laravel.log
```

### データベース接続テスト
```bash
docker exec cataloger-shelf-app-1 mysql -h db -u user -p laravel_db
```

### API エンドポイントテスト
```bash
# GET テスト
curl -s https://api.sheloger.opus.riumu.net/api/opuses

# POST テスト
curl -X POST -H "Content-Type: application/json" \
  -d '{"title":"Test Opus","creator":"Test Creator","category":"book","status":"completed","rating":5,"review":"Great test"}' \
  https://api.sheloger.opus.riumu.net/api/opuses
```

### フロントエンド確認
```bash
curl -s https://cataloger-shelf.opus.riumu.net/
```

## 本番環境の最終構成

### アクセス URL
- **フロントエンド**: https://cataloger-shelf.opus.riumu.net/
- **バックエンド API**: https://api.sheloger.opus.riumu.net/api/

### Docker コンテナ
- `cataloger-shelf-frontend-1`: Next.js アプリケーション
- `cataloger-shelf-web-1`: Nginx (バックエンド用)
- `cataloger-shelf-app-1`: Laravel/PHP-FPM
- `cataloger-shelf-db-1`: MySQL 8.0

### 重要な設定ファイル
- `docker-compose.prod.yml`: 本番環境Docker構成
- `frontend/next.config.ts`: Next.js設定
- `docker/php/Dockerfile.prod`: Laravel/PHP設定
- `docker/nginx/default.prod.conf`: Nginx設定
- `backend/.env`: Laravel環境変数（本番環境でのみ存在）

## 予防策

1. **環境変数の一貫性**: Docker Composeと.envファイルで同じ値を使用
2. **キャッシュ管理**: デプロイ後は必ずLaravelキャッシュをクリア
3. **ヘルスチェック**: 定期的なAPIエンドポイントの動作確認
4. **ログ監視**: Laravelログとnginxログの定期確認
5. **バックアップ**: データベースとアプリケーションファイルの定期バックアップ