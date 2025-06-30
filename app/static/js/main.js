// app/static/js/main.js

document.addEventListener('DOMContentLoaded', () => {
    /**
     * Leafletのデフォルトアイコンが画像を見つけられるように、パスを明示的に設定
     */
    L.Icon.Default.imagePath = 'https://unpkg.com/leaflet@1.9.4/dist/images/';

    // --- HTML要素の取得 ---
    const searchBtn = document.getElementById('search-btn');
    const rangeSelect = document.getElementById('range');
    const keywordInput = document.getElementById('keyword');
    const resultsContainer = document.getElementById('search-results-container');
    const paginationContainer = document.getElementById('pagination-container');
    const loadingSpinner = document.getElementById('loading-spinner');
    const budgetSelect = document.getElementById('budget');
    const sortOrderSelect = document.getElementById('sort-order');
    const latInput = document.getElementById('lat');
    const lngInput = document.getElementById('lng');

    // --- 地図関連の変数を初期化 ---
    let map = null; // Mapオブジェクト
    let restaurantMarkersLayer = null; // レストランのマーカーを管理するレイヤー
    let currentLocationMarker = null;  // 現在地マーカー

    /**
     * 現在地を示すための、青いカスタムアイコンを定義
     */
    const currentLocationIcon = L.icon({
        iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    /**
     * レストランを示すための、赤いカスタムアイコンを定義
     */
    const restaurantIcon = L.icon({
        iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    /**
     * 「現在地で検索」ボタンがクリックされた時のイベントリスナー
     * 新規検索として、位置情報をリセットし、1ページ目から検索を開始する
     */
    searchBtn.addEventListener('click', () => {
        latInput.value = '';
        lngInput.value = '';
        searchRestaurants(1);
    });

    /**
     * レストラン検索の全体の流れを管理するメイン関数
     * @param {number} [page=1] - 検索したいページ番号
     */
    async function searchRestaurants(page = 1) {
        // まだ位置情報がなければ、Geolocation APIで取得する
        if (!latInput.value || !lngInput.value) {
            if (!navigator.geolocation) {
                alert('お使いのブラウザは位置情報機能に対応していません。');
                return;
            }
            loadingSpinner.classList.remove('hidden');
            resultsContainer.innerHTML = '';
            paginationContainer.innerHTML = '';
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    latInput.value = position.coords.latitude;
                    lngInput.value = position.coords.longitude;
                    searchRestaurants(page); // 位置情報取得後に、再度この関数を呼び出す
                },
                onError
            );
            return;
        }

        loadingSpinner.classList.remove('hidden');
        resultsContainer.innerHTML = '';
        paginationContainer.innerHTML = '';

        const lat = latInput.value;
        const lng = lngInput.value;

        // 地図が未初期化の場合、現在地を中心に地図を作成する
        if (!map) {
            document.getElementById('map').classList.remove('hidden');
            map = L.map('map').setView([lat, lng], 15);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);
            restaurantMarkersLayer = L.layerGroup().addTo(map);
        }

        // 現在地マーカーを設置または位置を更新する
        if (!currentLocationMarker) {
            currentLocationMarker = L.marker([lat, lng], { icon: currentLocationIcon }).addTo(map);
            currentLocationMarker.bindPopup("あなたの現在地").openPopup();
        } else {
            currentLocationMarker.setLatLng([lat, lng]);
        }
        map.setView([lat, lng], 15);

        // APIに送信する検索パラメータを組み立てる
        const params = new URLSearchParams({
            lat: lat,
            lng: lng,
            range: rangeSelect.value,
            budget: budgetSelect.value,
            sort_by: sortOrderSelect.value,
            page: page
        });
        if (keywordInput.value) {
            params.append('keyword', keywordInput.value);
        }
        const checkedGenres = document.querySelectorAll('input[name="genre"]:checked');
        if (checkedGenres.length > 0) {
            const genreCodes = Array.from(checkedGenres).map(cb => cb.value);
            params.append('genre', genreCodes.join(','));
        }
        const checkedSpecialCategories = document.querySelectorAll('input[name="special_category"]:checked');
        if (checkedSpecialCategories.length > 0) {
            const scCodes = Array.from(checkedSpecialCategories).map(cb => cb.value);
            params.append('special_category', scCodes.join(','));
        }
        if (budgetSelect.value) {
            params.append('budget', budgetSelect.value);
        }

        try {
            // バックエンドのAPIを呼び出す
            const response = await fetch(`/api/search?${params}`);
            if (!response.ok) throw new Error(`サーバーエラー: ${response.status}`);

            const data = await response.json();
            // 受け取ったデータで画面全体を描画する
            render(data);
        } catch (error) {
            console.error('検索に失敗しました:', error);
            resultsContainer.innerHTML = '<p>検索に失敗しました。もう一度お試しください。</p>';
        } finally {
            // 成功・失敗にかかわらず、ローディングスピナーを非表示にする
            loadingSpinner.classList.add('hidden');
        }
    }

    /**
     * 受け取ったデータをもとに、各描画関数を呼び出す
     * @param {object} data - /api/searchから返されたJSONデータ
     */
    function render(data) {
        renderMarkers(data.shops || []);
        renderShops(data.shops || []);
        renderPagination(data.pagination || {});
    }

    /**
     * 地図上にレストランのマーカー（ピン）を描画する
     * @param {Array} shops - 店舗情報の配列
     */
    function renderMarkers(shops) {
        // 既存のレストランマーカーを一度すべてクリア
        if (restaurantMarkersLayer) {
            restaurantMarkersLayer.clearLayers();
        }
        if (shops.length === 0) return;

        // 各店舗のマーカーを地図に追加
        shops.forEach(shop => {
            const marker = L.marker([shop.lat, shop.lng], { icon: restaurantIcon }).addTo(restaurantMarkersLayer);
            marker.bindPopup(`<b>${shop.name}</b><br><a href="/shop/${shop.id}" target="_blank">詳細を見る</a>`);
        });
    }

    /**
     * 検索結果の店舗一覧リストのHTMLを生成して表示する
     * @param {Array} shops - 店舗情報の配列
     */
    function renderShops(shops) {
        if (shops.length === 0) {
            resultsContainer.innerHTML = '<p>該当するレストランは見つかりませんでした。</p>';
            return;
        }
        const shopsHtml = shops.map(shop => {
            // 距離が計算されていれば表示用のHTMLタグを生成
            const distanceHtml = shop.distance_m
                ? `<p class="shop-card__distance">現在地から約${shop.distance_m}m</p>`
                : '';

            return `
            <a href="/shop/${shop.id}" class="shop-card-link" target="_blank" rel="noopener noreferrer">
                <div class="shop-card">
                    <div class="shop-card__image">
                        <img src="${shop.photo.pc.l}" alt="${shop.name}の画像">
                    </div>
                    <div class="shop-card__content">
                        <h2 class="shop-card__name">${shop.name}</h2>
                        <p class="shop-card__access">${shop.mobile_access}</p>
                        ${distanceHtml} 
                    </div>
                </div>
            </a>
        `;
        }).join('');
        resultsContainer.innerHTML = shopsHtml;
    }

    /**
     * ページネーションのHTMLを生成して表示する
     * @param {object} pagination - ページ情報
     */
    function renderPagination(pagination) {
        const { total_pages, current_page } = pagination;
        if (!total_pages || total_pages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }
        let paginationHtml = '<div class="pagination">';
        if (current_page > 1) {
            paginationHtml += `<button class="page-btn" data-page="${current_page - 1}">&laquo; 前へ</button>`;
        }
        for (let i = 1; i <= total_pages; i++) {
            if (i === current_page) {
                paginationHtml += `<span class="current">${i}</span>`;
            } else {
                paginationHtml += `<button class="page-btn" data-page="${i}">${i}</button>`;
            }
        }
        if (current_page < total_pages) {
            paginationHtml += `<button class="page-btn" data-page="${current_page + 1}">次へ &raquo;</button>`;
        }
        paginationHtml += '</div>';
        paginationContainer.innerHTML = paginationHtml;

        // 生成した各ページボタンにクリックイベントを設定
        paginationContainer.querySelectorAll('.page-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const page = e.target.dataset.page;
                searchRestaurants(page); // 対応するページを再検索
            });
        });
    }

    /**
     * Geolocation APIでの位置情報取得が失敗した際の処理
     * @param {GeolocationPositionError} error - エラーオブジェクト
     */
    function onError(error) {
        let message = '';
        switch (error.code) {
            case error.PERMISSION_DENIED:
                message = '位置情報の利用が許可されていません。';
                break;
            case error.POSITION_UNAVAILABLE:
                message = '位置情報を取得できませんでした。';
                break;
            case error.TIMEOUT:
                message = '位置情報の取得がタイムアウトしました。';
                break;
            default:
                message = '不明なエラーが発生しました。';
                break;
        }
        loadingSpinner.classList.add('hidden');
        resultsContainer.innerHTML = `<p>${message}</p>`;
    }
});