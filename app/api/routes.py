"""
レストラン検索APIのエンドポイントを定義するFlask Blueprint。
ホットペッパーグルメサーチAPIと連携し、検索機能を提供します。
"""
from math import atan2, cos, radians, sin, sqrt
from typing import Dict, Any

import requests
from flask import Blueprint, jsonify, current_app, request
from requests import RequestException

# ==============================================================================
# Blueprintの定義
# ==============================================================================
bp = Blueprint('api', __name__, url_prefix='/api')


# ==============================================================================
# ヘルパー関数
# ==============================================================================

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    2点の緯度経度から、ハバーサイン公式を用いて球面上の距離(km)を計算します。

    Args:
        lat1 (float): 地点1の緯度。
        lon1 (float): 地点1の経度。
        lat2 (float): 地点2の緯度。
        lon2 (float): 地点2の経度。

    Returns:
        float: 2点間の距離 (km)。
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
# API Route Definitions
# ==============================================================================

@bp.route('/search')
def search() -> tuple[Dict[str, Any], int]:
    """
    レストラン情報を検索するAPIエンドポイント。
    フロントエンドからのクエリパラメータに基づきホットペッパーAPIを呼び出し、
    距離計算などの追加処理を行った上で結果を返します。

    Query Parameters:
        page (int): ページ番号 (デフォルト: 1)。
        lat (float): 検索中心の緯度 (必須)。
        lng (float): 検索中心の経度 (必須)。
        range (int): 検索範囲コード (1:300m, 2:500m, 3:1000m, 4:2000m, 5:3000m)。
        keyword (str): フリーワード検索。
        genre (str): ジャンルコード。
        special_category (str): こだわりカテゴリコード。
        sort_by (str): ソート順 ('distance'など)。
        budget (str): 予算コード。

    Returns:
        A tuple containing a JSON response and an HTTP status code.
    """
    try:
        # --- 1. リクエストからクエリパラメータを安全に取得 ---
        try:
            page = int(request.args.get('page', 1))
            lat = float(request.args.get('lat'))
            lng = float(request.args.get('lng'))
            range_code = int(request.args.get('range', 1))
        except (TypeError, ValueError):
            return jsonify({'error': '緯度、経度、または検索範囲が無効な形式です。'}), 400

        keyword = request.args.get('keyword', type=str)
        genre = request.args.get('genre', type=str)
        special_category = request.args.get('special_category', type=str)
        sort_by = request.args.get('sort_by')
        budget = request.args.get('budget', type=str)
        count = 10  # 1ページあたりの表示件数
        start = (page - 1) * count + 1

        # --- 2. APIリクエストのパラメータを構築 ---
        params = {
            'key': current_app.config['API_KEY'],
            'lat': lat,
            'lng': lng,
            'range': range_code,
            'start': start,
            'count': count,
            'format': 'json'
        }

        # 検索キーワードがあれば、全角スペースを半角に変換し、単語ごとに分割して追加
        if keyword:
            normalized_keyword = keyword.replace('　', ' ')
            words = [word for word in normalized_keyword.split(' ') if word]
            if words:
                params['keyword'] = '+'.join(words)

        if genre:
            params['genre'] = genre
        if budget:
            params['budget'] = budget
        if special_category:
            params['special_category'] = special_category

        # ホットペッパーAPIのソート順（4: おすすめ順）が指定された場合
        if sort_by == '4':
            params['order'] = '4'

        # --- 3. ホットペッパーAPIを実行 ---
        api_url = 'http://webservice.recruit.co.jp/hotpepper/gourmet/v1/'
        response = requests.get(api_url, params=params)
        response.raise_for_status()  # HTTPエラーがあれば例外を発生
        data = response.json()

        # --- 4. APIレスポンスを加工 ---
        results = data.get('results', {})
        all_shops = results.get('shop', [])

        # 各店舗への距離を計算して追加
        for shop in all_shops:
            shop_lat = float(shop['lat'])
            shop_lng = float(shop['lng'])
            distance_km = haversine_distance(lat, lng, shop_lat, shop_lng)
            shop['distance_m'] = round(distance_km * 1000)

        # 「距離の近い順」が指定された場合、API結果をサーバーサイドでソート
        if sort_by == 'distance':
            all_shops.sort(key=lambda x: x.get('distance_m', float('inf')))

        # --- 5. フロントエンド向けの最終的なJSONデータを構築 ---
        total_results = int(results.get('results_available', 0))
        total_pages = (total_results + count - 1) // count

        response_data = {
            'shops': all_shops,
            'pagination': {
                'total_results': total_results,
                'total_pages': total_pages,
                'current_page': page
            }
        }
        return jsonify(response_data), 200

    except RequestException as e:
        # API通信関連のエラー
        current_app.logger.error(f"API request failed: {e}")
        return jsonify({'error': '外部APIへの接続に失敗しました。'}), 503

    except Exception as e:
        # 予期せぬサーバー内部エラー
        current_app.logger.error(f"An unexpected error occurred in search endpoint: {e}")
        return jsonify({'error': 'サーバー内部で予期せぬエラーが発生しました。'}), 500