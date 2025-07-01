// 各モジュールから、exportされた関数をインポート
import * as api from './modules/api.js';
import * as map from './modules/map.js';
import * as ui from './modules/ui.js';

/**
 * DOMの読み込みが完了した後に、すべての処理を開始
 */
document.addEventListener('DOMContentLoaded', () => {
    // Leafletの画像パスを設定
    L.Icon.Default.imagePath = 'https://unpkg.com/leaflet@1.9.4/dist/images/';

    // --- HTML要素の取得 ---
    const searchBtn = document.getElementById('search-btn');
    const latInput = document.getElementById('lat');
    const lngInput = document.getElementById('lng');
    // 検索フォームの各要素をまとめてオブジェクトとして管理
    const searchFormElements = {
        range: document.getElementById('range'),
        keyword: document.getElementById('keyword'),
        sortOrder: document.getElementById('sort-order'),
        budget: document.getElementById('budget'),
        // チェックボックスは都度取得するため、関数として定義
        genres: () => document.querySelectorAll('input[name="genre"]:checked'),
        specialCategories: () => document.querySelectorAll('input[name="special_category"]:checked'),
    };

    /**
     * 「現在地で検索」ボタンのクリックイベント
     */
    searchBtn.addEventListener('click', () => {
        latInput.value = '';
        lngInput.value = '';
        handleSearch(1); // 1ページ目から新規検索
    });

    /**
     * 検索処理の全体の流れを制御する
     * @param {number} page - 検索するページ番号
     */
    async function handleSearch(page = 1) {
        // --- 1. 位置情報を取得 (まだなければ) ---
        try {
            if (!latInput.value || !lngInput.value) {
                ui.toggleLoading(true);
                const position = await getCurrentPosition();
                latInput.value = position.coords.latitude;
                lngInput.value = position.coords.longitude;
            }
        } catch (error) {
            ui.showMessage(error.message);
            ui.toggleLoading(false);
            return;
        }
        
        ui.toggleLoading(true);
        ui.showMessage(''); // 既存の結果をクリア

        // --- 2. 地図のセットアップ ---
        map.setupMap(latInput.value, lngInput.value);
        
        // --- 3. 検索パラメータの組み立て ---
        const params = buildSearchParams(page);

        // --- 4. API呼び出しと結果描画 ---
        try {
            const data = await api.fetchRestaurants(params);
            map.renderMarkers(data.shops);
            ui.renderShops(data.shops);
            // ページネーション描画時、クリック時のコールバックとして再度handleSearchを渡す
            ui.renderPagination(data.pagination, handleSearch);
        } catch (error) {
            ui.showMessage('レストランの検索に失敗しました。');
        } finally {
            ui.toggleLoading(false);
        }
    }

    /**
     * Geolocation APIをPromiseでラップし、async/awaitで扱えるようにする
     * @returns {Promise<GeolocationPosition>}
     */
    function getCurrentPosition() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                return reject(new Error('お使いのブラウザは位置情報機能に対応していません。'));
            }
            navigator.geolocation.getCurrentPosition(resolve, (err) => {
                let message = '';
                switch (err.code) {
                    case err.PERMISSION_DENIED: message = '位置情報の利用が許可されていません。'; break;
                    case err.POSITION_UNAVAILABLE: message = '位置情報を取得できませんでした。'; break;
                    case err.TIMEOUT: message = '位置情報の取得がタイムアウトしました。'; break;
                    default: message = '不明なエラーが発生しました。'; break;
                }
                reject(new Error(message));
            });
        });
    }

    /**
     * 現在のフォーム入力値から検索パラメータを組み立てる
     * @param {number} page - ページ番号
     * @returns {URLSearchParams}
     */
    function buildSearchParams(page) {
        const params = new URLSearchParams({
            lat: latInput.value,
            lng: lngInput.value,
            page: page,
            range: searchFormElements.range.value,
            sort_by: searchFormElements.sortOrder.value,
        });
        if (searchFormElements.keyword.value) {
            params.append('keyword', searchFormElements.keyword.value);
        }
        if (searchFormElements.budget.value) {
            params.append('budget', searchFormElements.budget.value);
        }
        const checkedGenres = Array.from(searchFormElements.genres()).map(cb => cb.value);
        if (checkedGenres.length > 0) {
            params.append('genre', checkedGenres.join(','));
        }
        const checkedSpecialCategories = Array.from(searchFormElements.specialCategories()).map(cb => cb.value);
        if (checkedSpecialCategories.length > 0) {
            params.append('special_category', checkedSpecialCategories.join(','));
        }
        return params;
    }
});
