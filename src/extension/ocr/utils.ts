/**
 * 重い同期処理（全画面テンプレートマッチ）の合間にイベントループを解放するための yield。
 * テンプレート 1 枚ごとに await して、NodeCG のリクエスト処理を詰まらせないようにする。
 */
export const yieldToEventLoop = (): Promise<void> => new Promise((r) => setImmediate(r));
