type DashboardPageHeaderProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export function DashboardPageHeader({
  title,
  description,
  action,
}: DashboardPageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl">
        <h1 className="text-2xl font-bold text-slate-950 md:text-3xl">{title}</h1>
        {description ? (
          <p className="mt-2 text-sm leading-6 text-slate-600 md:text-base">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
