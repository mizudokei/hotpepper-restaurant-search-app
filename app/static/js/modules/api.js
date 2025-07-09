/**
 * バックエンドの検索APIにリクエストを送信し、結果を返します。
 * @param {URLSearchParams} params - 検索クエリパラメータ
 * @returns {Promise<object>} - APIから返されたレスポンスのJSONデータ
 * @throws {Error} - APIの呼び出しに失敗した場合
 */
export async function fetchRestaurants(params) {
    try {
        // fetch APIを使い、指定されたパラメータでバックエンドにリクエストを送信します。
        const response = await fetch(`/api/search?${params}`);
        if (!response.ok) {
            throw new Error(`サーバーエラー: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('APIの呼び出しに失敗しました:', error);
        throw error;
    }
}
