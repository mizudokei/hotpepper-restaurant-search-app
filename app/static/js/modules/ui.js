// --- このモジュールが操作するHTML要素 ---
const resultsContainer = document.getElementById('search-results-container');
const paginationContainer = document.getElementById('pagination-container');
const loadingSpinner = document.getElementById('loading-spinner');

/**
 * 検索結果の店舗一覧リストのHTMLを生成して表示します。
 * @param {Array} shops - 店舗情報の配列
 */
export function renderShops(shops) {
    if (!shops || shops.length === 0) {
        resultsContainer.innerHTML = '<p>該当するレストランは見つかりませんでした。</p>';
        return;
    }
    const shopsHtml = shops.map(shop => {
        const distanceHtml = shop.distance_m ? `<p class="shop-card__distance">現在地から約${shop.distance_m}m</p>` : '';
        return `
            <a href="/shop/${shop.id}" class="shop-card-link" target="_blank" rel="noopener noreferrer">
                <div class="shop-card">
                    <div class="shop-card__image"><img src="${shop.photo.pc.l}" alt="${shop.name}の画像"></div>
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
 * ページネーションのHTMLを生成して表示します。
 * @param {object} pagination - ページ情報
 * @param {function} onPageClick - ページボタンがクリックされたときに呼び出すコールバック関数
 */
export function renderPagination(pagination, onPageClick) {
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
        paginationHtml += (i === current_page)
            ? `<span class="current">${i}</span>`
            : `<button class="page-btn" data-page="${i}">${i}</button>`;
    }
    if (current_page < total_pages) {
        paginationHtml += `<button class="page-btn" data-page="${current_page + 1}">次へ &raquo;</button>`;
    }
    paginationHtml += '</div>';
    paginationContainer.innerHTML = paginationHtml;

    paginationContainer.querySelectorAll('.page-btn').forEach(button => {
        button.addEventListener('click', (e) => onPageClick(e.target.dataset.page));
    });
}

/**
 * ローディングスピナーの表示・非表示を切り替えます。
 * @param {boolean} show - trueなら表示、falseなら非表示
 */
export function toggleLoading(show) {
    loadingSpinner.classList.toggle('hidden', !show);
}

/**
 * 結果表示エリアにメッセージを表示します。
 * @param {string} message - 表示するメッセージ文字列
 */
export function showMessage(message) {
    resultsContainer.innerHTML = `<p>${message}</p>`;
    paginationContainer.innerHTML = '';
}
