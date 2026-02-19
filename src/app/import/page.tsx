'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { parseAppleHealthXML } from '@/lib/apple-health-parser';
import { WORKOUT_TYPE_LABELS } from '@/lib/constants';
import { Upload, FileText, Check, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import type { AppleHealthWorkout } from '@/lib/types';
import type { WorkoutType } from '@/lib/constants';

export default function ImportPage() {
  const [workouts, setWorkouts] = useState<AppleHealthWorkout[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [fileName, setFileName] = useState('');

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setParsing(true);
    setResult(null);

    try {
      let xmlContent: string;

      if (file.name.endsWith('.zip')) {
        const { unzipSync } = await import('fflate');
        const buffer = await file.arrayBuffer();
        const unzipped = unzipSync(new Uint8Array(buffer));
        const exportFile = Object.keys(unzipped).find((k) => k.includes('export.xml') || k.includes('Export.xml'));
        if (!exportFile) {
          toast.error('No export.xml found in ZIP');
          setParsing(false);
          return;
        }
        xmlContent = new TextDecoder().decode(unzipped[exportFile]);
      } else {
        xmlContent = await file.text();
      }

      const parsed = parseAppleHealthXML(xmlContent);
      setWorkouts(parsed);

      if (parsed.length === 0) {
        toast.error('No workouts found in file');
      } else {
        toast.success(`Found ${parsed.length} workouts`);
      }
    } catch (err) {
      toast.error('Failed to parse file');
      console.error(err);
    } finally {
      setParsing(false);
    }
  }, []);

  const toggleWorkout = (index: number) => {
    setWorkouts((prev) => prev.map((w, i) => i === index ? { ...w, selected: !w.selected } : w));
  };

  const toggleAll = () => {
    const allSelected = workouts.every((w) => w.selected);
    setWorkouts((prev) => prev.map((w) => ({ ...w, selected: !allSelected })));
  };

  const handleImport = async () => {
    const selected = workouts.filter((w) => w.selected);
    if (selected.length === 0) {
      toast.error('No workouts selected');
      return;
    }

    setImporting(true);
    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workouts }),
      });
      const data = await res.json();
      setResult(data);
      toast.success(`Imported ${data.imported} workouts`);
    } catch {
      toast.error('Import failed');
    } finally {
      setImporting(false);
    }
  };

  const selectedCount = workouts.filter((w) => w.selected).length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-100">Import from Apple Health</h1>

      {/* Upload area */}
      {workouts.length === 0 && !result && (
        <Card>
          <CardContent className="py-12">
            <label className="flex flex-col items-center justify-center cursor-pointer group">
              <div className="w-16 h-16 rounded-full bg-[#1a1a24] flex items-center justify-center mb-4 group-hover:bg-[#222230] transition-colors">
                {parsing ? (
                  <Loader2 className="h-8 w-8 text-[#00d26a] animate-spin" />
                ) : (
                  <Upload className="h-8 w-8 text-[#00d26a]" />
                )}
              </div>
              <p className="text-gray-200 font-medium mb-1">
                {parsing ? 'Parsing...' : 'Upload Apple Health Export'}
              </p>
              <p className="text-sm text-gray-500">Drop export.xml or export.zip here</p>
              <input
                type="file"
                accept=".xml,.zip"
                onChange={handleFileChange}
                className="hidden"
                disabled={parsing}
              />
            </label>
          </CardContent>
        </Card>
      )}

      {/* Preview table */}
      {workouts.length > 0 && !result && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Preview</CardTitle>
                <CardDescription>
                  <FileText className="inline h-3.5 w-3.5 mr-1" />
                  {fileName} - {workouts.length} workouts found
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={toggleAll}>
                  {workouts.every((w) => w.selected) ? 'Deselect All' : 'Select All'}
                </Button>
                <Button size="sm" onClick={handleImport} disabled={importing || selectedCount === 0}>
                  {importing ? (
                    <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Importing...</>
                  ) : (
                    <>Import {selectedCount} Workouts</>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-h-[500px] overflow-y-auto space-y-1">
              {workouts.map((w, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 p-2 rounded-lg hover:bg-[#1a1a24] transition-colors ${
                    !w.selected ? 'opacity-50' : ''
                  }`}
                >
                  <Checkbox checked={w.selected} onCheckedChange={() => toggleWorkout(i)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-200 truncate">{w.name}</span>
                      <Badge variant={w.type as WorkoutType} className="text-[10px]">
                        {WORKOUT_TYPE_LABELS[w.type]}
                      </Badge>
                    </div>
                    <span className="text-xs text-gray-500">
                      {format(new Date(w.startDate), 'MMM d, yyyy h:mm a')} - {w.duration}min
                      {w.calories && ` - ${w.calories} kcal`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Result */}
      {result && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-[#00d26a]/10 flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-[#00d26a]" />
            </div>
            <h2 className="text-xl font-semibold text-gray-100 mb-2">Import Complete</h2>
            <p className="text-gray-400">
              {result.imported} workouts imported, {result.skipped} skipped (duplicates or deselected)
            </p>
            <Button className="mt-6" onClick={() => { setWorkouts([]); setResult(null); }}>
              Import More
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
