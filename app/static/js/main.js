/**
 * @file レストラン検索アプリケーションのメインロジック。
 * ユーザー操作のイベントハンドリング、API連携、UIと地図の更新指示など、アプリケーション全体の中核機能を担当します。
 */

import * as api from './modules/api.js';
import * as map from './modules/map.js';
import * as ui from './modules/ui.js';

document.addEventListener('DOMContentLoaded', () => {
    // Leafletライブラリのアイコン画像のパスを設定
    L.Icon.Default.imagePath = 'https://unpkg.com/leaflet@1.9.4/dist/images/';

    // --- DOM要素の参照 ---
    const keywordInput = document.getElementById('keyword');
    const clearKeywordBtn = document.getElementById('clear-keyword-btn');
    const searchBtn = document.getElementById('search-btn');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    const latInput = document.getElementById('lat');
    const lngInput = document.getElementById('lng');

    // フィルター関連の要素を整理して保持
    const filters = {
        range: { input: document.getElementById('range'), display: document.getElementById('radius-display') },
        budget: { input: document.getElementById('budget'), display: document.getElementById('budget-display') },
        genre: { checkboxes: () => document.querySelectorAll('input[name="genre"]'), display: document.getElementById('genre-display') },
        specialCategory: { checkboxes: () => document.querySelectorAll('input[name="special_category"]'), display: document.getElementById('sc-display') }
    };

    // --- アプリケーションの状態 ---
    let currentShops = [];
    let currentSortBy = 'recommend';

    // ==========================================================================
    // 初期化処理
    // ==========================================================================

    /**
     * アプリケーションを初期化します。
     */
    async function initializeApp() {
        setupEventListeners();
        loadSearchCriteria();
        try {
            // 現在地を取得し、緯度経度をフォームと地図に設定
            const position = await getCurrentPosition();
            latInput.value = position.coords.latitude;
            lngInput.value = position.coords.longitude;
            map.setupMap(latInput.value, lngInput.value);
        } catch (error) {
            // エラーメッセージを地図エリアに表示
            const mapElement = document.getElementById('map');
            if (mapElement) mapElement.innerHTML = `<p class="error-message">${error.message}</p>`;
        }
    }

    // ==========================================================================
    // イベントリスナー設定
    // ==========================================================================

    /**
     * すべてのイベントリスナーをセットアップします。
     */
    function setupEventListeners() {
        // キーワード入力
        keywordInput.addEventListener('input', () => clearKeywordBtn.classList.toggle('hidden', !keywordInput.value));
        keywordInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleSearch(1); });
        clearKeywordBtn.addEventListener('click', () => {
            keywordInput.value = '';
            clearKeywordBtn.classList.add('hidden');
        });

        // 検索・クリアボタン
        searchBtn.addEventListener('click', () => handleSearch(1));
        clearFiltersBtn.addEventListener('click', clearAllFilters);

        // 絞り込みモーダルを開くトリガー
        document.querySelectorAll('.filter-trigger').forEach(trigger => {
            trigger.addEventListener('click', () => {
                const modalId = trigger.dataset.modalTarget;
                const modal = document.getElementById(modalId);
                if (!modal) return;
                // モーダルを開く前に現在の選択状態を反映
                if (modal.id === 'radius-modal') ui.updateSingleSelectList(modal.querySelector('ul'), filters.range.input.value);
                if (modal.id === 'budget-modal') ui.updateSingleSelectList(modal.querySelector('ul'), filters.budget.input.value);
                ui.openModal(modalId);
            });
        });

        // モーダル閉じるイベント
        const modalOverlay = document.getElementById('modal-overlay');
        if (modalOverlay) modalOverlay.addEventListener('click', ui.closeModal);
        document.querySelectorAll('.modal-close-btn').forEach(btn => btn.addEventListener('click', ui.closeModal));

        // 単一選択モーダル（半径、予算）の選択処理
        document.querySelectorAll('.modal-options-list').forEach(list => {
            list.addEventListener('click', (e) => {
                if (e.target.tagName !== 'LI') return;
                const modal = list.closest('.modal');
                const { value: selectedValue, text: selectedText } = e.target.dataset;

                if (modal.id === 'radius-modal') {
                    filters.range.input.value = selectedValue;
                    ui.updateTriggerDisplay(filters.range.display, selectedText);
                } else if (modal.id === 'budget-modal') {
                    filters.budget.input.value = selectedValue;
                    ui.updateTriggerDisplay(filters.budget.display, selectedText);
                }
                ui.closeModal();
            });
        });

        // 複数選択モーダル（ジャンル、こだわり）の決定ボタン処理
        document.querySelector('#genre-modal .modal-apply-btn')?.addEventListener('click', () => {
            const checked = Array.from(filters.genre.checkboxes()).filter(cb => cb.checked);
            ui.updateTriggerDisplay(filters.genre.display, checked.length > 0 ? `${checked.length}件選択` : null);
            ui.closeModal();
        });

        document.querySelector('#special-category-modal .modal-apply-btn')?.addEventListener('click', () => {
            const checked = Array.from(filters.specialCategory.checkboxes()).filter(cb => cb.checked);
            ui.updateTriggerDisplay(filters.specialCategory.display, checked.length > 0 ? `${checked.length}件選択` : null);
            ui.closeModal();
        });

        // 検索結果エリアのイベント（イベント委任）
        const resultsArea = document.getElementById('results-area');
        resultsArea.addEventListener('change', (e) => {
            if (e.target.id === 'sort-order') handleSortChange(e.target.value);
        });

        // 検索結果ゼロ件時の提案ボタン（イベント委任）
        // NOTE: ui.setupSuggestionListenersと一部機能が重複していますが、元の実装を維持しています。
        resultsArea.addEventListener('click', (e) => {
            if (e.target.id === 'widen-search-btn') {
                const rangeInput = filters.range.input;
                const currentRangeValue = parseInt(rangeInput.value, 10);
                if (currentRangeValue < 5) {
                    rangeInput.value = currentRangeValue + 1;
                    const rangeOption = document.querySelector(`#radius-modal li[data-value="${rangeInput.value}"]`);
                    if (rangeOption) ui.updateTriggerDisplay(filters.range.display, rangeOption.dataset.text);
                    handleSearch(1);
                }
            } else if (e.target.id === 'clear-filters-btn-no-results') {
                clearAllFilters();
                handleSearch(1);
            }
        });

        // 店舗リスト上の「地図」ボタンクリックイベント
        ui.setupResultListListener({
            onMapLinkClick: (shopId) => {
                map.highlightMarker(shopId);
                ui.highlightListItem(shopId);
                document.getElementById('map').scrollIntoView({ behavior: 'smooth' });
            }
        });

        // 結果ゼロ件画面の提案ボタン（範囲を広げる/フィルタークリア）
        ui.setupSuggestionListeners(
            () => { // 範囲を広げる
                const rangeInput = filters.range.input;
                const currentRangeValue = parseInt(rangeInput.value, 10);
                if (currentRangeValue < 5) {
                    rangeInput.value = currentRangeValue + 1;
                    const rangeOption = document.querySelector(`#radius-modal li[data-value="${rangeInput.value}"]`);
                    if (rangeOption) ui.updateTriggerDisplay(filters.range.display, rangeOption.dataset.text);
                    handleSearch(1);
                }
            },
            () => { // フィルターをクリア
                keywordInput.value = '';
                filters.budget.input.value = '';
                filters.genre.checkboxes().forEach(cb => cb.checked = false);
                filters.specialCategory.checkboxes().forEach(cb => cb.checked = false);
                handleSearch(1);
            }
        );
    }

    // ==========================================================================
    // イベントハンドラ
    // ==========================================================================

    /**
     * 検索を実行し、結果を表示します。
     * @param {number} [page=1] - 表示するページ番号。
     */
    async function handleSearch(page = 1) {
        if (!latInput.value || !lngInput.value) {
            ui.showMessage("現在地が取得できていません。ページの再読み込みをお試しください。");
            return;
        }

        saveSearchCriteria();
        ui.toggleLoading(true);
        ui.clearResults();

        // 地図を再設定し、検索範囲を描画
        const { lat, lng } = { lat: latInput.value, lng: lngInput.value };
        map.setupMap(lat, lng);
        const radiusMeters = [300, 500, 1000, 2000, 3000][filters.range.input.value - 1];
        map.drawSearchRadius(lat, lng, radiusMeters);

        const params = buildSearchParams(page);

        try {
            const data = await api.fetchRestaurants(params);
            // API結果に元の順序を保持するためのインデックスを付与
            currentShops = (data.shops || []).map((shop, index) => ({ ...shop, originalIndex: index }));

            // ソート順を初期化
            const sortSelect = document.getElementById('sort-order');
            if (sortSelect) sortSelect.value = 'recommend';
            currentSortBy = 'recommend';

            const sortedShops = sortShops(currentShops, currentSortBy);

            // UIと地図を更新
            ui.renderResultsHeader(data.pagination);
            ui.renderShops(sortedShops, filters);
            ui.renderPagination(data.pagination, handleSearch);

            const onPopupButtonClick = (shopId) => ui.highlightListItem(shopId);
            const onRouteButtonClick = (shopId) => {
                const shop = currentShops.find(s => s.id === shopId);
                if (shop) map.drawRoute(shop, { lat, lng });
            };
            map.renderMapData(sortedShops, onPopupButtonClick, onRouteButtonClick);

        } catch (error) {
            console.error(error);
            ui.showMessage('レストランの検索に失敗しました。');
        } finally {
            ui.toggleLoading(false);
        }
    }

    /**
     * 並び替え順の変更を処理します。
     * @param {string} sortBy - 新しい並び替え順 ('recommend' or 'distance')。
     */
    function handleSortChange(sortBy) {
        currentSortBy = sortBy;
        const sortedShops = sortShops(currentShops, currentSortBy);

        // UIと地図を再描画
        ui.renderShops(sortedShops, filters);

        const onPopupButtonClick = (shopId) => ui.highlightListItem(shopId);
        const onRouteButtonClick = (shopId) => {
            const shop = currentShops.find(s => s.id === shopId);
            if (shop) map.drawRoute(shop, { lat: latInput.value, lng: lngInput.value });
        };
        map.renderMapData(sortedShops, onPopupButtonClick, onRouteButtonClick);
    }

    /**
     * すべてのフィルター条件を初期値にリセットします。
     */
    function clearAllFilters() {
        keywordInput.value = '';
        clearKeywordBtn.classList.add('hidden');

        // 各フィルターをデフォルト値に設定
        filters.range.input.value = '3'; // 1000m
        filters.budget.input.value = '';
        filters.genre.checkboxes().forEach(cb => cb.checked = false);
        filters.specialCategory.checkboxes().forEach(cb => cb.checked = false);

        // フィルターボタンの表示を更新
        ui.updateTriggerDisplay(filters.range.display, "1000m");
        ui.updateTriggerDisplay(filters.budget.display, null);
        ui.updateTriggerDisplay(filters.genre.display, null);
        ui.updateTriggerDisplay(filters.specialCategory.display, null);
    }

    // ==========================================================================
    // ヘルパー関数
    // ==========================================================================

    /**
     * APIリクエスト用の検索パラメータオブジェクトを構築します。
     * @param {number} page - ページ番号。
     * @returns {URLSearchParams} 検索パラメータ。
     */
    function buildSearchParams(page) {
        const params = new URLSearchParams({
            lat: latInput.value,
            lng: lngInput.value,
            page: page,
            range: filters.range.input.value,
        });

        if (keywordInput.value) params.append('keyword', keywordInput.value);
        if (filters.budget.input.value) params.append('budget', filters.budget.input.value);

        const genreCodes = Array.from(filters.genre.checkboxes()).filter(cb => cb.checked).map(cb => cb.value);
        if (genreCodes.length > 0) params.append('genre', genreCodes.join(','));

        const scCodes = Array.from(filters.specialCategory.checkboxes()).filter(cb => cb.checked).map(cb => cb.value);
        if (scCodes.length > 0) params.append('special_category', scCodes.join(','));

        return params;
    }

    /**
     * 店舗リストをクライアントサイドで並び替えます。
     * @param {Array<object>} shops - 店舗情報の配列。
     * @param {string} sortBy - 並び替えのキー ('recommend' or 'distance')。
     * @returns {Array<object>} 並び替え後の店舗情報の配列。
     */
    function sortShops(shops, sortBy) {
        const shopsCopy = [...shops]; // 元の配列を破壊しないようにコピーを作成
        if (sortBy === 'distance') {
            shopsCopy.sort((a, b) => (a.distance_m || Infinity) - (b.distance_m || Infinity));
        } else if (sortBy === 'recommend') {
            // originalIndexを元にソートし、APIからの初期順序（おすすめ順）に戻す
            shopsCopy.sort((a, b) => a.originalIndex - b.originalIndex);
        }
        return shopsCopy;
    }

    // ==========================================================================
    // 状態の永続化 (ローカルストレージ)
    // ==========================================================================

    /**
     * 現在の検索条件をローカルストレージに保存します。
     */
    function saveSearchCriteria() {
        const criteria = {
            range: filters.range.input.value,
            keyword: keywordInput.value,
            budget: filters.budget.input.value,
            genres: Array.from(filters.genre.checkboxes()).filter(cb => cb.checked).map(cb => cb.value),
            special_categories: Array.from(filters.specialCategory.checkboxes()).filter(cb => cb.checked).map(cb => cb.value),
        };
        localStorage.setItem('restaurantSearchCriteria', JSON.stringify(criteria));
    }

    /**
     * ローカルストレージから検索条件を読み込み、フォームに反映させます。
     */
    function loadSearchCriteria() {
        const savedCriteria = localStorage.getItem('restaurantSearchCriteria');
        if (!savedCriteria) return;

        const criteria = JSON.parse(savedCriteria);

        // 各フォーム要素に値を設定
        filters.range.input.value = criteria.range || '3';
        keywordInput.value = criteria.keyword || '';
        filters.budget.input.value = criteria.budget || '';

        if (criteria.genres) {
            filters.genre.checkboxes().forEach(cb => {
                cb.checked = criteria.genres.includes(cb.value);
            });
        }
        if (criteria.special_categories) {
            filters.specialCategory.checkboxes().forEach(cb => {
                cb.checked = criteria.special_categories.includes(cb.value);
            });
        }

        // フィルターボタンの表示を更新
        const rangeOption = document.querySelector(`#radius-modal li[data-value="${filters.range.input.value}"]`);
        ui.updateTriggerDisplay(filters.range.display, rangeOption ? rangeOption.dataset.text : null);

        const budgetOption = document.querySelector(`#budget-modal li[data-value="${filters.budget.input.value}"]`);
        ui.updateTriggerDisplay(filters.budget.display, budgetOption ? budgetOption.dataset.text : null);

        const genreCount = (criteria.genres || []).length;
        ui.updateTriggerDisplay(filters.genre.display, genreCount > 0 ? `${genreCount}件選択中` : null);

        const scCount = (criteria.special_categories || []).length;
        ui.updateTriggerDisplay(filters.specialCategory.display, scCount > 0 ? `${scCount}件選択中` : null);
    }

    // ==========================================================================
    // ブラウザAPIラッパー
    // ==========================================================================

    /**
     * Geolocation APIをPromiseベースでラップし、現在地を取得します。
     * @returns {Promise<GeolocationPosition>} 現在地の位置情報。
     */
    function getCurrentPosition() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                return reject(new Error('お使いのブラウザは位置情報機能に対応していません。'));
            }
            navigator.geolocation.getCurrentPosition(resolve, (err) => {
                const message = {
                    [err.PERMISSION_DENIED]: '位置情報の利用が許可されていません。',
                    [err.POSITION_UNAVAILABLE]: '位置情報を取得できませんでした。',
                    [err.TIMEOUT]: '位置情報の取得がタイムアウトしました。'
                }[err.code] || '不明なエラーが発生しました。';
                reject(new Error(message));
            });
        });
    }

    // --- アプリケーション実行開始 ---
    initializeApp();
});