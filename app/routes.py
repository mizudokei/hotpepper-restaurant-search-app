# app/routes.py

from flask import Blueprint, render_template

# 'main'という名前のBlueprintを作成
bp = Blueprint('main', __name__)

@bp.route('/')
def index():
    return render_template('index.html')