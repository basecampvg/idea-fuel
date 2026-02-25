import type { LucideIcon } from 'lucide-react';

interface SectionTitleProps {
  icon: LucideIcon;
  label: string;
  color?: string;
  className?: string;
}

export function SectionTitle({ icon: Icon, label, color = 'primary', className = '' }: SectionTitleProps) {
  return (
    <div className={`flex items-center gap-2 mb-3 ${className}`}>
      <Icon className={`w-4 h-4 text-${color}`} />
      <p className={`text-sm font-medium uppercase text-${color}`}>{label}</p>
    </div>
  );
}
