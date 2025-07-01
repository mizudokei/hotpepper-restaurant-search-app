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
        // response.okは、HTTPステータスコードが200番台（成功）かどうかを判定します。
        if (!response.ok) {
            // サーバーからのエラーレスポンスの場合、エラーを発生させます。
            throw new Error(`サーバーエラー: ${response.status}`);
        }
        // レスポンスボディをJSONとして解釈し、呼び出し元に返します。
        return await response.json();
    } catch (error) {
        // 通信中のエラーをコンソールに出力します。
        console.error('APIの呼び出しに失敗しました:', error);
        // エラーを呼び出し元に再度スローすることで、呼び出し元でエラーハンドリングできるようにします。
        throw error;
    }
}
