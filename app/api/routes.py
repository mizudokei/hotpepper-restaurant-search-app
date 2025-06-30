from flask import Blueprint, request, current_app, jsonify
from math import radians, sin, cos, sqrt, atan2
import requests

# 'api'という名前の新しいBlueprintを作成
bp = Blueprint('api', __name__, url_prefix='/api')

def haversine_distance(lat1, lon1, lat2, lon2):
    """ 2点間の緯度経度から距離(km)を計算する """
    R = 6371.0  # 地球の半径 (km)
    lat1_rad, lon1_rad, lat2_rad, lon2_rad = map(radians, [lat1, lon1, lat2, lon2])
    dlon = lon2_rad - lon1_rad
    dlat = lat2_rad - lat1_rad
    a = sin(dlat / 2)**2 + cos(lat1_rad) * cos(lat2_rad) * sin(dlon / 2)**2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    distance = R * c
    return distance

@bp.route('/search')
def search():
    try:
        page = request.args.get('page', 1, type=int)
        lat = request.args.get('lat', type=float)
        lng = request.args.get('lng', type=float)
        range_code = request.args.get('range', 1, type=int)
        keyword = request.args.get('keyword', type=str)
        genre = request.args.get('genre', type=str)
        special_category = request.args.get('special_category', type=str)
        sort_by = request.args.get('sort_by')
        budget = request.args.get('budget', type=str)
        count = 10
        start = (page - 1) * count + 1

        if lat is None or lng is None:
            return jsonify({'error': 'Latitude and longitude are required.'}), 400

        api_key = current_app.config['API_KEY']
        api_url = 'http://webservice.recruit.co.jp/hotpepper/gourmet/v1/'
        params = {
            'key': api_key, 'lat': lat, 'lng': lng, 'range': range_code,
            'start': start, 'count': count, 'format': 'json'
        }
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

        response = requests.get(api_url, params=params)
        response.raise_for_status()
        data = response.json()

        results = data.get('results', {})
        all_shops = results.get('shop', [])

        if lat is not None and lng is not None:
            for shop in all_shops:
                shop_lat = float(shop['lat'])
                shop_lng = float(shop['lng'])
                distance_km = haversine_distance(lat, lng, shop_lat, shop_lng)
                shop['distance_m'] = round(distance_km * 1000)
        
        if sort_by == 'distance':
            all_shops.sort(key=lambda x: x.get('distance_m', float('inf')))

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
        return jsonify(response_data)

    except Exception as e:
        print(f"Error in api_search: {e}")
        return jsonify({'error': 'An unexpected error occurred.'}), 500