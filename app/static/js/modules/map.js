/**
 * @file 地図（Leaflet.js）の表示と操作を担当するモジュール。
 * 地図の初期化、マーカーやヒートマップの描画、ルート検索表示などの機能を提供します。
 */

// ==========================================================================
// モジュールレベルの変数・状態
// ==========================================================================
let map = null;
let markersLayer = null; // マーカークラスタリング用のレイヤー
let heatmapLayer = null; // ヒートマップ表示用のレイヤー
let currentLocationMarker = null; // 現在地を示すマーカー
let searchRadiusCircle = null; // 検索範囲を示す円
let routingControl = null; // ルート制御インスタンス
let markerMap = new Map(); // 店舗IDとマーカーを紐付けるMap
let currentHeatPoints = []; // ヒートマップ用のデータポイント


// ==========================================================================
// アイコン定義
// ==========================================================================

// 現在地を示すカスタムアイコン
const currentLocationDivIcon = L.divIcon({
    className: 'current-location-marker',
    html: '<div class="pulsating-circle"></div>',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
});

// レストランを示すデフォルトアイコン
const restaurantIcon = L.icon({
    iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});


// ==========================================================================
// 地図の初期化とデータ描画
// ==========================================================================

/**
 * 地図を指定された緯度経度で初期化、または更新します。
 * @param {number} lat - 中心の緯度。
 * @param {number} lng - 中心の経度。
 */
export function setupMap(lat, lng) {
    // 初回のみ地図インスタンスを生成
    if (!map) {
        document.getElementById('map').classList.remove('hidden');
        map = L.map('map', {
            attributionControl: false // 右下の©OpenStreetMapを非表示
        }).setView([lat, lng], 15);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

        // レイヤーを初期化して地図に追加
        markersLayer = L.markerClusterGroup().addTo(map);
        heatmapLayer = L.heatLayer([], {
            radius: 40,
            blur: 25,
            maxZoom: 18,
            gradient: { 0.4: 'blue', 0.65: 'lime', 1: 'red' }
        });
    }

    // 現在地マーカーを更新
    if (!currentLocationMarker) {
        currentLocationMarker = L.marker([lat, lng], { icon: currentLocationDivIcon }).addTo(map);
    } else {
        currentLocationMarker.setLatLng([lat, lng]);
    }

    map.setView([lat, lng], 15);
}

/**
 * 店舗データを地図上にマーカーとヒートマップ情報として描画します。
 * @param {Array<object>} shops - 表示する店舗情報の配列。
 * @param {function(string)} onPopupButtonClick - ポップアップ内の「リストで確認」ボタンクリック時のコールバック。
 * @param {function(string)} onRouteButtonClick - ポップアップ内の「ルート表示」ボタンクリック時のコールバック。
 */
export function renderMapData(shops, onPopupButtonClick, onRouteButtonClick) {
    // 描画前に既存のデータをクリア
    clearRoute();
    markersLayer?.clearLayers();
    heatmapLayer?.setLatLngs([]);
    markerMap.clear();

    if (!shops || shops.length === 0) {
        currentHeatPoints = [];
        return;
    }

    const markers = [];
    const heatPoints = [];

    shops.forEach(shop => {
        const marker = L.marker([shop.lat, shop.lng], { icon: restaurantIcon });
        const popupContent = `
            <div class="map-popup">
                <img src="${shop.photo.mobile.s}" alt="${shop.name}" class="popup-img">
                <b>${shop.name}</b>
                <p>${shop.genre.name}</p>
                <div class="popup-buttons">
                    <button class="popup-list-btn" data-shop-id="${shop.id}">リストで確認</button>
                    <button class="popup-route-btn" data-shop-id="${shop.id}">ルート表示</button>
                </div>
                <a href="/shop/${shop.id}" target="_blank" class="popup-detail-link">詳細を見る</a>
            </div>
        `;
        marker.bindPopup(popupContent);
        markers.push(marker);
        heatPoints.push([shop.lat, shop.lng, 1.0]); // ヒートマップ用の重みは1.0で固定
        markerMap.set(shop.id, marker);
    });

    markersLayer.addLayers(markers);
    currentHeatPoints = heatPoints;

    // ヒートマップ表示モードの場合はデータを更新
    if (map?.hasLayer(heatmapLayer)) {
        heatmapLayer.setLatLngs(currentHeatPoints);
    }

    // ポップアップが開かれた際のイベントを設定
    // NOTE: ポップアップはマーカーごとに再利用されるため、都度イベントリスナーを再設定する必要がある
    map.off('popupopen').on('popupopen', (e) => {
        const popupNode = e.popup._container;
        const listBtn = popupNode.querySelector('.popup-list-btn');
        const routeBtn = popupNode.querySelector('.popup-route-btn');

        // イベントリスナーが重複しないよう、一度要素を複製して置き換える
        if (listBtn) {
            const newListBtn = listBtn.cloneNode(true);
            listBtn.parentNode.replaceChild(newListBtn, listBtn);
            newListBtn.addEventListener('click', () => onPopupButtonClick(newListBtn.dataset.shopId));
        }
        if (routeBtn) {
            const newRouteBtn = routeBtn.cloneNode(true);
            routeBtn.parentNode.replaceChild(newRouteBtn, routeBtn);
            newRouteBtn.addEventListener('click', () => onRouteButtonClick(newRouteBtn.dataset.shopId));
        }
    });
}


