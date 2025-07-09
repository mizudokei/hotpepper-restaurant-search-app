/**
 * @file UIの描画と操作を担当するモジュール。
 * 検索結果、ページネーション、モーダルウィンドウなどのUIコンポーネントの生成と更新を管理します。
 */

// --- DOM要素の参照 ---
const resultsContainer = document.getElementById('search-results-container');
const paginationContainer = document.getElementById('pagination-container');
const loadingSpinner = document.getElementById('loading-spinner');
const resultsHeader = document.getElementById('results-header');
const resultsCount = document.getElementById('results-count');


// ==========================================================================
// 描画処理 (Renderers)
// ==========================================================================

/**
 * 店舗情報の配列から店舗カードリストを生成し、画面に描画します。
 * @param {Array<object>} shops - 表示する店舗情報の配列。
 * @param {object} searchFormElements - 検索フォーム要素の参照を持つオブジェクト。
 */
export function renderShops(shops, searchFormElements) {
    // 結果が0件の場合、提案メッセージを表示
    if (!shops || shops.length === 0) {
        const currentRangeValue = parseInt(searchFormElements.range.input.value, 10);
        const maxRangeValue = 5;

        // 検索範囲が最大でない場合のみ「範囲を広げる」ボタンを表示
        const widenBtnHtml = currentRangeValue < maxRangeValue
            ? `<button id="widen-search-btn" class="suggestion-btn">検索範囲を広げて再検索</button>`
            : '';

        resultsContainer.innerHTML = `
            <div class="no-results">
                <p>該当するレストランは見つかりませんでした。</p>
                <div class="suggestion-actions">
                    ${widenBtnHtml}
                    <button id="clear-filters-btn-no-results" class="suggestion-btn">フィルターをクリアして再検索</button>
                </div>
            </div>
        `;
        return;
    }

    // 店舗カードのHTMLを生成
    const shopsHtml = shops.map(shop => `
        <div class="shop-card-wrapper" data-shop-id="${shop.id}">
            <a href="/shop/${shop.id}" class="shop-card-link" target="_blank" rel="noopener noreferrer">
                <div class="shop-card__image">
                    <img src="${shop.photo.pc.l}" alt="${shop.name}の画像">
                </div>
                <div class="shop-card__content">
                    <h2 class="shop-card__name">${shop.name}</h2>
                    <p class="shop-card__access">${shop.mobile_access}</p>
                </div>
            </a>
            <div class="shop-card__footer">
                ${shop.distance_m ? `<p class="shop-card__distance">現在地から約${shop.distance_m}m</p>` : '<div></div>' /* 距離がない場合もレイアウトを維持 */}
                <button class="map-link-btn" data-shop-id="${shop.id}">地図で確認</button>
            </div>
        </div>
    `).join('');

    resultsContainer.innerHTML = shopsHtml;
}

/**
 * ページネーション情報を元にページネーションUIを描画します。
 * @param {object} pagination - ページネーション情報（total_pages, current_pageなど）。
 * @param {function(number)} onPageClick - ページボタンクリック時のコールバック関数。
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

    // ページ番号ボタンを生成
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

    // 各ページボタンにイベントリスナーを設定
    paginationContainer.querySelectorAll('.page-btn').forEach(button => {
        button.addEventListener('click', (e) => onPageClick(e.target.dataset.page));
    });
}

/**
 * 検索結果のヘッダー（件数表示）を更新します。
 * @param {object} pagination - ページネーション情報（total_resultsなど）。
 */
export function renderResultsHeader(pagination) {
    if (!resultsHeader || !resultsCount) return;

    if (pagination && pagination.total_results > 0) {
        resultsCount.textContent = `全${pagination.total_results}件`;
        resultsHeader.classList.remove('hidden');
    } else {
        resultsHeader.classList.add('hidden');
    }
}


// ==========================================================================
// UI状態制御 (State Controllers)
// ==========================================================================

/**
 * ローディングスピナーの表示・非表示を切り替えます。
 * @param {boolean} show - trueで表示、falseで非表示。
 */
export function toggleLoading(show) {
    loadingSpinner.classList.toggle('hidden', !show);
}

/**
 * 結果表示エリアに指定されたメッセージを表示します。ヘッダーとページネーションは非表示にします。
 * @param {string} message - 表示するメッセージ。
 */
