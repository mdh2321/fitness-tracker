'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Smartphone } from 'lucide-react';

export function SetupCard() {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <Smartphone className="h-5 w-5" style={{ color: 'var(--fg-muted)' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Auto Import Setup</span>
        </div>

        <div className="space-y-3 text-sm" style={{ color: 'var(--fg-secondary)' }}>
          <p>Use <strong style={{ color: 'var(--fg)' }}>Health Auto Export</strong> (iOS) to automatically sync Apple Health sleep data.</p>

          <ol className="list-decimal list-inside space-y-2" style={{ color: 'var(--fg-muted)' }}>
            <li>Install <strong style={{ color: 'var(--fg-secondary)' }}>Health Auto Export</strong> from the App Store</li>
            <li>
              Set up a REST API automation:
              <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                <li>URL: <code className="px-1.5 py-0.5 rounded text-xs" style={{ background: 'var(--bg-elevated)', color: '#00bcd4' }}>https://your-domain/api/sleep/sync</code></li>
                <li>Method: <strong>POST</strong></li>
                <li>Header: <code className="px-1.5 py-0.5 rounded text-xs" style={{ background: 'var(--bg-elevated)', color: '#00bcd4' }}>x-api-key: YOUR_SYNC_API_KEY</code></li>
              </ul>
            </li>
            <li>Select <strong style={{ color: 'var(--fg-secondary)' }}>Sleep Analysis</strong> as the data source</li>
            <li>Choose aggregate mode with fields: totalSleep, core, deep, rem, sleepStart, sleepEnd, inBed</li>
            <li>Set frequency to daily</li>
          </ol>

          <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
            Set the <code className="px-1 py-0.5 rounded" style={{ background: 'var(--bg-elevated)' }}>SYNC_API_KEY</code> environment variable to match the header value.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
