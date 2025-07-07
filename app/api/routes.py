from flask import Blueprint, request, current_app, jsonify
from math import radians, sin, cos, sqrt, atan2
import requests

# ==============================================================================
# Blueprintの定義
# ==============================================================================
bp = Blueprint('api', __name__, url_prefix='/api')


# ==============================================================================
# ヘルパー関数
# ==============================================================================

def haversine_distance(lat1, lon1, lat2, lon2):
    """
    2点間の緯度経度から、球面三角法を用いて距離(km)を計算します。

    args:
        lat1 (float): 地点1の緯度
        lon1 (float): 地点1の経度
        lat2 (float): 地点2の緯度
        lon2 (float): 地点2の経度

    returns:
        float: 2点間の距離 (km)
    """
    R = 6371.0  # 地球の半径 (km)
    lat1_rad, lon1_rad, lat2_rad, lon2_rad = map(radians, [lat1, lon1, lat2, lon2])

    dlon = lon2_rad - lon1_rad
    dlat = lat2_rad - lat1_rad

    a = sin(dlat / 2)**2 + cos(lat1_rad) * cos(lat2_rad) * sin(dlon / 2)**2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))

    distance = R * c
    return distance


# ==============================================================================
# ルート定義
# ==============================================================================

@bp.route('/search')
def search():
    """
    フロントエンドからの検索リクエストを受け付け、ホットペッパーAPIで店舗を検索し、
    結果をJSON形式で返却するAPIエンドポイント。
    """
    try:
        # --- 1. リクエストからクエリパラメータを安全に取得 ---
        try:
            page = int(request.args.get('page', 1))
            lat = float(request.args.get('lat'))
            lng = float(request.args.get('lng'))
            range_code = int(request.args.get('range', 1))
        except (TypeError, ValueError):
            return jsonify({'error': 'Invalid parameter type for lat, lng, or range.'}), 400
        keyword = request.args.get('keyword', type=str)
        genre = request.args.get('genre', type=str)
        special_category = request.args.get('special_category', type=str)
        sort_by = request.args.get('sort_by')
        budget = request.args.get('budget', type=str)
        count = 10  # 1ページあたりの表示件数（固定）
        start = (page - 1) * count + 1

        # 緯度・経度の存在チェック
        if lat is None or lng is None:
            return jsonify({'error': 'Latitude and longitude are required.'}), 400

        # --- 2. ホットペッパーAPIへのリクエストパラメータを組み立て ---
        api_key = current_app.config['API_KEY']
        api_url = 'http://webservice.recruit.co.jp/hotpepper/gourmet/v1/'
        params = {
            'key': api_key, 'lat': lat, 'lng': lng, 'range': range_code,
            'start': start, 'count': count, 'format': 'json'
        }
        # 各種フィルター条件が存在すれば、パラメータに追加
        if keyword:
            normalized_keyword = keyword.replace('　', ' ')
            words = [word for word in normalized_keyword.split(' ') if word]
            if words:
                params['keyword'] = '+'.join(words)
        if genre:
            params['genre'] = genre
        if sort_by == '4':
            params['order'] = '4'
        if budget:
            params['budget'] = budget
        if special_category:
            params['special_category'] = special_category

        # --- 3. ホットペッパーAPIを呼び出し ---
        response = requests.get(api_url, params=params)
        response.raise_for_status()
        data = response.json()

        # --- 4. APIレスポンスを加工・整形 ---
        results = data.get('results', {})
        all_shops = results.get('shop', [])

        # 全ての店舗に対して、現在地からの距離を計算して追加
        if lat is not None and lng is not None:
            for shop in all_shops:
                shop_lat = float(shop['lat'])
                shop_lng = float(shop['lng'])
                distance_km = haversine_distance(lat, lng, shop_lat, shop_lng)
                shop['distance_m'] = round(distance_km * 1000)
        
        # 「距離の近い順」が指定されていれば、計算した距離でソート
        if sort_by == 'distance':
            all_shops.sort(key=lambda x: x.get('distance_m', float('inf')))

        # ページネーション情報を計算
        total_results = int(results.get('results_available', 0))
        total_pages = (total_results + count - 1) // count

        # --- 5. フロントエンドに返す最終的なJSONデータを組み立て ---
        response_data = {
            'shops': all_shops,
            'pagination': {
                'total_results': total_results,
                'total_pages': total_pages,
                'current_page': page
            }
        }
        return jsonify(response_data)

    except Exception as e:
        # 予期せぬエラーが発生した場合、ログを出力し、汎用的なエラーメッセージを返す
        print(f"Error in api_search: {e}")
        return jsonify({'error': 'An unexpected error occurred.'}), 500
