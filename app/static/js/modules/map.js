// --- モジュールレベルの変数 ---
// これらの変数は、このファイル内でのみ状態を保持します。
let map = null;
let restaurantMarkersLayer = null;
let currentLocationMarker = null;

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
 * 地図を初期化、または既存地図の中心とマーカーを更新します。
 * @param {number} lat - 中心の緯度
 * @param {number} lng - 中心の経度
 */
export function setupMap(lat, lng) {
    // 地図がまだ作られていなければ（初回検索時）、地図を初期化します。
    if (!map) {
        document.getElementById('map').classList.remove('hidden');
        map = L.map('map').setView([lat, lng], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
        restaurantMarkersLayer = L.layerGroup().addTo(map);
    }

    // 現在地マーカーを設置または位置を更新します。
    if (!currentLocationMarker) {
        currentLocationMarker = L.marker([lat, lng], { icon: currentLocationIcon }).addTo(map);
        currentLocationMarker.bindPopup("あなたの現在地").openPopup();
    } else {
        currentLocationMarker.setLatLng([lat, lng]);
    }
    // 検索のたびに地図の中心を現在地に戻します。
    map.setView([lat, lng], 15);
}

/**
 * 地図上にレストランのマーカー（ピン）を描画します。
 * @param {Array} shops - 店舗情報の配列
 */
export function renderMarkers(shops) {
    // 検索のたびに、古いレストランマーカーを一度すべてクリアします。
    if (restaurantMarkersLayer) {
        restaurantMarkersLayer.clearLayers();
    }
    if (!shops || shops.length === 0) return;

    // 各店舗のマーカーを地図に追加します。
    shops.forEach(shop => {
        const marker = L.marker([shop.lat, shop.lng], { icon: restaurantIcon }).addTo(restaurantMarkersLayer);
        marker.bindPopup(`<b>${shop.name}</b><br><a href="/shop/${shop.id}" target="_blank">詳細を見る</a>`);
    });
}
