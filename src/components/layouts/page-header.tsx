export function PageHeader({
  title,
  description,
  actions,
}: Readonly<{
  title: string;
  description?: string;
  actions?: React.ReactNode;
}>) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex max-w-3xl flex-col gap-2">
        <h1 className="text-4xl font-black tracking-tight text-cars-navy">{title}</h1>
        {description ? <p className="text-base leading-7 text-slate-600">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}
