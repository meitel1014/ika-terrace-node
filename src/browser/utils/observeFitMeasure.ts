/**
 * テキスト自動縮小（FitText / JustifyName）用の測定スケジューラ。
 *
 * これらは scrollWidth を測って縮小率を決めるが、フォント（Adobe Typekit / Zen Maru
 * Gothic）は非同期で遅れて適用されるため、フォント適用前に測るとフォールバックフォントの
 * 幅で誤ったスケールに固定され、リロードのたびに大小がばらつく。
 *
 * `document.fonts.ready` は Typekit の非同期注入と解決順序が不定で当てにならないため、
 * `ResizeObserver` で対象要素の実サイズ変化（＝フォント差し替え）を検知して測り直す。
 * これによりフォントがいつ差し替わっても最終結果が決定的になる。
 *
 * @param target  測定対象（縮小 transform をかける内側要素）。この要素のレイアウトboxを監視する。
 * @param measure 測定＋スケール適用を行うコールバック。
 * @returns useEffect の return で呼ぶクリーンアップ関数。
 *
 * 注意: `target` には縮小 transform をかけるが、ResizeObserver が報告するのは transform 前の
 * レイアウト box なので、自前のスケール適用では再発火せずループしない（フォント/文字変更時のみ発火）。
 */
export function observeFitMeasure(target: Element, measure: () => void): () => void {
  let cancelled = false;
  const run = () => {
    if (!cancelled) measure();
  };

  // 初回測定（レイアウト反映後）
  const raf = requestAnimationFrame(run);

  // フォント差し替え等で対象のサイズが変わるたびに測り直す
  const ro = new ResizeObserver(run);
  ro.observe(target);

  return () => {
    cancelled = true;
    cancelAnimationFrame(raf);
    ro.disconnect();
  };
}