// ==========================================================================
// 地図上の要素の操作
// ==========================================================================

/**
 * 地図上に検索範囲を示す円を描画または更新します。
 * @param {number} lat - 円の中心の緯度。
 * @param {number} lng - 円の中心の経度。
 * @param {number} radiusMeters - 円の半径（メートル）。
 */
export function drawSearchRadius(lat, lng, radiusMeters) {
    if (!map) return;
    if (!searchRadiusCircle) {
        searchRadiusCircle = L.circle([lat, lng], {
            radius: radiusMeters,
            color: '#3388ff',
            fillColor: '#3388ff',
            fillOpacity: 0.1,
        }).addTo(map);
    } else {
        searchRadiusCircle.setLatLng([lat, lng]);
        searchRadiusCircle.setRadius(radiusMeters);
    }
    // 円が画面に収まるようにズームレベルを調整
    map.fitBounds(searchRadiusCircle.getBounds());
}

/**
 * 指定されたIDのマーカーを地図の中央に表示し、ポップアップを開きます。
 * @param {string} shopId - ハイライトする店舗のID。
 */
export function highlightMarker(shopId) {
    clearRoute(); // 他のマーカーをハイライトする際は既存のルートをクリア
    if (markerMap.has(shopId)) {
        const marker = markerMap.get(shopId);
        // マーカーがクラスタリングされている場合も考慮して表示
        markersLayer?.zoomToShowLayer(marker, () => marker.openPopup());
    }
}

/**
 * 現在地から指定された店舗までのルートを地図上に描画します。
 * @param {object} shop - 目的地の店舗情報。
 * @param {object} currentLocation - 現在地の緯度経度 ({lat, lng})。
 */
export function drawRoute(shop, currentLocation) {
    if (!map) return;
    clearRoute();
    map.closePopup();

    routingControl = L.Routing.control({
        waypoints: [
            L.latLng(currentLocation.lat, currentLocation.lng),
            L.latLng(shop.lat, shop.lng)
        ],
        createMarker: () => null,      // プラグインによるマーカー自動生成を無効化
        routeWhileDragging: false,      // ドラッグ中のルート再計算を無効化
        show: false,                    // ルート案内パネルを非表示
        addWaypoints: false,            // ウェイポイントの追加を無効化
        lineOptions: { styles: [{ color: '#62a0ff', opacity: 0.8, weight: 6 }] }
    }).on('routesfound', (e) => {
        // ルートが見つかったら距離と時間を表示
        const summary = e.routes[0].summary;
        const distance = (summary.totalDistance / 1000).toFixed(1);
        const time = Math.round(summary.totalTime / 60);
        const summaryDiv = document.getElementById('route-summary');
        summaryDiv.innerHTML = `目的地まで: ${distance} km (約 ${time} 分)`;
        summaryDiv.classList.remove('hidden');
    }).addTo(map);
}

/**
 * 地図上に表示されているルート案内と概要を削除します。
 */
export function clearRoute() {
    if (map && routingControl) {
        map.removeControl(routingControl);
        routingControl = null;
    }
    document.getElementById('route-summary')?.classList.add('hidden');
}


// ==========================================================================
// 地図の表示モード切替
// ==========================================================================

/**
 * 地図の表示を「マーカー表示」または「ヒートマップ表示」に切り替えます。
 * @param {string} mode - 表示モード ('pins' または 'heatmap')。
 */
export function setMapView(mode) {
    if (!map) return;
    clearRoute();

    if (mode === 'heatmap') {
        map.removeLayer(markersLayer); // マーカーレイヤーを削除
        if (!map.hasLayer(heatmapLayer)) {
            map.addLayer(heatmapLayer); // ヒートマップレイヤーを追加
            heatmapLayer.setLatLngs(currentHeatPoints); // データを再設定
        }
    } else { // 'pins' mode
        map.removeLayer(heatmapLayer); // ヒートマップレイヤーを削除
        if (!map.hasLayer(markersLayer)) {
            map.addLayer(markersLayer); // マーカーレイヤーを追加
        }
    }
}