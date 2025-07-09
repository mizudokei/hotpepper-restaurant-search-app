"""
APIエンドポイント `/api/search` の単体テストを定義するモジュール。

このテストでは、Flaskのテストクライアントを使用してAPIリクエストをシミュレートし、
正常系、異常系のレスポンス、およびサーバーサイドのロジック（ソート機能など）が
期待通りに動作することを検証します。
"""

import os
import sys
from unittest.mock import Mock, patch

import pytest

# プロジェクトのルートディレクトリをシステムパスに追加
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app

# ==============================================================================
# Fixtures
# - テスト関数が利用する共通のセットアップ処理を定義します。
# ==============================================================================

@pytest.fixture
def app():
    """テスト用のFlaskアプリケーションインスタンスを生成するフィクスチャ。"""
    app = create_app()
    app.config.update({
        "TESTING": True,  # Flaskをテストモードで動作させる
    })
    yield app

@pytest.fixture
def client(app):
    """テスト用のHTTPクライアントを生成するフィクスチャ。"""
    return app.test_client()


# ==============================================================================
# テストケース
# ==============================================================================

# --- 正常系テスト ---

def test_api_search_success(client):
    """
    正常系: /api/searchエンドポイントが必須パラメータで正しく動作するかを検証。
    """
    # Arrange: テスト用のクエリパラメータを準備
    query_params = {
        'lat': 35.681236,  # 東京駅の緯度
        'lng': 139.767125, # 東京駅の経度
        'range': 3
    }

    # Act: テストクライアントでAPIリクエストを送信
    response = client.get('/api/search', query_string=query_params)

    # Assert: レスポンスが期待通りであることを検証
    assert response.status_code == 200
    assert response.content_type == 'application/json'
    json_data = response.get_json()
    assert 'shops' in json_data
    assert 'pagination' in json_data
    assert isinstance(json_data['shops'], list)
    assert isinstance(json_data['pagination'], dict)

# --- 異常系テスト ---

def test_api_search_failure_missing_params(client):
    """
    異常系: 必須パラメータ（緯度・経度）欠落時に400エラーが返ることを検証。
    """
    # Arrange: 必須パラメータが欠けたクエリ
    query_params = {'range': 3}

    # Act: APIリクエストを送信
    response = client.get('/api/search', query_string=query_params)

    # Assert: ステータスコードが400 (Bad Request) であることを検証
    assert response.status_code == 400

@pytest.mark.parametrize(
    "invalid_params, test_id",
    [
        ({'lat': 35.68, 'lng': 139.76, 'range': 'abc'}, "invalid_range_type"),
        ({'lat': 'xyz', 'lng': 139.76, 'range': 3}, "invalid_lat_type"),
        ({'lat': 35.68, 'lng': 'pqr', 'range': 3}, "invalid_lng_type"),
    ],
    ids=lambda param: param[1] # テスト結果にtest_idを表示する
)
def test_api_search_failure_invalid_param_type(client, invalid_params, test_id):
    """
    異常系: パラメータの型が不正な場合に400エラーが返ることを検証。
    @parametrizeにより、複数のテストパターンを効率的に実行します。
    """
    # Arrange: パラメータはフィクスチャから提供される

    # Act: APIリクエストを送信
    response = client.get('/api/search', query_string=invalid_params)

    # Assert: ステータスコードが400 (Bad Request) であることを検証
    assert response.status_code == 400

# --- 機能別テスト ---

@patch('app.api.routes.requests.get')
def test_sort_by_distance(mock_requests_get, client):
    """
    機能検証: 「距離の近い順」ソートが正しく機能するかを検証。
    外部APIへの依存をなくすため、requests.getをモック化します。
    """
    # Arrange: モック（偽のAPIレスポンス）を準備
    # 近い店(shop2)が遠い店(shop1)より後に来るように定義し、ソートが機能するかを確認
    mock_response_data = {
        "results": {
            "shop": [
                {"id": "shop1", "name": "遠い店", "lat": 36.0, "lng": 140.0},
                {"id": "shop2", "name": "近い店", "lat": 35.7, "lng": 139.8}
            ],
            "results_available": "2"
        }
    }
    mock_requests_get.return_value = Mock(status_code=200)
    mock_requests_get.return_value.json.return_value = mock_response_data

    # Arrange: 距離ソートを指定するクエリパラメータ
    query_params = {
        'lat': 35.681236,
        'lng': 139.767125,
        'range': 5,
        'sort_by': 'distance'
    }

    # Act: APIリクエストを送信
    response = client.get('/api/search', query_string=query_params)

    # Assert: レスポンスとソート結果を検証
    assert response.status_code == 200
    shops = response.get_json()['shops']
    assert len(shops) == 2
    assert shops[0]['name'] == "近い店"
    assert shops[1]['name'] == "遠い店"
    assert shops[0]['distance_m'] <= shops[1]['distance_m']

@patch('app.api.routes.requests.get')
def test_all_filters_are_passed_to_api(mock_requests_get, client):
    """
    機能検証: すべての検索フィルターがAPIリクエストパラメータに正しく変換されるか。
    """
    # Arrange: モックを準備 (レスポンス内容は問わない)
    mock_requests_get.return_value = Mock(status_code=200)
    mock_requests_get.return_value.json.return_value = {"results": {"shop": []}}

    # Arrange: すべてのフィルターを含むクエリパラメータ
    query_params = {
        'lat': 35.68, 'lng': 139.76, 'range': 3,
        'keyword': 'ラーメン　個室',
        'genre': 'G013,G001',
        'special_category': 'SC01',
        'budget': 'B003',
        'sort_by': '4'
    }

    # Act: APIリクエストを送信
    client.get('/api/search', query_string=query_params)

    # Assert: 外部APIが期待されるパラメータで呼び出されたことを検証
    expected_api_params = {
        'lat': 35.68, 'lng': 139.76, 'range': 3,
        'start': 1, 'count': 10, 'format': 'json',
        'keyword': 'ラーメン+個室',          # スペースが+に変換されている
        'genre': 'G013,G001',
        'special_category': 'SC01',
        'budget': 'B003',
        'order': '4'                       # sort_byがorderに変換されている
    }

    mock_requests_get.assert_called_once() # APIが1回だけ呼ばれたことを確認
    actual_args, actual_kwargs = mock_requests_get.call_args
    actual_params = actual_kwargs.get('params', {})

    # APIキーは環境に依存するため、比較対象から除外
    actual_params.pop('key', None)

    assert actual_params == expected_api_params