// --- モジュールレベルの変数 ---
let map = null;
let markersLayer = null;
let heatmapLayer = null;
let currentLocationMarker = null;
let searchRadiusCircle = null;
let currentHeatPoints = []; // ★★★ ヒートマップ用のデータポイントを保持する変数を追加 ★★★

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

        markersLayer = L.markerClusterGroup().addTo(map);

        heatmapLayer = L.heatLayer([], {
            radius: 40,
            blur: 25,
            maxZoom: 18,
            gradient: { 0.4: 'lime', 0.65: 'yellow', 1: 'red' }
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
 * @param {number} lat - 円の中心の緯度
 * @param {number} lng - 円の中心の経度
 * @param {number} radiusMeters - 円の半径（メートル）
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
    map.fitBounds(searchRadiusCircle.getBounds());
}

/**
 * 地図上に表示するためのマーカーとヒートマップのデータを準備・更新します。
 * @param {Array} shops - 店舗情報の配列
 */
export function renderMapData(shops) {
    // 既存のマーカーをクリア
    if (markersLayer) {
        markersLayer.clearLayers();
    }

    // 結果が0件なら、データポイントもクリアして終了
    if (!shops || shops.length === 0) {
        currentHeatPoints = [];
        if (heatmapLayer) {
            heatmapLayer.setLatLngs([]);
        }
        return;
    }

    const markers = [];
    const heatPoints = [];

    shops.forEach(shop => {
        // マーカー用のデータを作成
        const marker = L.marker([shop.lat, shop.lng], { icon: restaurantIcon });
        marker.bindPopup(`<b>${shop.name}</b><br><a href="/shop/${shop.id}" target="_blank">詳細を見る</a>`);
        markers.push(marker);

        // ヒートマップ用のデータを作成
        heatPoints.push([shop.lat, shop.lng, 1.0]);
    });

    // 作成したデータを各レイヤーや変数にセット
    markersLayer.addLayers(markers);
    currentHeatPoints = heatPoints;

    // ★★★ もしヒートマップが現在表示中なら、すぐに更新する ★★★
    if (map && map.hasLayer(heatmapLayer)) {
        heatmapLayer.setLatLngs(currentHeatPoints);
    }
}

/**
 * 地図の表示モードを切り替えます。
 * @param {'pins' | 'heatmap'} mode - 表示するモード
 */
export function setMapView(mode) {
    if (!map) return;

    if (mode === 'heatmap') {
        if (map.hasLayer(markersLayer)) {
            map.removeLayer(markersLayer);
        }
        if (!map.hasLayer(heatmapLayer)) {
            map.addLayer(heatmapLayer);
            // ★★★ レイヤーを追加したタイミングで、保持していたデータを描画する ★★★
            heatmapLayer.setLatLngs(currentHeatPoints);
        }
    } else { // 'pins' またはデフォルト
        if (map.hasLayer(heatmapLayer)) {
            map.removeLayer(heatmapLayer);
        }
        if (!map.hasLayer(markersLayer)) {
            map.addLayer(markersLayer);
        }
    }
}
