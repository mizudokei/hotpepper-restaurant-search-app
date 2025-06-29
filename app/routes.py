# app/routes.py

from flask import Blueprint, render_template, request, current_app
import requests

bp = Blueprint('main', __name__)

@bp.route('/')
def index():
    return render_template('index.html')

@bp.route('/search')
def search():
    # 1. フロントエンドから送られてきたパラメータを取得
    lat = request.args.get('lat') # 緯度
    lng = request.args.get('lng') # 経度
    range_code = request.args.get('range') # 検索範囲コード

    # 2. ホットペッパーAPIへのリクエスト情報を作成
    api_key = current_app.config['API_KEY']
    api_url = 'http://webservice.recruit.co.jp/hotpepper/gourmet/v1/'

    params = {
        'key': api_key,
        'lat': lat,
        'lng': lng,
        'range': range_code,
        'order': 4,
        'format': 'json'
    }

    # 3. APIにリクエストを送信し、レスポンスを取得
    response = requests.get(api_url, params=params)
    response.raise_for_status()  # エラーがあれば例外を発生させる

    # 4. レスポンスのJSONをPythonの辞書型に変換
    search_result = response.json()

    # 5. APIレスポンスから店舗情報のリストを取得する
    # .get('shop', [])とすることで、'shop'キーが存在しなくてもエラーにならず、空のリストを返す
    shops = search_result['results'].get('shop', [])

    # 6. 取得した店舗リストを`results.html`に渡して、ページを生成して返す
    return render_template('results.html', shops=shops)