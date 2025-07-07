import pytest
import sys
import os
from unittest.mock import Mock, patch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app

# ==============================================================================
# Pytestフィクスチャの定義
# - @pytest.fixtureデコレータを付けた関数は「フィクスチャ」と呼ばれ、
#   各テスト関数の実行前に、準備や後片付けの処理を行うための仕組みです。
# ==============================================================================

@pytest.fixture
def app():
    """
    テスト用のFlaskアプリケーションインスタンスを生成し、セットアップします。
    この関数は、各テストが実行されるたびに呼び出されます。
    """
    # アプリケーションファクトリを使い、テスト用の設定でアプリを生成
    app = create_app()
    app.config.update({
        "TESTING": True,  # これをTrueにすると、Flaskがテストモードで動作します。
    })

    # yieldキーワードを使うことで、テストの実行後に後片付け処理を行うことも可能です。
    # 今回は後片付けは不要なので、appオブジェクトを返すだけです。
    yield app

@pytest.fixture
def client(app):
    """
    テスト用のクライアントを生成します。
    このクライアントを通じて、実際にHTTPリクエストを送信するのと同様の操作ができます。
    引数に 'app' を指定することで、上記のappフィクスチャが自動的に実行され、
    その返り値（Flaskアプリインスタンス）が渡されます。
    """
    return app.test_client()


# ==============================================================================
# テスト関数の定義
# - 関数名が `test_` で始まる関数は、pytestによって自動的にテスト対象として認識されます。
# ==============================================================================

def test_api_search_success(client):
    """
    /api/searchエンドポイントの正常系テスト
    - 必須パラメータを付けてリクエストした際に、200 OKが返ってくるか
    - レスポンスが正しいJSON形式で、期待されるキーを持っているか
    を検証します。
    """
    # テスト用のクエリパラメータを定義
    query_params = {
        'lat': 35.681236,  # 東京駅の緯度
        'lng': 139.767125, # 東京駅の経度
        'range': 3         # 検索範囲
    }

    # テストクライアントを使い、/api/searchエンドポイントにGETリクエストを送信
    response = client.get('/api/search', query_string=query_params)

    # --- アサーション（検証） ---
    # assert文は、続く条件がTrueでなければテストを失敗させます。

    # 1. HTTPステータスコードが200 (OK) であることを検証
    assert response.status_code == 200

    # 2. レスポンスのコンテントタイプがJSONであることを検証
    assert response.content_type == 'application/json'

    # 3. レスポンスボディがJSONとしてパースでき、主要なキーが存在することを検証
    json_data = response.get_json()
    assert 'shops' in json_data
    assert 'pagination' in json_data
    assert isinstance(json_data['shops'], list) # 'shops'の値がリスト型であること
    assert isinstance(json_data['pagination'], dict) # 'pagination'の値が辞書型であること

def test_api_search_failure_missing_params(client):
    """
    /api/searchエンドポイントの異常系テスト
    - 必須パラメータ（緯度・経度）を付けずにリクエストした際に、400 Bad Requestが返ってくることを検証します。
    """
    # 緯度と経度を意図的に含めないクエリパラメータ
    query_params = {
        'range': 3
    }

    response = client.get('/api/search', query_string=query_params)

    # ステータスコードが400 (Bad Request) であることを検証
    assert response.status_code == 400

@pytest.mark.parametrize("invalid_params", [
    ({'lat': 35.68, 'lng': 139.76, 'range': 'abc'}),  # rangeに文字列
    ({'lat': 'xyz', 'lng': 139.76, 'range': 3}),      # latに文字列
    ({'lat': 35.68, 'lng': 'pqr', 'range': 3}),      # lngに文字列
])
def test_api_search_failure_invalid_param_type(client, invalid_params):
    """
    /api/searchエンドポイントの異常系テスト（不正なパラメータ型）
    - 不正なデータ型のパラメータでリクエストした際に、
      400 Bad Requestが返ってくることを検証します。
    - @pytest.mark.parametrize を使うことで、複数のテストパターンを効率的に実行できます。
    """
    response = client.get('/api/search', query_string=invalid_params)
    assert response.status_code == 400

