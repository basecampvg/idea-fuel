'use client';

import { use, useState, useCallback } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Spinner } from '@/components/ui/spinner';
import {
  FileSpreadsheet,
  FileText,
  Download,
  Sparkles,
  Pencil,
  RefreshCw,
  Check,
  ChevronDown,
} from 'lucide-react';

type ExportPurpose = 'investor' | 'loan' | 'internal';

const PURPOSE_OPTIONS: { value: ExportPurpose; label: string; description: string }[] = [
  { value: 'investor', label: 'Investor Pitch', description: 'Growth-focused, confident tone with unit economics' },
  { value: 'loan', label: 'Loan Application', description: 'Conservative, emphasizing cash flow and stability' },
  { value: 'internal', label: 'Internal Planning', description: 'Balanced, analytical with key risks highlighted' },
];

export default function ExportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: modelId } = use(params);

  const [purpose, setPurpose] = useState<ExportPurpose>('investor');
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [narratives, setNarratives] = useState<{
    executiveSummary?: string;
    revenueAnalysis?: string;
    costAnalysis?: string;
    cashPosition?: string;
  } | null>(null);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [showPurposeDropdown, setShowPurposeDropdown] = useState(false);

  // Fetch model with scenarios
  const { data: model, isLoading: modelLoading } = trpc.financial.get.useQuery({ id: modelId });

  const baseScenarioId = selectedScenarioId ?? model?.scenarios?.find((s: { isBase: boolean }) => s.isBase)?.id;

  // Mutations
  const narrativeMutation = trpc.export.generateNarratives.useMutation({
    onSuccess: (data) => setNarratives(data),
  });

  const excelMutation = trpc.export.generateExcel.useMutation({
    onSuccess: (data) => downloadFile(data.buffer, data.filename, data.contentType),
  });

  const pdfMutation = trpc.export.generatePDF.useMutation({
    onSuccess: (data) => downloadFile(data.buffer, data.filename, data.contentType),
  });

  // Download helper: convert base64 to blob and trigger download
  const downloadFile = useCallback((base64: string, filename: string, contentType: string) => {
    const bytes = atob(base64);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    const blob = new Blob([arr], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const handleGenerateNarratives = useCallback(() => {
    if (!baseScenarioId) return;
    narrativeMutation.mutate({ modelId, scenarioId: baseScenarioId, purpose });
  }, [modelId, baseScenarioId, purpose, narrativeMutation]);

  const handleExcelExport = useCallback(() => {
    if (!baseScenarioId) return;
    excelMutation.mutate({ modelId, scenarioId: baseScenarioId });
  }, [modelId, baseScenarioId, excelMutation]);

  const handlePDFExport = useCallback(() => {
    if (!baseScenarioId) return;
    pdfMutation.mutate({
      modelId,
      scenarioId: baseScenarioId,
      purpose,
      narratives: narratives ?? undefined,
    });
  }, [modelId, baseScenarioId, purpose, narratives, pdfMutation]);

  const handleEditSave = useCallback((section: string) => {
    setNarratives((prev) => prev ? { ...prev, [section]: editText } : null);
    setEditingSection(null);
    setEditText('');
  }, [editText]);

  const startEdit = useCallback((section: string, text: string) => {
    setEditingSection(section);
    setEditText(text);
  }, []);

  if (modelLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner className="w-6 h-6" />
      </div>
    );
  }

  if (!model) {
    return <div className="p-6 text-zinc-500">Model not found.</div>;
  }

  const scenarios = model.scenarios ?? [];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Export</h1>
        <p className="text-zinc-400 mt-1">Generate investor-ready Excel and PDF exports</p>
      </div>

      {/* Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Scenario selector */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">Scenario</label>
          <select
            value={baseScenarioId ?? ''}
            onChange={(e) => setSelectedScenarioId(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-pink-500/50"
          >
            {scenarios.map((s: { id: string; name: string; isBase: boolean }) => (
              <option key={s.id} value={s.id}>
                {s.name}{s.isBase ? ' (Base)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Purpose selector */}
        <div className="relative">
          <label className="block text-sm font-medium text-zinc-300 mb-2">Purpose</label>
          <button
            onClick={() => setShowPurposeDropdown(!showPurposeDropdown)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-left text-zinc-100 flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-pink-500/50"
          >
            <span>{PURPOSE_OPTIONS.find((p) => p.value === purpose)?.label}</span>
            <ChevronDown className="w-4 h-4 text-zinc-400" />
          </button>
          {showPurposeDropdown && (
            <div className="absolute z-10 mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl">
              {PURPOSE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setPurpose(opt.value); setShowPurposeDropdown(false); setNarratives(null); }}
                  className={`w-full px-3 py-2 text-left hover:bg-zinc-700 first:rounded-t-lg last:rounded-b-lg ${
                    purpose === opt.value ? 'bg-zinc-700/50' : ''
                  }`}
                >
                  <div className="text-zinc-100 text-sm font-medium">{opt.label}</div>
                  <div className="text-zinc-500 text-xs">{opt.description}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Export Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Excel Export Card */}
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-semibold text-zinc-100">Excel Workbook</h3>
              <p className="text-xs text-zinc-500">Interactive with named ranges</p>
            </div>
          </div>
          <p className="text-sm text-zinc-400 mb-4">
            Full workbook with Dashboard, Assumptions, P&L, Balance Sheet, and Cash Flow sheets.
            Named ranges for assumption cells.
          </p>
          <button
            onClick={handleExcelExport}
            disabled={!baseScenarioId || excelMutation.isPending}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            {excelMutation.isPending ? (
              <><Spinner className="w-4 h-4" /> Generating...</>
            ) : (
              <><Download className="w-4 h-4" /> Download .xlsx</>
            )}
          </button>
          {excelMutation.isError && (
            <p className="text-red-400 text-xs mt-2">{excelMutation.error.message}</p>
          )}
        </div>

        {/* PDF Export Card */}
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-pink-500/10 rounded-lg">
              <FileText className="w-6 h-6 text-pink-400" />
            </div>
            <div>
              <h3 className="font-semibold text-zinc-100">PDF Investor Deck</h3>
              <p className="text-xs text-zinc-500">With AI-generated narratives</p>
            </div>
          </div>
          <p className="text-sm text-zinc-400 mb-4">
            Professional multi-page PDF with cover, executive summary, financial tables,
            key metrics, and assumptions.
          </p>
          <button
            onClick={handlePDFExport}
            disabled={!baseScenarioId || pdfMutation.isPending}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-pink-600 hover:bg-pink-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            {pdfMutation.isPending ? (
              <><Spinner className="w-4 h-4" /> Generating...</>
            ) : (
              <><Download className="w-4 h-4" /> Download .pdf</>
            )}
          </button>
          {pdfMutation.isError && (
            <p className="text-red-400 text-xs mt-2">{pdfMutation.error.message}</p>
          )}
        </div>
      </div>

      {/* AI Narratives Preview/Edit */}
      <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-500/10 rounded-lg">
              <Sparkles className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h3 className="font-semibold text-zinc-100">AI Narratives</h3>
              <p className="text-xs text-zinc-500">Preview and edit before PDF export</p>
            </div>
          </div>
          <button
            onClick={handleGenerateNarratives}
            disabled={!baseScenarioId || narrativeMutation.isPending}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            {narrativeMutation.isPending ? (
              <><Spinner className="w-3 h-3" /> Generating...</>
            ) : narratives ? (
              <><RefreshCw className="w-3 h-3" /> Regenerate</>
            ) : (
              <><Sparkles className="w-3 h-3" /> Generate</>
            )}
          </button>
        </div>

        {narrativeMutation.isError && (
          <p className="text-red-400 text-sm mb-4">{narrativeMutation.error.message}</p>
        )}

        {narratives ? (
          <div className="space-y-4">
            {(
              [
                ['executiveSummary', 'Executive Summary'],
                ['revenueAnalysis', 'Revenue Analysis'],
                ['costAnalysis', 'Cost Analysis'],
                ['cashPosition', 'Cash Position'],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="border border-zinc-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-zinc-300">{label}</h4>
                  {editingSection === key ? (
                    <button
                      onClick={() => handleEditSave(key)}
                      className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300"
                    >
                      <Check className="w-3 h-3" /> Save
                    </button>
                  ) : (
                    <button
                      onClick={() => startEdit(key, narratives[key] ?? '')}
                      className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300"
                    >
                      <Pencil className="w-3 h-3" /> Edit
                    </button>
                  )}
                </div>
                {editingSection === key ? (
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={4}
                    className="w-full bg-zinc-900 border border-zinc-600 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-y"
                  />
                ) : (
                  <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap">
                    {narratives[key] || '—'}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-zinc-500 text-sm">
            Generate AI narratives to include in your PDF export. You can edit them before downloading.
          </p>
        )}
      </div>
    </div>
  );
}
