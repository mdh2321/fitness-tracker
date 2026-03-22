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
              Create a <strong style={{ color: 'var(--fg-secondary)' }}>single REST API automation</strong> for all data:
              <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                <li>URL: <code className="px-1.5 py-0.5 rounded text-xs" style={{ background: 'var(--bg-elevated)', color: '#00bcd4' }}>https://your-domain/api/sync/apple-health</code></li>
                <li>Method: <strong>POST</strong></li>
                <li>Header: <code className="px-1.5 py-0.5 rounded text-xs" style={{ background: 'var(--bg-elevated)', color: '#00bcd4' }}>x-api-key: YOUR_SYNC_API_KEY</code></li>
              </ul>
            </li>
            <li>Select data sources: <strong style={{ color: 'var(--fg-secondary)' }}>Workouts</strong>, <strong style={{ color: 'var(--fg-secondary)' }}>Step Count</strong>, <strong style={{ color: 'var(--fg-secondary)' }}>Sleep Analysis</strong></li>
            <li>For Sleep: aggregate mode with fields: totalSleep, core, deep, rem, sleepStart, sleepEnd, inBed, awake</li>
            <li>Set frequency to <strong style={{ color: 'var(--fg-secondary)' }}>every 1 hour</strong> (or more frequent)</li>
          </ol>

          <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
            Set the <code className="px-1 py-0.5 rounded" style={{ background: 'var(--bg-elevated)' }}>SYNC_API_KEY</code> environment variable to match the header value.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
