interface SectionHeaderProps {
  children: React.ReactNode;
}

export function SectionHeader({ children }: SectionHeaderProps) {
  return (
    <div className="mb-3">
      <div className="font-mono text-xs font-light uppercase tracking-[1px] text-foreground">
        {children}
      </div>
      <div className="mt-1.5 h-px bg-border" />
    </div>
  );
}