@patch('app.api.routes.requests.get') # 'requests.get'をモック（偽物）に置き換える
def test_sort_by_distance(mock_requests_get, client):
    """
    「距離の近い順」ソートが正しく機能するかを検証します。
    - なぜモックを使うのか？
      外部のホットペッパーAPIに実際に接続すると、テストが不安定になったり、
      APIの利用回数制限に達したりする問題があります。
      モックを使って「偽のAPIレスポンス」を定義することで、外部環境に依存しない、
      安定した高速なテストが可能になります。
    """
    # --- 1. モックの準備 ---
    # 偽のAPIレスポンスを定義します。
    # shop2（近い店）がshop1（遠い店）より後に来るように定義するのがポイントです。
    mock_response_data = {
        "results": {
            "shop": [
                {"id": "shop1", "name": "遠い店", "lat": 36.0, "lng": 140.0},
                {"id": "shop2", "name": "近い店", "lat": 35.7, "lng": 139.8}
            ],
            "results_available": "2"
        }
    }
    # mock_requests_getが呼ばれたら、この偽のレスポンスを返すように設定
    mock_requests_get.return_value = Mock(status_code=200)
    mock_requests_get.return_value.json.return_value = mock_response_data

    # --- 2. テストの実行 ---
    # ユーザーの現在地（東京駅）と、sort_by=distanceパラメータを指定
    query_params = {
        'lat': 35.681236,
        'lng': 139.767125,
        'range': 5,
        'sort_by': 'distance'
    }
    response = client.get('/api/search', query_string=query_params)

    # --- 3. アサーション（検証） ---
    assert response.status_code == 200
    json_data = response.get_json()
    shops = json_data['shops']

    # 返ってきた店舗リストが2件であることを確認
    assert len(shops) == 2
    # 1件目の店舗が「近い店」であることを確認
    assert shops[0]['name'] == "近い店"
    # 2件目の店舗が「遠い店」であることを確認
    assert shops[1]['name'] == "遠い店"
    # 1件目の距離が、2件目の距離以下であることを確認（ソートされていることの証明）
    assert shops[0]['distance_m'] <= shops[1]['distance_m']

@patch('app.api.routes.requests.get')
def test_all_filters_are_passed_to_api(mock_requests_get, client):
    """
    すべての検索フィルターが、正しくAPIリクエストパラメータに変換されるかを検証します。
    """
    # --- 1. モックの準備 ---
    # このテストではAPIのレスポンス内容は重要ではないため、空のレスポンスを返すように設定
    mock_requests_get.return_value.status_code = 200
    mock_requests_get.return_value.json.return_value = {"results": {"shop": []}}

    # --- 2. テストの実行 ---
    # フロントエンドから送られてくる、すべての検索条件を含んだクエリパラメータ
    query_params = {
        'lat': 35.68,
        'lng': 139.76,
        'range': 3,
        'keyword': 'ラーメン　個室', # 複数ワード
        'genre': 'G013,G001',      # 複数ジャンル
        'special_category': 'SC01',
        'budget': 'B003',
        'sort_by': '4'             # おすすめ順
    }
    client.get('/api/search', query_string=query_params)

    # --- 3. アサーション（検証） ---
    # 'requests.get'が、期待されるパラメータで呼び出されたかを確認します。

    # 期待されるAPIパラメータを定義
    expected_api_params = {
        'lat': 35.68,
        'lng': 139.76,
        'range': 3,
        'start': 1,
        'count': 10,
        'format': 'json',
        'keyword': 'ラーメン+個室', # スペースが+に変換されていること
        'genre': 'G013,G001',
        'special_category': 'SC01',
        'budget': 'B003',
        'order': '4' # sort_byがorderに変換されていること
    }

    # 'requests.get'が1回だけ呼び出されたことを確認
    mock_requests_get.assert_called_once()
    # 呼び出された際の引数を取得
    actual_args, actual_kwargs = mock_requests_get.call_args
    actual_params = actual_kwargs.get('params', {})
    
    # APIキーはテスト実行環境に依存するため、チェック対象から除外
    actual_params.pop('key', None)

    # 実際にAPIに渡されたパラメータが、期待通りであることを検証
    assert actual_params == expected_api_params
