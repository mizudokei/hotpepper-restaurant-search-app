# app/routes.py

from flask import Blueprint, render_template, request, current_app
import requests

bp = Blueprint('main', __name__)

@bp.route('/')
def index():
    return render_template('index.html')

@bp.route('/search')
def search():
    # フロントエンドから送られてきたパラメータを取得
    lat = request.args.get('lat') # 緯度
    lng = request.args.get('lng') # 経度
    range_code = request.args.get('range') # 検索範囲コード

    # APIへのリクエスト情報を作成
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

    # APIにリクエストを送信し、レスポンスを取得
    response = requests.get(api_url, params=params)
    response.raise_for_status()  # エラーがあれば例外を発生させる

    # レスポンスのJSONをPythonの辞書型に変換
    search_result = response.json()

    # APIレスポンスから店舗情報のリストを取得する
    # .get('shop', [])とすることで、'shop'キーが存在しなくてもエラーにならず、空のリストを返す
    shops = search_result['results'].get('shop', [])

    # 取得した店舗リストを`results.html`に渡して、ページを生成して返す
    return render_template('results.html', shops=shops)

@bp.route('/shop/<string:shop_id>')
def shop_detail(shop_id):

    # APIへのリクエスト情報を作成
    api_key = current_app.config['API_KEY']
    api_url = 'http://webservice.recruit.co.jp/hotpepper/gourmet/v1/'

    params = {
        'key': api_key,
        'id': shop_id,
        'format': 'json'
    }

    # APIにリクエストを送信し、レスポンスを取得
    response = requests.get(api_url, params=params)
    response.raise_for_status()
    result = response.json()

    # 店舗情報が取得できればその情報を、できなければNoneをshop変数に格納
    shop = result['results']['shop'][0] if result['results']['shop'] else None

    return render_template('detail.html', shop=shop)