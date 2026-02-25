interface ProseBlockProps {
  label: string;
  children: React.ReactNode;
  badge?: React.ReactNode;
}

export function ProseBlock({ label, children, badge }: ProseBlockProps) {
  return (
    <div>
      <h3 className="flex items-center gap-2 mb-2 font-mono text-sm font-normal uppercase tracking-[1px] text-primary">
        {label}
        {badge}
      </h3>
      <div className="text-sm text-muted-foreground leading-relaxed mb-6">
        {children}
      </div>
    </div>
  );
}
