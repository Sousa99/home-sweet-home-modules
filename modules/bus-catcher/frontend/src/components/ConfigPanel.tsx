import { useState } from 'react';
import {
  useAddStop,
  useConfig,
  useLines,
  useRemoveStop,
  useStop,
  useUpdateStop,
} from '../api/queries';
import type { ConfigStop, LineOption, Stop } from '../api/types';
import { cn } from '../lib/utils';
import { StopSearch } from './StopSearch';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

/** A line-filter token: `shortName` (any direction) or `shortName:directionId`. */
function lineToken(line: LineOption): string {
  return line.directionId === null || line.directionId === undefined
    ? line.shortName
    : `${line.shortName}:${line.directionId}`;
}

function lineLabel(line: LineOption): string {
  return line.headsign ? `${line.shortName} → ${line.headsign}` : line.shortName;
}

function mutationError(err: unknown): string {
  const code = err && typeof err === 'object' ? (err as { code?: unknown }).code : undefined;
  if (code === 'duplicate_stop') return 'This stop is already configured.';
  if (code === 'unknown_line') return 'Some selected lines no longer exist.';
  if (typeof code === 'string') return `Could not save: ${code}`;
  return 'Something went wrong. Please try again.';
}

export function ConfigPanel() {
  const config = useConfig();
  const addStop = useAddStop();
  const [selected, setSelected] = useState<Stop | null>(null);
  const [lineFilter, setLineFilter] = useState<string[]>([]);
  const stopQuery = useStop(selected?.id ?? null);
  const stops = config.data?.stops ?? [];

  const servingLines = stopQuery.data?.stop.lines ?? [];

  function toggleLine(token: string) {
    setLineFilter((prev) =>
      prev.includes(token) ? prev.filter((l) => l !== token) : [...prev, token],
    );
  }

  function selectStop(stop: Stop) {
    setSelected(stop);
    setLineFilter([]);
  }

  async function save() {
    if (!selected) return;
    try {
      await addStop.mutateAsync({ stopId: selected.id, lineFilter });
      setSelected(null);
      setLineFilter([]);
    } catch {
      // error is surfaced inline below; keep the selection so the user can retry
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Add a stop</CardTitle>
        </CardHeader>
        <CardContent>
          <StopSearch onSelect={selectStop} />
          {selected && (
            <div className="mt-3 rounded-lg border border-slate-200 p-3">
              <p className="text-sm font-medium text-slate-700">{selected.name}</p>
              {servingLines.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-slate-500">Filter by line and direction (optional)</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {servingLines.map((line) => (
                      <Button
                        key={`${line.shortName}:${line.directionId ?? 'any'}`}
                        size="sm"
                        variant={lineFilter.includes(lineToken(line)) ? 'default' : 'secondary'}
                        onClick={() => toggleLine(lineToken(line))}
                      >
                        {lineLabel(line)}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              <Button className="mt-3" onClick={save} disabled={addStop.isPending}>
                {addStop.isPending ? 'Saving…' : 'Save stop'}
              </Button>
              {addStop.isError && (
                <p className="mt-2 text-sm text-red-600" role="alert">
                  {mutationError(addStop.error)}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Configured stops ({stops.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {stops.length === 0 ? (
            <p className="text-sm text-slate-500">
              No stops configured yet. Search above to add one.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {stops.map((item, index) => (
                <ConfigStopRow key={item.id} item={item} index={index} stops={stops} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ConfigStopRow({
  item,
  index,
  stops,
}: {
  item: ConfigStop;
  index: number;
  stops: ConfigStop[];
}) {
  const update = useUpdateStop();
  const remove = useRemoveStop();
  const lines = useLines();
  const [editing, setEditing] = useState(false);

  const knownLines = new Set((lines.data?.lines ?? []).map((l) => l.shortName));
  const missingLines = item.lineFilter.filter((token) => !knownLines.has(token.split(':')[0]!));

  async function move(dir: -1 | 1) {
    const other = stops[index + dir];
    if (!other) return;
    await update.mutateAsync({
      id: item.id,
      body: { displayOrder: other.displayOrder },
    });
    await update.mutateAsync({
      id: other.id,
      body: { displayOrder: item.displayOrder },
    });
  }

  async function toggleEnabled() {
    await update.mutateAsync({ id: item.id, body: { enabled: !item.enabled } });
  }

  return (
    <li className="py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <span
            className={cn(
              'text-sm font-medium text-slate-700',
              (!item.enabled || item.missing) && 'text-slate-400',
            )}
          >
            {item.stop.name}
          </span>
          {item.missing && <Badge className="ml-2 bg-red-100 text-red-700">no longer found</Badge>}
          {item.lineFilter.length > 0 && (
            <Badge className="ml-2">{item.lineFilter.join(', ')}</Badge>
          )}
          {missingLines.length > 0 && (
            <span className="ml-2 text-xs text-red-600">
              lines {missingLines.join(', ')} no longer exist
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            aria-label={`Move ${item.stop.name} up`}
            disabled={index === 0}
            onClick={() => void move(-1)}
          >
            ↑
          </Button>
          <Button
            size="sm"
            variant="ghost"
            aria-label={`Move ${item.stop.name} down`}
            disabled={index === stops.length - 1}
            onClick={() => void move(1)}
          >
            ↓
          </Button>
          <Button size="sm" variant="outline" onClick={() => setEditing((v) => !v)}>
            Edit
          </Button>
          <Button size="sm" variant="outline" onClick={() => void toggleEnabled()}>
            {item.enabled ? 'Disable' : 'Enable'}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            aria-label={`Remove ${item.stop.name}`}
            onClick={() => void remove.mutateAsync(item.id)}
          >
            Remove
          </Button>
        </div>
      </div>
      {editing && <EditFilter item={item} onDone={() => setEditing(false)} />}
    </li>
  );
}

function EditFilter({ item, onDone }: { item: ConfigStop; onDone: () => void }) {
  const stopQuery = useStop(item.stop.id);
  const update = useUpdateStop();
  const [filter, setFilter] = useState(item.lineFilter);
  const servingLines = stopQuery.data?.stop.lines ?? [];

  function toggle(token: string) {
    setFilter((prev) =>
      prev.includes(token) ? prev.filter((l) => l !== token) : [...prev, token],
    );
  }

  async function save() {
    try {
      await update.mutateAsync({ id: item.id, body: { lineFilter: filter } });
      onDone();
    } catch {
      // error is surfaced inline below; keep the panel open so the user can retry
    }
  }

  return (
    <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs text-slate-500">Lines shown for this stop</p>
      {servingLines.length === 0 ? (
        <p className="mt-1 text-xs text-slate-400">No line info available.</p>
      ) : (
        <div className="mt-1 flex flex-wrap gap-1.5">
          {servingLines.map((line) => (
            <Button
              key={`${line.shortName}:${line.directionId ?? 'any'}`}
              size="sm"
              variant={filter.includes(lineToken(line)) ? 'default' : 'secondary'}
              onClick={() => toggle(lineToken(line))}
            >
              {lineLabel(line)}
            </Button>
          ))}
        </div>
      )}
      <div className="mt-2 flex gap-2">
        <Button size="sm" onClick={() => void save()} disabled={update.isPending}>
          {update.isPending ? 'Saving…' : 'Save'}
        </Button>
        <Button size="sm" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
      {update.isError && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {mutationError(update.error)}
        </p>
      )}
    </div>
  );
}
