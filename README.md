# Hotpepper Restaurant Search App

現在地周辺のレストランを検索する Web アプリケーションです。

## 主な機能

- **レストラン検索:** Geolocation API で取得した現在地と指定した半径に基づき、その他の条件と併せて周辺のレストランを検索します。
- **一覧表示:** 検索結果を一覧で表示し、ページング機能で多くの結果を閲覧できます。
- **詳細表示:** 一覧から選択した店舗の詳細な情報（住所、営業時間、写真など）を確認できます。

## 使用技術

- **バックエンド：** Python (3.11), Flask
- **フロントエンド：** JavaScript (ES6), HTML5, CSS3
- **地図ライブラリ：** Leaflet.js, Leaflet.markercluster, Leaflet.heat, Leaflet Routing Machine
- **インフラ：** Docker, Gunicorn
- **API：** ホットペッパー グルメサーチ API, Geolocation API
- **開発ツール：** VSCode, Postman, Git, pytest

## 実行方法

### 1. 前提条件

- Python 3.9 以上がインストールされていること
- Docker がインストールされていること
- `git`コマンドが利用できること
- ホットペッパー グルメサーチ API の API キーを取得済みであること

### 2. インストールと設定

1.  このリポジトリをクローンします。

    ```bash
    git clone [https://github.com/your-username/hotpepper-restaurant-search-app.git](https://github.com/your-username/hotpepper-restaurant-search-app.git)
    cd hotpepper-restaurant-search-app
    ```

2.  プロジェクトのルートディレクトリに`.env`ファイルを作成し、ご自身の API キーを記述します。

    ```
    API_KEY="あなたのAPIキー"
    ```

3.  Docker コンテナを起動します。

    ```bash
    docker-compose up --build
    ```

4.  ブラウザで `http://127.0.0.1:5000` にアクセスしてください。
