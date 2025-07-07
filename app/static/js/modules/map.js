// --- モジュールレベルの変数 ---
let map = null;
let markersLayer = null;
let heatmapLayer = null;
let currentLocationMarker = null;
let searchRadiusCircle = null;
let markerMap = new Map();
let currentHeatPoints = [];
let routingControl = null;
// highlightedDestinationMarker は不要になったため削除

// --- アイコンの定義 ---
const currentLocationIcon = L.icon({
    iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});
const restaurantIcon = L.icon({
    iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});
// destinationIcon は不要になったため削除

/**
 * 地図を初期化または更新します。
 */
export function setupMap(lat, lng) {
    if (!map) {
        document.getElementById('map').classList.remove('hidden');
        map = L.map('map').setView([lat, lng], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
        markersLayer = L.markerClusterGroup().addTo(map);
        heatmapLayer = L.heatLayer([], { 
            radius: 40, blur: 25, maxZoom: 18, gradient: {0.4: 'blue', 0.65: 'lime', 1: 'red'}
        });
    }
    if (!currentLocationMarker) {
        currentLocationMarker = L.marker([lat, lng], { icon: currentLocationIcon }).addTo(map);
        currentLocationMarker.bindPopup("あなたの現在地").openPopup();
    } else {
        currentLocationMarker.setLatLng([lat, lng]);
    }
    map.setView([lat, lng], 15);
}

/**
 * 地図上に検索範囲を示す円を描画または更新します。
 */
export function drawSearchRadius(lat, lng, radiusMeters) {
    if (!map) return;
    if (!searchRadiusCircle) {
        searchRadiusCircle = L.circle([lat, lng], {
            radius: radiusMeters, color: '#3388ff', fillColor: '#3388ff', fillOpacity: 0.1,
        }).addTo(map);
    } else {
        searchRadiusCircle.setLatLng([lat, lng]);
        searchRadiusCircle.setRadius(radiusMeters);
    }
    map.fitBounds(searchRadiusCircle.getBounds());
}

/**
 * 地図上に表示するためのマーカーとヒートマップのデータを準備・更新します。
 */
export function renderMapData(shops, onPopupButtonClick, onRouteButtonClick) {
    clearRoute(); // 新しい検索のたびに既存のルートをクリア
    if (markersLayer) markersLayer.clearLayers();
    if (heatmapLayer) heatmapLayer.setLatLngs([]);
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
        heatPoints.push([shop.lat, shop.lng, 1.0]);
        markerMap.set(shop.id, marker);
    });

    markersLayer.addLayers(markers);
    currentHeatPoints = heatPoints;

    if (map && map.hasLayer(heatmapLayer)) {
        heatmapLayer.setLatLngs(currentHeatPoints);
    }

    map.off('popupopen').on('popupopen', (e) => {
        const popupNode = e.popup._container;
        const listBtn = popupNode.querySelector('.popup-list-btn');
        const routeBtn = popupNode.querySelector('.popup-route-btn');

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

/**
 * 指定されたIDのマーカーをハイライトします。
 */
export function highlightMarker(shopId) {
    clearRoute(); // 他の店をハイライトする際はルートを消す
    if (markerMap.has(shopId)) {
        const marker = markerMap.get(shopId);
        if (markersLayer) {
            markersLayer.zoomToShowLayer(marker, () => marker.openPopup());
        }
    }
}

/**
 * 現在地から指定された店舗までのルートを描画します。
 */
export function drawRoute(shop, currentLocation) {
    if (!map) return;
    clearRoute(); // 既存のルートがあればクリア
    map.closePopup(); // すべてのポップアップを閉じる

    // 目的地ピンのアイコンを変更する処理を削除

    routingControl = L.Routing.control({
        waypoints: [
            L.latLng(currentLocation.lat, currentLocation.lng),
            L.latLng(shop.lat, shop.lng)
        ],
        // ルーティングプラグインが独自のマーカーを追加しないように設定
        // これにより、既存の（動かせない）ピンがそのまま使われます。
        createMarker: function() { return null; },
        routeWhileDragging: false, 
        show: false, // ルート案内パネルは非表示
        addWaypoints: false, // ウェイポイントの追加を無効化
        lineOptions: { styles: [{color: '#62a0ff', opacity: 0.8, weight: 6}] }
    }).on('routesfound', function(e) {
        const routes = e.routes;
        const summary = routes[0].summary;
        // 距離(km)と時間(分)を整形して表示
        const distance = (summary.totalDistance / 1000).toFixed(1);
        const time = Math.round(summary.totalTime / 60);
        const summaryDiv = document.getElementById('route-summary');
        summaryDiv.innerHTML = `目的地まで: ${distance} km (約 ${time} 分)`;
        summaryDiv.classList.remove('hidden');
    }).addTo(map);
}

/**
 * 表示されているルートを削除します。
 */
export function clearRoute() {
    if (map && routingControl) {
        map.removeControl(routingControl);
        routingControl = null;
    }
    // 目的地マーカーのアイコンを元に戻す処理は不要になったため削除
    document.getElementById('route-summary').classList.add('hidden');
}

/**
 * 地図の表示モードを切り替えます。
 */
export function setMapView(mode) {
    if (!map) return;
    clearRoute();
    if (mode === 'heatmap') {
        if (map.hasLayer(markersLayer)) map.removeLayer(markersLayer);
        if (!map.hasLayer(heatmapLayer)) {
            map.addLayer(heatmapLayer);
            heatmapLayer.setLatLngs(currentHeatPoints);
        }
    } else {
        if (map.hasLayer(heatmapLayer)) map.removeLayer(heatmapLayer);
        if (!map.hasLayer(markersLayer)) map.addLayer(markersLayer);
    }
}
