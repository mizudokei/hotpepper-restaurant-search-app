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
    loadSearchCriteria();

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

        saveSearchCriteria(); // 検索条件を保存

        ui.toggleLoading(true);
        ui.showMessage(''); // 既存の結果をクリア

        // --- 2. 地図のセットアップ ---
        const lat = latInput.value
        const lng = lngInput.value;
        map.setupMap(lat, lng);

        // 選択された半径コードをメートルに変換
        const radiusMeters = [300, 500, 1000, 2000, 3000][searchFormElements.range.value - 1];
        // mapモジュールに円の描画を指示
        map.drawSearchRadius(lat, lng, radiusMeters);

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

    /**
     * 検索条件をローカルストレージに保存
     */
    function saveSearchCriteria() {
        // 保存する条件をオブジェクトとしてまとめる
        const criteria = {
            range: searchFormElements.range.value,
            keyword: searchFormElements.keyword.value,
            sort_by: searchFormElements.sortOrder.value,
            budget: searchFormElements.budget.value,
            genres: Array.from(searchFormElements.genres()).map(cb => cb.value),
            special_categories: Array.from(searchFormElements.specialCategories()).map(cb => cb.value),
        };
        // オブジェクトをJSON文字列に変換してlocalStorageに保存
        localStorage.setItem('restaurantSearchCriteria', JSON.stringify(criteria));
    }

    /**
     * ローカルストレージから検索条件を読み込み、フォームに反映
     */
    function loadSearchCriteria() {
        const savedCriteria = localStorage.getItem('restaurantSearchCriteria');
        if (savedCriteria) {
            const criteria = JSON.parse(savedCriteria);

            // 各フォーム要素に値を設定
            searchFormElements.range.value = criteria.range || '3';
            searchFormElements.keyword.value = criteria.keyword || '';
            searchFormElements.sortOrder.value = criteria.sort_by || '4';
            searchFormElements.budget.value = criteria.budget || '';

            // チェックボックスの状態を復元
            if (criteria.genres && criteria.genres.length > 0) {
                document.querySelectorAll('input[name="genre"]').forEach(checkbox => {
                    if (criteria.genres.includes(checkbox.value)) {
                        checkbox.checked = true;
                    }
                });
            }
            if (criteria.special_categories && criteria.special_categories.length > 0) {
                document.querySelectorAll('input[name="special_category"]').forEach(checkbox => {
                    if (criteria.special_categories.includes(checkbox.value)) {
                        checkbox.checked = true;
                    }
                });
            }
        }
    }
});
