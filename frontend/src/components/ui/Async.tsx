import type { ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { apiError } from '@/lib/api';
import { Button, Spinner } from './primitives';

export function Loading({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-text-mute">
      <Spinner className="h-4 w-4" />
      <span className="text-[13px]">{label}</span>
    </div>
  );
}

export function LoadError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-line px-6 py-10 text-center">
      <p className="text-[14px] text-text-dim">{apiError(error)}</p>
      <Button variant="secondary" onClick={onRetry}>
        Tentar de novo
      </Button>
    </div>
  );
}

/** Render children only once the query has data; otherwise loading/error UI. */
export function QueryBoundary<T>({
  query,
  children,
  loadingLabel,
}: {
  query: UseQueryResult<T>;
  children: (data: T) => ReactNode;
  loadingLabel?: string;
}) {
  if (query.isLoading) return <Loading label={loadingLabel} />;
  if (query.isError) return <LoadError error={query.error} onRetry={() => query.refetch()} />;
  return <>{children(query.data as T)}</>;
}
