'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileJson, FileSpreadsheet } from 'lucide-react';

export function ExportCard() {
  const [exporting, setExporting] = useState<'json' | 'csv' | null>(null);

  const handleExport = async (format: 'json' | 'csv') => {
    setExporting(format);
    try {
      const res = await fetch(`/api/export?format=${format}`);
      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition') || '';
      const match = disposition.match(/filename="(.+)"/);
      const filename = match?.[1] || `arc-export.${format === 'csv' ? 'zip' : 'json'}`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      localStorage.setItem('arc-last-export', new Date().toISOString());
    } catch {
      // silently fail — the download just won't happen
    } finally {
      setExporting(null);
    }
  };

  const lastExport = typeof window !== 'undefined' ? localStorage.getItem('arc-last-export') : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Export Data
        </CardTitle>
        <CardDescription>Download all your Arc data for backup or portability</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => handleExport('json')}
            disabled={exporting !== null}
            className="flex-1"
          >
            <FileJson className="mr-2 h-4 w-4" />
            {exporting === 'json' ? 'Exporting…' : 'Export JSON'}
          </Button>
          <Button
            variant="outline"
            onClick={() => handleExport('csv')}
            disabled={exporting !== null}
            className="flex-1"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            {exporting === 'csv' ? 'Exporting…' : 'Export CSV'}
          </Button>
        </div>
        {lastExport && (
          <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
            Last export: {new Date(lastExport).toLocaleDateString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
