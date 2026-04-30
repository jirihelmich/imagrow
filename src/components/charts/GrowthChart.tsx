import { useRef, type MouseEvent } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { useT } from '../../i18n/LanguageContext';
import { getPercentileValue, getWfLPercentile } from '../../hooks/useChartData';
import { statisticalData } from '../../lib/statistical-data';
import { chartToPngBlob, downloadBlob, sanitizeFilename } from '../../utils/chart-export';
import type { ChartDataPoint } from '../../hooks/useChartData';
import type { Gender, WeightCategory, MeasureType } from '../../types/statistical';

interface GrowthChartProps {
  data: ChartDataPoint[];
  title: string;
  xLabel?: string;
  yLabel?: string;
  genderColor?: string;
  height?: number;
  showLegend?: boolean;
  patientName?: string;
  yMin?: number;
  onClick?: () => void;
  gender?: Gender;
  weightCategory?: WeightCategory;
  measureType?: MeasureType;
}

export function GrowthChart({
  data,
  title,
  xLabel,
  yLabel,
  genderColor = '#1c84c6',
  height = 350,
  showLegend = false,
  patientName,
  yMin,
  onClick,
  gender,
  weightCategory,
  measureType,
}: GrowthChartProps) {
  const { t } = useT();

  const containerRef = useRef<HTMLDivElement>(null);

  const handleDownload = async (e: MouseEvent) => {
    e.stopPropagation();
    const svg = containerRef.current?.querySelector('svg.recharts-surface') as SVGSVGElement | null;
    if (!svg) {
      toast.error(t.chartExportFailed);
      return;
    }
    try {
      const blob = await chartToPngBlob(svg, { title, background: '#ffffff', scale: 2 });
      const base = patientName ? `${patientName}-${title}` : title;
      const filename = `${sanitizeFilename(base)}.png`;
      downloadBlob(blob, filename);
      toast.success(t.chartExportSuccess);
    } catch (err) {
      console.error('Chart export failed', err);
      toast.error(t.chartExportFailed);
    }
  };

  const computePercentile = (xValue: number, patientValue: number): string | null => {
    if (!gender || !weightCategory || !measureType) return null;
    if (measureType === 'weightForLength') {
      const startWeight = statisticalData[gender][weightCategory].startWeight;
      const offset = Math.round(xValue) - startWeight;
      const p = getWfLPercentile(gender, weightCategory, patientValue, offset);
      return p === '-' ? null : p;
    }
    const offset = xValue - (-3);
    if (offset < 0) return null;
    const p = getPercentileValue(gender, weightCategory, patientValue, measureType, offset);
    return p === '-' ? null : p;
  };

  return (
    <div
      ref={containerRef}
      className={`relative ${onClick ? 'cursor-zoom-in [&_*]:cursor-zoom-in [&_button]:!cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <h6 className="text-sm font-semibold text-gray-700 mb-2 text-center">{title}</h6>
      <button
        type="button"
        onClick={handleDownload}
        title={t.chartExportTitle}
        aria-label={t.chartExportTitle}
        className="absolute top-0 right-1 p-1.5 rounded text-gray-400 hover:text-primary hover:bg-gray-100 transition-colors hidden-print"
      >
        <Download size={14} />
      </button>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: showLegend ? 55 : 20, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#d3d3d3" />
          <XAxis
            dataKey="week"
            type="number"
            domain={['dataMin', 'dataMax']}
            label={xLabel ? { value: xLabel, position: 'insideBottom', offset: showLegend ? -45 : -10 } : undefined}
            tick={{ fontSize: 11 }}
          />
          <YAxis
            domain={yMin !== undefined ? [yMin, 'auto'] : ['auto', 'auto']}
            label={yLabel ? { value: yLabel, angle: -90, position: 'insideLeft', offset: 0 } : undefined}
            tick={{ fontSize: 11 }}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload || payload.length === 0) return null;
              const xUnit = xLabel?.match(/\[(.+)\]/)?.[1];
              const yUnit = yLabel?.match(/\[(.+)\]/)?.[1] || '';
              const labels: Record<string, string> = {
                p2: t.chartPercentile2,
                p5: t.chartPercentile5,
                p50: t.chartPercentile50,
                p95: t.chartPercentile95,
                p98: t.chartPercentile98,
                Pacient: patientName || t.patient,
              };
              const xNum = typeof label === 'number' ? label : parseFloat(String(label));
              const patientEntry = payload.find((p) => p.dataKey === 'patient' && typeof p.value === 'number');
              const percentile = patientEntry
                ? computePercentile(xNum, patientEntry.value as number)
                : null;

              return (
                <div className="bg-white border border-gray-200 rounded shadow-sm px-2.5 py-1.5 text-xs">
                  <p className="font-semibold text-gray-700 mb-1">
                    {xUnit ? `${label} ${xUnit}` : t.chartWeekSuffix(xNum)}
                  </p>
                  {payload.map((entry, idx) => (
                    <p key={idx} style={{ color: entry.color }}>
                      {labels[entry.name as string] || entry.name}: {entry.value} {yUnit}
                    </p>
                  ))}
                  {percentile !== null && (
                    <p className="mt-1 pt-1 border-t border-gray-200 font-semibold" style={{ color: genderColor }}>
                      {t.chartPercentileLabel}: {percentile}.
                    </p>
                  )}
                </div>
              );
            }}
          />
          {showLegend && (
            <Legend
              content={() => (
                <div className="flex items-center justify-center gap-6 text-xs text-gray-700 mt-2">
                  <span className="flex items-center gap-1.5">
                    <svg width="30" height="10"><line x1="0" y1="5" x2="30" y2="5" stroke="#000" strokeWidth="1" /></svg>
                    {t.chartLegend298}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <svg width="30" height="10"><line x1="0" y1="5" x2="30" y2="5" stroke="#000" strokeWidth="1" strokeDasharray="4 4" /></svg>
                    {t.chartLegend595}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <svg width="30" height="10"><line x1="0" y1="5" x2="30" y2="5" stroke="#000" strokeWidth="1" strokeDasharray="1 2" /></svg>
                    {t.chartLegend50}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <svg width="30" height="10"><line x1="0" y1="5" x2="30" y2="5" stroke={genderColor} strokeWidth="2" /><circle cx="15" cy="5" r="3" fill={genderColor} /></svg>
                    {patientName || t.patient}
                  </span>
                </div>
              )}
            />
          )}
          <Line type="monotone" dataKey="p2" stroke="#000" strokeWidth={1} dot={false} connectNulls name="p2" />
          <Line type="monotone" dataKey="p5" stroke="#000" strokeWidth={1} strokeDasharray="4 4" dot={false} connectNulls name="p5" />
          <Line type="monotone" dataKey="p50" stroke="#000" strokeWidth={1} strokeDasharray="1 2" dot={false} connectNulls name="p50" />
          <Line type="monotone" dataKey="p95" stroke="#000" strokeWidth={1} strokeDasharray="4 4" dot={false} connectNulls name="p95" />
          <Line type="monotone" dataKey="p98" stroke="#000" strokeWidth={1} dot={false} connectNulls name="p98" />
          <Line
            type="monotone"
            dataKey="patient"
            stroke={genderColor}
            strokeWidth={2}
            dot={{ fill: genderColor, r: 3 }}
            connectNulls
            name="Pacient"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
