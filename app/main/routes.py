from flask import Blueprint, render_template, current_app
import requests

# 'main'という名前の新しいBlueprintを作成
bp = Blueprint('main', __name__, template_folder='../../templates')

def get_all_genres():
    """グルメジャンルマスターAPIから全ジャンルを取得する"""
    try:
        api_key = current_app.config['API_KEY']
        url = 'http://webservice.recruit.co.jp/hotpepper/genre/v1/'
        params = {'key': api_key, 'format': 'json'}
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        return data.get('results', {}).get('genre', [])
    except requests.exceptions.RequestException as e:
        print(f"Failed to fetch genres: {e}")
        return []

def get_all_special_categories():
    """こだわりマスターAPIから全条件を取得する"""
    try:
        api_key = current_app.config['API_KEY']
        url = 'http://webservice.recruit.co.jp/hotpepper/special_category/v1/'
        params = {'key': api_key, 'format': 'json'}
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        return data.get('results', {}).get('special_category', [])
    except requests.exceptions.RequestException as e:
        print(f"Failed to fetch special categories: {e}")
        return []

@bp.route('/')
def index():
    genres = get_all_genres()
    special_categories = get_all_special_categories()
    return render_template('index.html', genres=genres, special_categories=special_categories)

@bp.route('/shop/<string:shop_id>')
def shop_detail(shop_id):
    api_key = current_app.config['API_KEY']
    api_url = 'http://webservice.recruit.co.jp/hotpepper/gourmet/v1/'
    params = {
        'key': api_key,
        'id': shop_id,
        'format': 'json'
    }
    response = requests.get(api_url, params=params)
    response.raise_for_status()
    result = response.json()
    shop = result['results']['shop'][0] if result['results']['shop'] else None
    return render_template('detail.html', shop=shop)