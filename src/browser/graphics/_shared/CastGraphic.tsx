import { useReplicant } from '@/browser/hooks/useReplicant';
import { JustifyName } from '@/browser/components/JustifyName';
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

export function CastGraphic({ layoutClass }: Props) {
  const [members] = useReplicant('castMembers');
  const m = members ?? EMPTY;

  return (
    <div className={`cast-graphic ${layoutClass}`}>
      <div className="role role--announcer">
        <JustifyName name={m.announcer} />
      </div>
      <div className="role role--commentator">
        <JustifyName name={m.commentator} />
      </div>
      <div className="role role--operator">
        <JustifyName name={m.operator} />
      </div>
      <div className="role role--observer">
        <JustifyName name={m.observer} />
      </div>
    </div>
  );
}
