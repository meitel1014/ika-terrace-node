import { useState } from 'react';
import { useReplicant } from '@/browser/hooks/useReplicant';
import { FitText } from '@/browser/components/FitText';
import { castIconUrl } from './castIconUrl';
import type { CastMembers } from '@/schemas';

type Props = {
  layoutClass: string;
};

const EMPTY: CastMembers = {
  announcer: '',
  commentator: '',
  operator: '',
  observer: '',
};

/** アイコン（円形・左）＋ 名前（FitText で等比縮小・中央寄せ）を横並びに表示する。 */
function CastIconName({ name }: { name: string }) {
  // 名前が変わったらエラー状態をリセットするため key に name を使う（下の呼び出し側で付与）。
  const [failed, setFailed] = useState(false);

  return (
    <>
      {name && (
        <div className="cast-icon">
          {!failed && (
            <img src={castIconUrl(name)} alt="" onError={() => setFailed(true)} />
          )}
        </div>
      )}
      <FitText html={name} align="left" className="cast-name" />
    </>
  );
}

export function CastGraphic({ layoutClass }: Props) {
  const [members] = useReplicant('castMembers');
  const m = members ?? EMPTY;

  return (
    <div className={`cast-graphic ${layoutClass}`}>
      <div className="role role--announcer">
        <CastIconName key={m.announcer} name={m.announcer} />
      </div>
      <div className="role role--commentator">
        <CastIconName key={m.commentator} name={m.commentator} />
      </div>
    </div>
  );
}
