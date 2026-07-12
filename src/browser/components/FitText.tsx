import { useRef, useEffect, useState, type HTMLAttributes } from 'react';
import { observeFitMeasure } from '../utils/observeFitMeasure';

type Props = {
  /** レンダリングする生 HTML 文字列 */
  html: string;
  /** transform-origin の水平位置。左寄せなら 'left'、右寄せなら 'right' */
  align?: 'left' | 'right';
} & Omit<HTMLAttributes<HTMLDivElement>, 'dangerouslySetInnerHTML' | 'children'>;

/**
 * テキストが親の幅を超えたら自動で縮小して収める。
 * 内部で scrollWidth と clientWidth を比較し、
 * はみ出していれば transform: scale() で縮小する。
 */
export function FitText({ html, align = 'left', style, ...rest }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLSpanElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const container = containerRef.current;
    const inner = innerRef.current;
    if (!container || !inner) return;

    // フォント差し替え（Typekit の遅延適用）を ResizeObserver で検知して測り直す
    return observeFitMeasure(inner, () => {
      // 一旦高さをリセットしてから測定する
      container.style.height = 'auto';
      const contentWidth = inner.scrollWidth;
      const availableWidth = container.clientWidth;
      const contentHeight = inner.scrollHeight;
      // 親要素に固定高さがある場合は縦方向の制約として使う
      const availableHeight = container.parentElement?.clientHeight ?? 0;

      let newScale = 1;
      if (contentWidth > availableWidth && contentWidth > 0) {
        newScale = Math.min(newScale, availableWidth / contentWidth);
      }
      if (availableHeight > 0 && contentHeight > availableHeight) {
        newScale = Math.min(newScale, availableHeight / contentHeight);
      }
      setScale(newScale);
      // コンテナの高さを視覚サイズに合わせる（transform はレイアウトに影響しないため）
      container.style.height = `${contentHeight * newScale}px`;
    });
  }, [html]);

  const origin = align === 'right' ? 'right top' : 'left top';

  return (
    <div ref={containerRef} style={{ ...style }} {...rest}>
      <span
        ref={innerRef}
        style={{
          display: 'inline-block',
          whiteSpace: 'nowrap',
          transform: `scale(${scale})`,
          transformOrigin: origin,
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
