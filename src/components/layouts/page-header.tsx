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
        <h1 className="text-2xl font-semibold tracking-normal text-foreground">{title}</h1>
        {description ? <p className="text-sm leading-6 text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}
