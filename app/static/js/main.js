// app/static/js/main.js

document.addEventListener('DOMContentLoaded', () => {
    // HTML要素を取得
    const searchBtn = document.getElementById('search-btn');
    const searchForm = document.getElementById('search-form');
    const latInput = document.getElementById('lat');
    const lngInput = document.getElementById('lng');

    // 「現在地で検索」ボタンがクリックされた時の処理
    searchBtn.addEventListener('click', () => {
        // Geolocation APIが利用できるかチェック
        if (!navigator.geolocation) {
            alert('お使いのブラウザは位置情報機能に対応していません。');
            return;
        }

        // ユーザーに位置情報の使用許可を求める
        // 成功時のコールバック関数と失敗時のコールバック関数を渡す
        navigator.geolocation.getCurrentPosition(onSuccess, onError);
    });

    // 位置情報の取得に成功した場合の処理
    function onSuccess(position) {
        // 緯度と経度を取得
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        // コンソールに表示して確認
        console.log('緯度:', lat);
        console.log('経度:', lng);

        // 隠しフィールドに緯度と経度の値を設定
        latInput.value = lat;
        lngInput.value = lng;

        // フォームを送信して検索を実行
        searchForm.submit();
    }

    // 位置情報の取得に失敗した場合の処理
    function onError(error) {
        switch (error.code) {
            case error.PERMISSION_DENIED:
                alert('位置情報の利用が許可されていません。');
                break;
            case error.POSITION_UNAVAILABLE:
                alert('位置情報を取得できませんでした。');
                break;
            case error.TIMEOUT:
                alert('位置情報の取得がタイムアウトしました。');
                break;
            default:
                alert('不明なエラーが発生しました。');
                break;
        }
    }
});