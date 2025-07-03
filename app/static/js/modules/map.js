// --- モジュールレベルの変数 ---
let map = null;
let markersLayer = null;
let heatmapLayer = null;
let currentLocationMarker = null;
let searchRadiusCircle = null;
let markerMap = new Map(); // shop.idとマーカーを紐付けるMap
let currentHeatPoints = [];

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
export function renderMapData(shops, onPopupButtonClick) {
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
                <button class="popup-list-btn" data-shop-id="${shop.id}">リストで確認</button>
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

    // ポップアップ内のボタンクリックを検知するイベントリスナー
    map.off('popupopen').on('popupopen', (e) => {
        const btn = e.popup._container.querySelector('.popup-list-btn');
        if (btn) {
            // イベントの重複登録を防ぐため、一度削除してから登録する
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            newBtn.addEventListener('click', () => {
                const shopId = newBtn.dataset.shopId;
                onPopupButtonClick(shopId);
            });
        }
    });
}

/**
 * 指定されたIDのマーカーをハイライトします。
 */
export function highlightMarker(shopId) {
    if (markerMap.has(shopId)) {
        const marker = markerMap.get(shopId);
        if (markersLayer) {
            // クラスター内のマーカーでも表示されるようにズームし、その後ポップアップを開きます。
            markersLayer.zoomToShowLayer(marker, () => {
                marker.openPopup();
            });
        }
    }
}

/**
 * 地図の表示モードを切り替えます。
 */
export function setMapView(mode) {
    if (!map) return;
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
