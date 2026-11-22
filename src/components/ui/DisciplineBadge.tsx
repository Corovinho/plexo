import { getDisciplineHex } from '@/data/facapeDefaults';

interface DisciplineBadgeProps {
  category: string;
  customColor?: string | null;
  size?: 'xs' | 'sm';
}

export function DisciplineBadge({ category, customColor, size = 'xs' }: DisciplineBadgeProps) {
  const hex = getDisciplineHex(category, customColor);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold tracking-wide ${
        size === 'xs' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
      }`}
      style={{
        backgroundColor: `${hex}1F`,
        color: hex,
        border: `1px solid ${hex}38`,
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: hex }} />
      {category}
    </span>
  );
}
