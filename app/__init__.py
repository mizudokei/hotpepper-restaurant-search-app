# app/__init__.py

from flask import Flask
from config import Config

def create_app(config_class=Config):
    # __name__には'app'というモジュール名が入る
    # これにより、Flaskは'app'ディレクトリ内のtemplatesやstaticを自動で認識する
    app = Flask(__name__)
    app.config.from_object(config_class)

    # ルーティングを登録
    from app import routes
    app.register_blueprint(routes.bp)

    return app