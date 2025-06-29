# app/routes.py

from flask import Blueprint, render_template, request, current_app
import requests

bp = Blueprint('main', __name__)

@bp.route('/')
def index():
    return render_template('index.html')

@bp.route('/search')
def search():
    
    page = request.args.get('page', 1, type=int)
    
    count = 10 
    
    start = (page - 1) * count + 1

    lat = request.args.get('lat')
    lng = request.args.get('lng')
    range_code = request.args.get('range')

    api_key = current_app.config['API_KEY']
    api_url = 'http://webservice.recruit.co.jp/hotpepper/gourmet/v1/'

    params = {
        'key': api_key,
        'lat': lat,
        'lng': lng,
        'range': range_code,
        'order': 4,
        'start': start,   
        'count': count,   
        'format': 'json'
    }

    response = requests.get(api_url, params=params)
    response.raise_for_status()
    search_result = response.json()

    shops = search_result['results'].get('shop', [])
    
    
    total_results = int(search_result['results'].get('results_available', 0))
    
    total_pages = (total_results + count - 1) // count


    return render_template(
        'results.html',
        shops=shops,
        page=page,
        total_pages=total_pages,
        lat=lat,
        lng=lng,
        search_range=range_code
    )

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