export function showMessage(message) {
    resultsContainer.innerHTML = `<p class="no-results-message">${message}</p>`;
    paginationContainer.innerHTML = '';
    if (resultsHeader) {
        resultsHeader.classList.add('hidden');
    }
}

/**
 * 検索結果、ページネーション、ヘッダーをすべてクリアします。
 */
export function clearResults() {
    resultsContainer.innerHTML = '';
    paginationContainer.innerHTML = '';
    if (resultsHeader) {
        resultsHeader.classList.add('hidden');
    }
}


// ==========================================================================
// モーダル関連 (Modal Handlers)
// ==========================================================================

/**
 * 指定されたIDのモーダルとオーバーレイを表示します。
 * @param {string} modalId - 表示するモーダルのID。
 */
export function openModal(modalId) {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById(modalId);
    if (overlay) overlay.classList.remove('hidden');
    if (modal) modal.classList.remove('hidden');
}

/**
 * すべてのモーダルとオーバーレイを非表示にします。
 */
export function closeModal() {
    document.getElementById('modal-overlay')?.classList.add('hidden');
    document.querySelectorAll('.modal').forEach(modal => modal.classList.add('hidden'));
}


// ==========================================================================
// UIヘルパー (UI Helpers)
// ==========================================================================

/**
 * 単一選択リスト（半径、予算など）の選択状態を更新します。
 * @param {HTMLElement} listElement - 対象のリスト要素 (ul)。
 * @param {string} selectedValue - 現在選択されている値。
 */
export function updateSingleSelectList(listElement, selectedValue) {
    if (!listElement) return;
    listElement.querySelectorAll('li').forEach(li => {
        li.classList.toggle('selected', li.dataset.value === selectedValue);
    });
}

/**
 * フィルターボタンの表示テキストとスタイルを更新します。
 * @param {HTMLElement} displayElement - 更新するフィルターボタン内のspan要素。
 * @param {string | null} text - 表示するテキスト。nullの場合はデフォルトテキストに戻す。
 */
export function updateTriggerDisplay(displayElement, text) {
    if (!displayElement) return;
    if (text) {
        displayElement.textContent = text;
        displayElement.classList.add('selected');
    } else {
        displayElement.textContent = displayElement.dataset.defaultText;
        displayElement.classList.remove('selected');
    }
}

/**
 * 指定されたIDの店舗カードをハイライト表示し、その位置までスクロールします。
 * @param {string} shopId - ハイライトする店舗のID。
 */
export function highlightListItem(shopId) {
    // 既存のハイライトをすべて解除
    document.querySelectorAll('.shop-card-wrapper.highlighted').forEach(el => {
        el.classList.remove('highlighted');
    });

    // 対象の店舗カードをハイライト
    const listItem = document.querySelector(`.shop-card-wrapper[data-shop-id="${shopId}"]`);
    if (listItem) {
        listItem.classList.add('highlighted');
        listItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}


// ==========================================================================
// イベントリスナー設定 (Event Setters)
// ==========================================================================

/**
 * 店舗カードリスト内の「地図で確認」ボタンに対するイベントリスナーを設定します。
 * @param {object} handlers - イベントハンドラのオブジェクト。
 * @param {function(string)} handlers.onMapLinkClick - ボタンクリック時のコールバック関数。
 */
export function setupResultListListener(handlers) {
    const resultsArea = document.getElementById('results-area');
    if (resultsArea) {
        resultsArea.addEventListener('click', (e) => {
            // イベント委任で「地図で確認」ボタンのクリックを捕捉
            if (e.target.classList.contains('map-link-btn')) {
                handlers.onMapLinkClick(e.target.dataset.shopId);
            }
        });
    }
}

/**
 * 検索結果ゼロ件時に表示される提案ボタンのイベントリスナーを設定します。
 * @param {function} onWidenSearch - 「範囲を広げる」クリック時のコールバック。
 * @param {function} onClearFilters - 「フィルターをクリア」クリック時のコールバック。
 */
export function setupSuggestionListeners(onWidenSearch, onClearFilters) {
    resultsContainer.addEventListener('click', (e) => {
        if (e.target.id === 'widen-search-btn') {
            onWidenSearch();
        }
        // NOTE: このボタンは結果ゼロ件時にrenderShops関数によって動的に生成される
        if (e.target.id === 'clear-filters-btn-no-results') {
            onClearFilters();
        }
    });
}