import { useIntegratedText } from '../i18n/useIntegratedText';
import React, { useRef, useEffect, useState } from 'react';
import { ScienceReportData } from '../types/mission';
import { sounds } from '../utils/audio';
import {
  Activity,
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Flame,
  Radio,
  RotateCcw,
  Shield,
  Thermometer,
  X,
} from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import { UI_COPY } from '../i18n/uiCopy';
import { LanguageToggle } from './LanguageToggle';

interface ScienceDataReportProps {
  report: ScienceReportData;
  onClose: () => void;
  onProceedToDebrief: () => void;
  onReturnHangar: () => void;
}

export const ScienceDataReport: React.FC<ScienceDataReportProps> = ({
  report,
  onClose,
  onProceedToDebrief,
  onReturnHangar,
}) => {
  const tx = useIntegratedText();
  const { lang } = useI18n();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const el = dialog.current!; el.showModal(); return () => el.close(); }, []);
  const t = UI_COPY[lang].report;

  const chartCanvasRef = useRef<HTMLCanvasElement>(null);
  const [activeTab, setActiveTab] = useState<'spectral' | 'provenance' | 'physics'>('spectral');
  const [hoveredPointIdx] = useState<number | null>(null);

  // Draw procedural scientific chart on canvas
  useEffect(() => {
    if (activeTab !== 'spectral') return;
    const canvas = chartCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const padX = 50;
    const padY = 35;
    const plotW = w - padX * 2;
    const plotH = h - padY * 2;

    ctx.fillStyle = '#060a14';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = padY + (plotH / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padX, y);
      ctx.lineTo(padX + plotW, y);
      ctx.stroke();
    }
    for (let i = 0; i <= 6; i++) {
      const x = padX + (plotW / 6) * i;
      ctx.beginPath();
      ctx.moveTo(x, padY);
      ctx.lineTo(x, padY + plotH);
      ctx.stroke();
    }

    const points = report.spectralData.points;
    if (points.length < 2) return;

    const maxVal = Math.max(...points.map((p) => p.intensity)) * 1.15;
    const minVal = Math.min(...points.map((p) => p.intensity)) * 0.85;
    const valRange = Math.max(1e-6, maxVal - minVal);

    const getX = (idx: number) => padX + (plotW / (points.length - 1)) * idx;
    const getY = (val: number) => padY + plotH - ((val - minVal) / valRange) * plotH;

    const gradient = ctx.createLinearGradient(0, padY, 0, padY + plotH);
    gradient.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
    gradient.addColorStop(1, 'rgba(56, 189, 248, 0.0)');

    ctx.beginPath();
    ctx.moveTo(getX(0), getY(points[0].intensity));
    for (let i = 1; i < points.length; i++) {
      const cx = (getX(i - 1) + getX(i)) / 2;
      const cy = (getY(points[i - 1].intensity) + getY(points[i].intensity)) / 2;
      ctx.quadraticCurveTo(getX(i - 1), getY(points[i - 1].intensity), cx, cy);
    }
    ctx.lineTo(getX(points.length - 1), getY(points[points.length - 1].intensity));
    ctx.lineTo(getX(points.length - 1), padY + plotH);
    ctx.lineTo(getX(0), padY + plotH);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    for (let i = 0; i < points.length; i++) {
      const x = getX(i);
      const y = getY(points[i].intensity);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    points.forEach((p, idx) => {
      const x = getX(idx);
      const y = getY(p.intensity);
      const isHovered = hoveredPointIdx === idx;

      ctx.beginPath();
      ctx.arc(x, y, isHovered ? 7 : 4, 0, Math.PI * 2);
      ctx.fillStyle = p.compound ? '#10b981' : '#38bdf8';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      if (p.compound || isHovered) {
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        const labelText = p.compound || `${p.intensity}`;
        ctx.fillText(labelText, x, y - 10);
      }

      ctx.fillStyle = '#64748b';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(String(p.wavelength), x, padY + plotH + 18);
    });

    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(report.spectralData.xAxisLabel, padX + plotW / 2, h - 6);

    ctx.save();
    ctx.translate(14, padY + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText(report.spectralData.yAxisLabel, 0, 0);
    ctx.restore();
  }, [report, hoveredPointIdx, activeTab]);

  const handleDownloadJSON = () => {
    sounds.playClick();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `NASA_SCIENCE_REPORT_${report.missionId.toUpperCase()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <dialog ref={dialog} aria-label={tx("Informe científico simulado")} onCancel={e => { e.preventDefault(); onClose(); }} className="legacy-dialog fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md select-none overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[92vh] rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header Row */}
        <div className="px-5 py-4 border-b border-slate-800 bg-gradient-to-r from-blue-950/60 via-slate-900 to-indigo-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-blue-400 font-bold">
                  NASA OPEN SCIENCE DATA REPOSITORY (OSDR)
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 border border-emerald-500/30 text-emerald-300">
                  {t.realDataBadge}
                </span>
              </div>
              <h2 className="text-lg font-bold font-['Chakra_Petch'] text-white">
                {t.titlePrefix} {report.destination}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2"><LanguageToggle compact /><button
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title={t.closeTitle}
          >
            <X className="w-5 h-5" />
          </button></div>
        </div>

        {/* Sub-Header Key Metrics Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-slate-900/60 border-b border-slate-800 text-xs font-mono">
          <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/80">
            <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-amber-400" />
              <span>{t.latencyLabel}</span>
            </div>
            <div className="text-white font-bold mt-0.5">{report.commsLatencyFormatted}</div>
          </div>

          <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/80">
            <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
              <Thermometer className="w-3 h-3 text-rose-400" />
              <span>{t.tempLabel}</span>
            </div>
            <div className="text-white font-bold mt-0.5 truncate">{report.environmentConditions.temperature}</div>
          </div>

          <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/80">
            <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
              <Shield className="w-3 h-3 text-indigo-400" />
              <span>{t.radiationLabel}</span>
            </div>
            <div className="text-white font-bold mt-0.5 truncate">{report.environmentConditions.radiation}</div>
          </div>

          <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/80">
            <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
              <Flame className="w-3 h-3 text-amber-500" />
              <span>{t.solarFluxLabel}</span>
            </div>
            <div className="text-white font-bold mt-0.5 truncate">{report.environmentConditions.solarFlux}</div>
          </div>
        </div>

        {/* Challenge Quality & Certification Status Banner */}
        {report.challengeResult && (
          <div
            className={`px-5 py-3 border-b text-xs font-mono flex flex-wrap items-center justify-between gap-3 ${
              report.challengeResult.achieved
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  report.challengeResult.achieved ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
                }`}
              />
              <div>
                <span className="font-bold">
                  {report.challengeResult.achieved ? t.optimalBanner : t.degradedBanner}
                </span>
                <p className="text-[11px] opacity-85 mt-0.5">
                  {report.challengeResult.notes} · {t.telemetryLabel} {report.challengeResult.telemetrySummary}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-1 rounded text-[11px] font-bold ${
                  report.challengeResult.achieved
                    ? 'bg-emerald-900/60 border border-emerald-500/50 text-emerald-300'
                    : 'bg-amber-900/60 border border-amber-500/50 text-amber-300'
                }`}
              >
                {t.qualityLabel(report.challengeResult.score)}
              </span>

              {!report.challengeResult.achieved && (
                <button
                  onClick={() => {
                    sounds.playClick();
                    onClose();
                  }}
                  className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-700/30 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{t.retry3d}</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tab Selection */}
        <div className="flex border-b border-slate-800 px-5 bg-slate-950">
          <button
            onClick={() => {
              sounds.playClick();
              setActiveTab('spectral');
            }}
            className={`py-3 px-4 text-xs font-mono font-medium border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'spectral'
                ? 'border-blue-500 text-blue-400 bg-blue-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{t.tabSpectral}</span>
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              setActiveTab('physics');
            }}
            className={`py-3 px-4 text-xs font-mono font-medium border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'physics'
                ? 'border-blue-500 text-blue-400 bg-blue-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>{t.tabPhysics}</span>
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              setActiveTab('provenance');
            }}
            className={`py-3 px-4 text-xs font-mono font-medium border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'provenance'
                ? 'border-blue-500 text-blue-400 bg-blue-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>{t.tabProvenance}</span>
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1 text-slate-300">
          {/* Executive Discovery Highlight */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-blue-950/40 to-slate-900 border border-blue-500/30">
            <div className="text-[10px] font-mono text-blue-400 font-bold uppercase tracking-wider">
              {t.primaryDiscoveryLabel} ({report.payloadUsed})
            </div>
            <div className="text-base font-bold text-white mt-1">{report.primaryDiscovery}</div>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">{report.summary}</p>
          </div>

          {/* TAB 1: Spectral Data & Chart */}
          {activeTab === 'spectral' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-mono font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    <span>{report.spectralData.title}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">{t.resolutionFlight}</span>
                </div>

                <div className="w-full h-56 rounded-lg overflow-hidden border border-slate-800 bg-slate-950 relative">
                  <canvas ref={chartCanvasRef} role="img" aria-label={report.spectralData.title + tx(". Consulta la tabla de datos equivalente.")} className="w-full h-full block" />
                </div>
                <details className="mt-3 text-xs"><summary>{tx("Ver tabla de datos del gráfico")}</summary><table><thead><tr><th>{report.spectralData.xAxisLabel}</th><th>{report.spectralData.yAxisLabel}</th><th>{tx("Referencia")}</th></tr></thead><tbody>{report.spectralData.points.map((point, i) => <tr key={i}><td>{point.wavelength}</td><td>{point.intensity}</td><td>{point.label || point.compound || '—'}</td></tr>)}</tbody></table></details>

                <div className="mt-3 space-y-1.5">
                  {report.spectralData.keyFindings.map((finding, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{finding}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Instrument Readings Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {report.instrumentReadings.map((reading) => (
                  <div
                    key={reading.id}
                    className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-400 uppercase">{reading.category}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                          reading.status === 'optimal'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                            : reading.status === 'nominal'
                              ? 'bg-blue-950 text-blue-300 border border-blue-500/40'
                              : 'bg-amber-950 text-amber-300 border border-amber-500/40'
                        }`}
                      >
                        {reading.status}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-white mt-1">{reading.name}</div>
                    <div className="text-lg font-mono font-bold text-cyan-300 mt-0.5">
                      {reading.value}{' '}
                      <span className="text-xs font-normal text-slate-400">{reading.unit}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-snug">{reading.description}</p>
                    <div className="text-[9px] font-mono text-slate-500 mt-2 border-t border-slate-800 pt-1">
                      {t.sourcePrefix} {reading.nasaReference}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: Physical Constraints & Engineering */}
          {activeTab === 'physics' && (
            <div className="space-y-3">
              <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                {t.physicsHeading}
              </div>
              {report.physicalConstraints.map((item, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <div className="text-sm font-bold text-amber-300 flex items-center gap-2">
                    <Radio className="w-4 h-4 text-amber-400" />
                    <span>{item.title}</span>
                  </div>
                  <div className="text-xs text-slate-300">
                    <strong className="text-rose-300 font-mono">{t.physicalLimitLabel}</strong> {item.impact}
                  </div>
                  <div className="text-xs text-slate-300 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    <strong className="text-emerald-400 font-mono">{t.nasaMitigationLabel}</strong>{' '}
                    {item.engineeringMitigation}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: NASA Research Provenance */}
          {activeTab === 'provenance' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-mono font-bold text-blue-400">
                    {t.officialRecord} {report.nasaResearchSource.recordId}
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-950 border border-blue-500/30 text-blue-300">
                    {report.nasaResearchSource.repository}
                  </span>
                </div>

                <div className="text-sm font-bold text-white">{report.nasaResearchSource.title}</div>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                  <span className="font-bold text-amber-300">{t.realFactLabel} </span>
                  {report.nasaResearchSource.realWorldFact}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-[11px] font-mono text-slate-400">
                    {t.openAccessNote}
                  </span>
                  <a
                    href={report.nasaResearchSource.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 text-blue-200 text-xs font-mono transition-colors"
                  >
                    <span>{t.viewRepo}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Action Footer Bar */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadJSON}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-mono flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t.exportJson}</span>
            </button>

            <button
              onClick={() => {
                sounds.playClick();
                onReturnHangar();
              }}
              className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t.backHangar}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                sounds.playClick();
                onClose();
              }}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-mono transition-colors cursor-pointer"
            >
              {t.explore3d}
            </button>

            <button
              onClick={() => {
                sounds.playVictory();
                onProceedToDebrief();
              }}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold font-mono flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
            >
              <Award className="w-4 h-4" />
              <span>{t.graduation}</span>
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
};

