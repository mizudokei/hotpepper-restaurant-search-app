import * as api from './modules/api.js';
import * as map from './modules/map.js';
import * as ui from './modules/ui.js';

document.addEventListener('DOMContentLoaded', () => {
    L.Icon.Default.imagePath = 'https://unpkg.com/leaflet@1.9.4/dist/images/';

    // --- HTML要素の取得 ---
    const searchBtn = document.getElementById('search-btn');
    const latInput = document.getElementById('lat');
    const lngInput = document.getElementById('lng');
    const pinsViewBtn = document.getElementById('view-mode-pins');
    const heatmapViewBtn = document.getElementById('view-mode-heatmap');
    const searchFormElements = {
        range: document.getElementById('range'),
        keyword: document.getElementById('keyword'),
        sortOrder: document.getElementById('sort-order'),
        budget: document.getElementById('budget'),
        genres: () => document.querySelectorAll('input[name="genre"]:checked'),
        specialCategories: () => document.querySelectorAll('input[name="special_category"]:checked'),
    };
    let currentShops = []; // 現在の店舗リストを保持する変数
    loadSearchCriteria();

    // --- イベントリスナーの設定 ---
    searchBtn.addEventListener('click', () => {
        latInput.value = '';
        lngInput.value = '';
        handleSearch(1);
    });

    pinsViewBtn.addEventListener('click', () => {
        map.setMapView('pins');
        pinsViewBtn.classList.add('active');
        heatmapViewBtn.classList.remove('active');
    });

    heatmapViewBtn.addEventListener('click', () => {
        map.setMapView('heatmap');
        heatmapViewBtn.classList.add('active');
        pinsViewBtn.classList.remove('active');
    });

    ui.setupEventListeners(
        () => { /* onWidenSearch */
            const currentRangeIndex = searchFormElements.range.selectedIndex;
            if (currentRangeIndex < searchFormElements.range.options.length - 1) {
                searchFormElements.range.selectedIndex = currentRangeIndex + 1;
                handleSearch(1);
            }
        },
        () => { /* onClearFilters */
            searchFormElements.keyword.value = '';
            document.querySelectorAll('input[name="genre"]:checked').forEach(cb => cb.checked = false);
            document.querySelectorAll('input[name="special_category"]:checked').forEach(cb => cb.checked = false);
            searchFormElements.budget.value = '';
            handleSearch(1);
        },
        (shopId) => { /* onMapLinkClick */
            map.highlightMarker(shopId);
            ui.highlightListItem(shopId);
            document.getElementById('map').scrollIntoView({ behavior: 'smooth' });
        }
    );

    /**
     * 検索処理の全体の流れを制御する
     */
    async function handleSearch(page = 1) {
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
        saveSearchCriteria();
        ui.toggleLoading(true);
        ui.showMessage('');

        const lat = latInput.value;
        const lng = lngInput.value;
        map.setupMap(lat, lng);
        const radiusMeters = [300, 500, 1000, 2000, 3000][searchFormElements.range.value - 1];
        map.drawSearchRadius(lat, lng, radiusMeters);

        const params = buildSearchParams(page);

        try {
            const data = await api.fetchRestaurants(params);
            currentShops = data.shops; // 取得した店舗リストを保持

            const onPopupButtonClick = (shopId) => {
                ui.highlightListItem(shopId);
            };
            const onRouteButtonClick = (shopId) => {
                const shop = currentShops.find(s => s.id === shopId);
                const currentLocation = { lat: latInput.value, lng: lngInput.value };
                if (shop && currentLocation.lat) {
                    map.drawRoute(shop, currentLocation);
                }
            };

            map.renderMapData(data.shops, onPopupButtonClick, onRouteButtonClick);
            ui.renderShops(data.shops, searchFormElements);
            ui.renderPagination(data.pagination, handleSearch);
        } catch (error) {
            console.error('An error occurred during rendering:', error);
            ui.showMessage('結果の表示中にエラーが発生しました。');
        } finally {
            ui.toggleLoading(false);
        }
    }

    /**
     * Geolocation APIをPromiseでラップする
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
        const criteria = {
            range: searchFormElements.range.value,
            keyword: searchFormElements.keyword.value,
            sort_by: searchFormElements.sortOrder.value,
            budget: searchFormElements.budget.value,
            genres: Array.from(searchFormElements.genres()).map(cb => cb.value),
            special_categories: Array.from(searchFormElements.specialCategories()).map(cb => cb.value),
        };
        localStorage.setItem('restaurantSearchCriteria', JSON.stringify(criteria));
    }

    /**
     * ローカルストレージから検索条件を読み込み、フォームに反映
     */
    function loadSearchCriteria() {
        const savedCriteria = localStorage.getItem('restaurantSearchCriteria');
        if (savedCriteria) {
            const criteria = JSON.parse(savedCriteria);
            searchFormElements.range.value = criteria.range || '3';
            searchFormElements.keyword.value = criteria.keyword || '';
            searchFormElements.sortOrder.value = criteria.sort_by || '4';
            searchFormElements.budget.value = criteria.budget || '';
            if (criteria.genres && criteria.genres.length > 0) {
                document.querySelectorAll('input[name="genre"]').forEach(checkbox => {
                    if (criteria.genres.includes(checkbox.value)) checkbox.checked = true;
                });
            }
            if (criteria.special_categories && criteria.special_categories.length > 0) {
                document.querySelectorAll('input[name="special_category"]').forEach(checkbox => {
                    if (criteria.special_categories.includes(checkbox.value)) checkbox.checked = true;
                });
            }
        }
    }
});
