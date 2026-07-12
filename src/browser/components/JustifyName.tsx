import { useRef, useEffect, useState, type HTMLAttributes } from 'react';
import { observeFitMeasure } from '../utils/observeFitMeasure';

type Props = {
  name: string;
} & Omit<HTMLAttributes<HTMLDivElement>, 'children'>;

/**
 * 担当者名を固定幅枠に表示する。
 * - 短い名前: text-align-last:justify で枠内両端揃え
 * - 長い名前: 枠をはみ出す場合のみ scaleX で横方向だけ圧縮（縦サイズ維持）
 */
export function JustifyName({ name, style, className, ...rest }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLSpanElement>(null);
  const [scaleX, setScaleX] = useState(1);

  useEffect(() => {
    const container = containerRef.current;
    const inner = innerRef.current;
    if (!container || !inner) return;

    // フォント差し替え（Typekit の遅延適用）を ResizeObserver で検知して測り直す
    return observeFitMeasure(inner, () => {
      const contentWidth = inner.scrollWidth;
      const availableWidth = container.clientWidth;
      const ratio = contentWidth > availableWidth && contentWidth > 0
        ? availableWidth / contentWidth
        : 1;
      setScaleX(ratio);
    });
  }, [name]);

  return (
    <div
      ref={containerRef}
      className={`justify-name${className ? ` ${className}` : ''}`}
      style={{
        textAlign: 'center',
        overflow: 'hidden',
        ...style,
      }}
      {...rest}
    >
      <span
        ref={innerRef}
        style={{
          display: 'block',
          whiteSpace: 'nowrap',
          transform: `scaleX(${scaleX})`,
          transformOrigin: 'left center',
        }}
      >
        {name}
      </span>
    </div>
  );
}
