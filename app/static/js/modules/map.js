// --- モジュールレベルの変数 ---
let map = null;
let markersLayer = null;
let currentLocationMarker = null;
let searchRadiusCircle = null;

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
 * @param {number} lat - 中心の緯度
 * @param {number} lng - 中心の経度
 */
export function setupMap(lat, lng) {
    if (!map) {
        document.getElementById('map').classList.remove('hidden');
        map = L.map('map').setView([lat, lng], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
        
        // L.markerClusterGroup() を使い、クラスタリング機能を持つレイヤーを作成します。
        markersLayer = L.markerClusterGroup().addTo(map);
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
 * @param {number} lat - 円の中心の緯度
 * @param {number} lng - 円の中心の経度
 * @param {number} radiusMeters - 円の半径（メートル）
 */
export function drawSearchRadius(lat, lng, radiusMeters) {
    if (!map) return;

    if (!searchRadiusCircle) {
        searchRadiusCircle = L.circle([lat, lng], {
            radius: radiusMeters,
            color: '#007bff',
            fillColor: '#007bff',
            fillOpacity: 0.1,
        }).addTo(map);
    } else {
        searchRadiusCircle.setLatLng([lat, lng]);
        searchRadiusCircle.setRadius(radiusMeters);
    }
    map.fitBounds(searchRadiusCircle.getBounds());
}

/**
 * 地図上にレストランのマーカーを描画します。
 * @param {Array} shops - 店舗情報の配列
 */
export function renderMarkers(shops) {
    if (markersLayer) {
        markersLayer.clearLayers();
    }
    if (!shops || shops.length === 0) return;

    const markers = [];
    shops.forEach(shop => {
        const marker = L.marker([shop.lat, shop.lng], { icon: restaurantIcon });
        marker.bindPopup(`<b>${shop.name}</b><br><a href="/shop/${shop.id}" target="_blank">詳細を見る</a>`);
        markers.push(marker);
    });
    markersLayer.addLayers(markers);
}
