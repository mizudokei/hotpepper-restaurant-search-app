from flask import Blueprint, render_template, current_app
import requests

# ==============================================================================
# Blueprintの定義
# ==============================================================================
bp = Blueprint('main', __name__, template_folder='../../templates')


# ==============================================================================
# ヘルパー関数
# ==============================================================================

def get_all_genres():
    """
    ホットペッパーのグルメジャンルマスターAPIを呼び出し、ジャンル一覧を取得。

    API通信に失敗した場合は、エラーメッセージをコンソールに出力し、
    空のリストを返すことで、アプリケーション全体のクラッシュを防ぐ。

    Returns:
        list: ジャンル情報の辞書が格納されたリスト。例: [{'code': 'G001', 'name': '居酒屋'}, ...]   失敗した場合は空のリスト。
    """
    try:
        api_key = current_app.config['API_KEY']
        url = 'http://webservice.recruit.co.jp/hotpepper/genre/v1/'
        params = {'key': api_key, 'format': 'json'}
        response = requests.get(url, params=params)
        response.raise_for_status()  # HTTPエラーがあれば例外を発生させる
        data = response.json()
        return data.get('results', {}).get('genre', [])
    except requests.exceptions.RequestException as e:
        # API通信関連のエラーを補足
        print(f"Error: Failed to fetch genres from HotPepper API. {e}")
        return []

def get_all_special_categories():
    """
    ホットペッパーのこだわりマスターAPIを呼び出し、こだわり条件一覧を取得。

    Returns:
        list: こだわり条件情報の辞書が格納されたリスト。失敗した場合は空のリスト。
    """
    try:
        api_key = current_app.config['API_KEY']
        url = 'http://webservice.recruit.co.jp/hotpepper/special_category/v1/'
        params = {'key': api_key, 'format': 'json'}
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        return data.get('results', {}).get('special_category', [])
    except requests.exceptions.RequestException as e:
        print(f"Error: Failed to fetch special categories from HotPepper API. {e}")
        return []


# ==============================================================================
# ルート定義
# ==============================================================================

@bp.route('/')
def index():
    """
    アプリケーションのトップページ（検索画面）をレンダリング。

    ページ表示に必要なジャンルとこだわり条件のリストをAPIから取得し、HTMLテンプレートに渡す。
    """
    genres = get_all_genres()
    special_categories = get_all_special_categories()
    return render_template('index.html', genres=genres, special_categories=special_categories)


@bp.route('/shop/<string:shop_id>')
def shop_detail(shop_id):
    """
    指定された店舗ID（shop_id）に基づいて、店舗の詳細ページをレンダリング。

    Args:
        shop_id (str): URLから受け取った店舗の一意なID。

    Returns:
        response: レンダリングされたHTMLページ。店舗が見つからない場合はその旨を表示。
    """
    try:
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

        # APIのレスポンスから店舗情報を安全に取得
        # 'shop'キーが存在し、かつリストが空でない場合に最初の要素を取得
        shop = result.get('results', {}).get('shop', [None])[0]

        return render_template('detail.html', shop=shop)
    except requests.exceptions.RequestException as e:
        # API通信エラーの場合は、エラーメッセージと共に詳細ページをレンダリング
        print(f"Error fetching shop details for ID {shop_id}: {e}")
        return render_template('detail.html', shop=None, error="店舗情報の取得に失敗しました。"), 500
    except (IndexError, TypeError) as e:
        # JSONの構造が予期せぬものだった場合のエラーハンドリング
        print(f"Error parsing shop details for ID {shop_id}: {e}")
        return render_template('detail.html', shop=None, error="店舗情報の解析に失敗しました。"), 500
