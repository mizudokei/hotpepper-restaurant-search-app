from flask import Flask
from config import Config

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    from app.main import routes as main_routes
    app.register_blueprint(main_routes.bp)

    from app.api import routes as api_routes
    app.register_blueprint(api_routes.bp)

    return app