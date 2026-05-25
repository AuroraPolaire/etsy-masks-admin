type AppSectionHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export const AppSectionHeader = ({ eyebrow, title, description }: AppSectionHeaderProps) => (
  <div>
    <p className="text-xs font-semibold uppercase tracking-widest text-brand-strong">{eyebrow}</p>
    <h2 className="mt-1 text-2xl font-bold text-ink-strong">{title}</h2>
    <p className="mt-1 max-w-3xl text-sm text-ink-muted">{description}</p>
  </div>
);
