# app/routes.py

from flask import Blueprint, render_template, request, current_app, jsonify
import requests

bp = Blueprint('main', __name__)

@bp.route('/')
def index():
    return render_template('index.html')

@bp.route('/api/search')
def api_search():
    try:
        page = request.args.get('page', 1, type=int)
        lat = request.args.get('lat', type=float)
        lng = request.args.get('lng', type=float)
        range_code = request.args.get('range', 1, type=int)
        count = 10
        start = (page - 1) * count + 1

        if lat is None or lng is None:
            return jsonify({'error': 'Latitude and longitude are required.'}), 400

        api_key = current_app.config['API_KEY']
        api_url = 'http://webservice.recruit.co.jp/hotpepper/gourmet/v1/'
        params = {
            'key': api_key,
            'lat': lat,
            'lng': lng,
            'range': range_code,
            'start': start,
            'count': count,
            'format': 'json'
        }

        response = requests.get(api_url, params=params)
        response.raise_for_status()
        data = response.json()

        total_results = int(data['results'].get('results_available', 0))
        total_pages = (total_results + count - 1) // count

        response_data = {
            'shops': data['results'].get('shop', []),
            'pagination': {
                'total_results': total_results,
                'total_pages': total_pages,
                'current_page': page
            }
        }
        return jsonify(response_data)

    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'API request failed: {e}'}), 500
    except Exception as e:
        return jsonify({'error': f'An unexpected error occurred: {e}'}), 500

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