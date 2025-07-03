const resultsContainer = document.getElementById('search-results-container');
const paginationContainer = document.getElementById('pagination-container');
const loadingSpinner = document.getElementById('loading-spinner');

/**
 * 検索結果の店舗一覧リストのHTMLを生成して表示します。
 */
export function renderShops(shops, searchFormElements) {
    if (!shops || shops.length === 0) {
        const widenBtnHtml = searchFormElements.range.selectedIndex < searchFormElements.range.options.length - 1
            ? `<button id="widen-search-btn" class="suggestion-btn">検索範囲を広げて再検索</button>`
            : '';
        resultsContainer.innerHTML = `
            <div class="no-results">
                <p>該当するレストランは見つかりませんでした。</p>
                <div class="suggestion-actions">
                    ${widenBtnHtml}
                    <button id="clear-filters-btn" class="suggestion-btn">フィルターをクリアして再検索</button>
                </div>
            </div>
        `;
        return;
    }

    const shopsHtml = shops.map(shop => {
        const distanceHtml = shop.distance_m ? `<p class="shop-card__distance">現在地から約${shop.distance_m}m</p>` : '';
        return `
            <div class="shop-card-wrapper" data-shop-id="${shop.id}">
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
                <button class="map-link-btn" data-shop-id="${shop.id}">地図で確認</button>
            </div>
        `;
    }).join('');
    resultsContainer.innerHTML = shopsHtml;
}

/**
 * ページネーションのHTMLを生成して表示します。
 */
export function renderPagination(pagination, onPageClick) {
    if (!pagination || !pagination.total_pages || pagination.total_pages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }
    const { total_pages, current_page } = pagination;
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
 */
export function toggleLoading(show) {
    loadingSpinner.classList.toggle('hidden', !show);
}

/**
 * 結果表示エリアにメッセージを表示します。
 */
export function showMessage(message) {
    resultsContainer.innerHTML = `<p>${message}</p>`;
    paginationContainer.innerHTML = '';
}

/**
 * 各種クリックイベントを処理するためのイベントリスナーをセットアップします。
 */
export function setupEventListeners(onWidenSearch, onClearFilters, onMapLinkClick) {
    resultsContainer.addEventListener('click', (e) => {
        if (e.target.id === 'widen-search-btn') onWidenSearch();
        if (e.target.id === 'clear-filters-btn') onClearFilters();
        if (e.target.classList.contains('map-link-btn')) {
            onMapLinkClick(e.target.dataset.shopId);
        }
    });
}

/**
 * 指定されたIDの店舗カードをハイライトします。
 */
export function highlightListItem(shopId) {
    document.querySelectorAll('.shop-card-wrapper.highlighted').forEach(el => {
        el.classList.remove('highlighted');
    });
    const listItem = document.querySelector(`.shop-card-wrapper[data-shop-id="${shopId}"]`);
    if (listItem) {
        listItem.classList.add('highlighted');
        listItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}
