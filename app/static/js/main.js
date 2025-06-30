// app/static/js/main.js

document.addEventListener('DOMContentLoaded', () => {
    // HTML要素を取得
    const searchBtn = document.getElementById('search-btn');
    const rangeSelect = document.getElementById('range');
    const resultsContainer = document.getElementById('search-results-container');
    const paginationContainer = document.getElementById('pagination-container');
    
    // 緯度・経度をJavaScript内で保持するための隠しフィールド
    const latInput = document.getElementById('lat');
    const lngInput = document.getElementById('lng');

    /**
     * 「現在地で検索」ボタンがクリックされた時の処理
     * 新規検索なので、緯度経度をリセットしてから検索を開始する
     */
    searchBtn.addEventListener('click', () => {
        latInput.value = '';
        lngInput.value = '';
        searchRestaurants(1); // 1ページ目から検索開始
    });

    /**
     * レストランを検索するメインの非同期関数
     * @param {number} page - 取得したいページ番号
     */
    async function searchRestaurants(page = 1) {
        // 緯度・経度がまだ取得できていない場合、Geolocation APIを呼び出す
        if (!latInput.value || !lngInput.value) {
            if (!navigator.geolocation) {
                alert('お使いのブラウザは位置情報機能に対応していません。');
                return;
            }
            resultsContainer.innerHTML = '<p>位置情報を取得中...</p>';
            paginationContainer.innerHTML = '';
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    latInput.value = position.coords.latitude;
                    lngInput.value = position.coords.longitude;
                    searchRestaurants(page); // 位置情報を取得できたので、再度この関数を呼び出して検索を実行
                },
                onError
            );
            return; // Geolocation APIの結果が返ってくるまで一旦処理を終了
        }

        // ローディング表示
        resultsContainer.innerHTML = '<p>検索中...</p>';
        paginationContainer.innerHTML = '';

        // APIに渡すクエリパラメータを組み立て
        const params = new URLSearchParams({
            lat: latInput.value,
            lng: lngInput.value,
            range: rangeSelect.value,
            page: page
        });

        try {
            // 自作のバックエンドAPIをFetch APIで呼び出す
            const response = await fetch(`/api/search?${params}`);
            if (!response.ok) {
                throw new Error(`サーバーエラー: ${response.status}`);
            }
            const data = await response.json();
            
            // 受け取ったデータで画面全体を再描画
            render(data);
        } catch (error) {
            console.error('検索に失敗しました:', error);
            resultsContainer.innerHTML = '<p>検索に失敗しました。もう一度お試しください。</p>';
        }
    }

    /**
     * 検索結果とページネーションを描画する親関数
     * @param {object} data - APIから返されたデータ
     */
    function render(data) {
        renderShops(data.shops || []);
        renderPagination(data.pagination || {});
    }

    /**
     * 店舗一覧のHTMLを生成して表示する関数
     * @param {Array} shops - 店舗情報の配列
     */
    function renderShops(shops) {
        if (shops.length === 0) {
            resultsContainer.innerHTML = '<p>該当するレストランは見つかりませんでした。</p>';
            return;
        }

        const shopsHtml = shops.map(shop => `
            <a href="/shop/${shop.id}" class="shop-card-link" target="_blank" rel="noopener noreferrer">
                <div class="shop-card">
                    <div class="shop-card__image">
                        <img src="${shop.photo.pc.l}" alt="${shop.name}の画像">
                    </div>
                    <div class="shop-card__content">
                        <h2 class="shop-card__name">${shop.name}</h2>
                        <p class="shop-card__access">${shop.mobile_access}</p>
                    </div>
                </div>
            </a>
        `).join('');

        resultsContainer.innerHTML = shopsHtml;
    }

    /**
     * ページネーションのHTMLを生成して表示する関数
     * @param {object} pagination - ページ情報
     */
    function renderPagination(pagination) {
        const { total_pages, current_page } = pagination;
        
        if (!total_pages || total_pages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }

        let paginationHtml = '<div class="pagination">';
        
        // 「前へ」ボタン
        if (current_page > 1) {
            paginationHtml += `<button class="page-btn" data-page="${current_page - 1}">&laquo; 前へ</button>`;
        }

        // ページ番号ボタン
        for (let i = 1; i <= total_pages; i++) {
            if (i === current_page) {
                paginationHtml += `<span class="current">${i}</span>`;
            } else {
                paginationHtml += `<button class="page-btn" data-page="${i}">${i}</button>`;
            }
        }

        // 「次へ」ボタン
        if (current_page < total_pages) {
            paginationHtml += `<button class="page-btn" data-page="${current_page + 1}">次へ &raquo;</button>`;
        }

        paginationHtml += '</div>';
        paginationContainer.innerHTML = paginationHtml;

        // 生成した各ボタンにクリックイベントを設定
        paginationContainer.querySelectorAll('.page-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const page = e.target.dataset.page;
                searchRestaurants(page); // 対応するページのレストランを検索
            });
        });
    }

    /**
     * Geolocation APIでの位置情報取得が失敗した時の処理
     * @param {object} error - エラーオブジェクト
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
        resultsContainer.innerHTML = `<p>${message}</p>`;
    }
});