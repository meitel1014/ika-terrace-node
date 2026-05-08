import { useRef, useEffect, useState, type HTMLAttributes } from 'react';

type Props = {
  name: string;
} & Omit<HTMLAttributes<HTMLDivElement>, 'children'>;

/**
 * 担当者名を固定幅枠に表示する。
 * - 短い名前: text-align-last:justify で枠内両端揃え
 * - 長い名前: 枠をはみ出す場合のみ scaleX で横方向だけ圧縮（縦サイズ維持）
 */
export function JustifyName({ name, style, ...rest }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLSpanElement>(null);
  const [scaleX, setScaleX] = useState(1);

  useEffect(() => {
    const container = containerRef.current;
    const inner = innerRef.current;
    if (!container || !inner) return;

    inner.style.transform = 'none';
    const id = requestAnimationFrame(() => {
      const contentWidth = inner.scrollWidth;
      const availableWidth = container.clientWidth;
      const ratio = contentWidth > availableWidth && contentWidth > 0
        ? availableWidth / contentWidth
        : 1;
      setScaleX(ratio);
    });
    return () => cancelAnimationFrame(id);
  }, [name]);

  return (
    <div
      ref={containerRef}
      style={{
        textAlign: 'justify',
        textAlignLast: 'justify',
        overflow: 'hidden',
        ...style,
      }}
      {...rest}
    >
      <span
        ref={innerRef}
        style={{
          display: 'inline-block',
          whiteSpace: 'nowrap',
          transform: `scaleX(${scaleX})`,
          transformOrigin: 'left top',
        }}
      >
        {name}
      </span>
    </div>
  );
}
