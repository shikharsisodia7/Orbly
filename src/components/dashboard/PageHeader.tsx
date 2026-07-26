import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  count?: number;
  action?: ReactNode;
}

export function PageHeader({ title, subtitle, count, action }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-ink">
          {title}
          {count !== undefined && (
            <span className="rounded-full bg-surface px-2.5 py-0.5 text-sm font-medium text-ink-soft">
              {count}
            </span>
          )}
        </h1>
        {subtitle && <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
