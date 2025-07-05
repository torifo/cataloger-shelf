# ベースイメージ
FROM php:8.2-fpm-alpine

# 必要なPHP拡張機能とライブラリをインストール
RUN apk update && apk add --no-cache \
      build-base \
      libzip-dev \
      zip \
      curl \
      nodejs \
      npm \
      mysql-client \
    && docker-php-ext-install pdo_mysql zip

# Composer (PHPのパッケージ管理ツール)をインストール
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# 作業ディレクトリを設定
WORKDIR /work