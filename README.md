# Hotpepper Restaurant Search App
現在地周辺のレストランを検索するWebアプリケーションです。

## スクリーンショット / デモ
※ 現在はなし

## 主な機能
-   **レストラン検索:** Geolocation APIで取得した現在地と指定した半径に基づき、周辺のレストランを検索します。
-   **一覧表示:** 検索結果を一覧で表示し、ページング機能で多くの結果を閲覧できます。
-   **詳細表示:** 一覧から選択した店舗の詳細な情報（住所、営業時間、写真など）を確認できます。

## 使用技術
-   **バックエンド:** Python（Flask）
-   **フロントエンド:** JavaScript, HTML5, CSS3
-   **API:** ホットペッパー グルメサーチAPI, Geolocation API
-   **開発ツール:** VSCode, Postman, Git

## 実行方法

### 1. 前提条件
-   Python 3.9 以上がインストールされていること
-   `git`コマンドが利用できること
-   ホットペッパー グルメサーチAPIのAPIキーを取得済みであること

### 2. インストールと設定
1.  このリポジトリを任意のディレクトリにクローンします。
    ```bash
    git clone [https://github.com/your-username/hotpepper-restaurant-search-app.git](https://github.com/your-username/hotpepper-restaurant-search-app.git)
    cd hotpepper-restaurant-search-app
    ```

2.  Pythonの仮想環境を作成し、有効化します。
    ```bash
    # Windowsの場合
    python -m venv venv
    venv\Scripts\activate

    # macOS / Linuxの場合
    python3 -m venv venv
    source venv/bin/activate
    ```

3.  依存ライブラリをインストールします。
    ```bash
    pip install -r requirements.txt
    ```

4.  プロジェクトのルートディレクトリに`.env`ファイルを作成し、ご自身のAPIキーを記述します。
    ```
    API_KEY="ここにあなたのAPIキーを貼り付け"
    ```

### 3. アプリケーションの起動
以下のコマンドで開発サーバーを起動します。
```bash
flask run
