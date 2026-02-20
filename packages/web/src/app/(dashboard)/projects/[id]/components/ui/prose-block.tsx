interface ProseBlockProps {
  label: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
}

export function ProseBlock({ label, children, icon, badge }: ProseBlockProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1 text-[11px] font-semibold uppercase tracking-[.07em] text-muted-foreground font-mono">
        {icon}
        {label}
        {badge}
      </div>
      <div className="text-sm text-muted-foreground leading-relaxed mb-6">
        {children}
      </div>
    </div>
  );
}
