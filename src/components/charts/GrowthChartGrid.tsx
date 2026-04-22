import { GrowthChart } from './GrowthChart';
import { useT } from '../../i18n/LanguageContext';
import type { ChartDataPoint } from '../../hooks/useChartData';
import type { Gender, WeightCategory } from '../../types/statistical';

interface GrowthChartGridProps {
  weightData: ChartDataPoint[];
  lengthData: ChartDataPoint[];
  headCircumferenceData: ChartDataPoint[];
  weightForLengthData: ChartDataPoint[];
  genderColor: string;
  genderName: string;
  weightCategoryName: string;
  birthWeight?: number;
  patientName?: string;
  onZoom?: (chart: 'weight' | 'length' | 'headCircumference' | 'weightForLength') => void;
  gender?: Gender;
  weightCategory?: WeightCategory;
}

export function GrowthChartGrid({
  weightData,
  lengthData,
  headCircumferenceData,
  weightForLengthData,
  genderColor,
  genderName,
  weightCategoryName,
  birthWeight,
  patientName,
  onZoom,
  gender,
  weightCategory,
}: GrowthChartGridProps) {
  const { t } = useT();
  const suffix = t.chartSuffix(genderName, weightCategoryName);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <GrowthChart
        data={lengthData}
        title={`${t.chartLength}${suffix}`}
        xLabel={t.chartCorrectedAge}
        yLabel={t.chartLengthUnit}
        genderColor={genderColor}
        patientName={patientName}
        yMin={35}
        onClick={onZoom ? () => onZoom('length') : undefined}
        gender={gender}
        weightCategory={weightCategory}
        measureType="length"
      />
      <GrowthChart
        data={weightData}
        title={`${t.chartWeight}${suffix}`}
        xLabel={t.chartCorrectedAge}
        yLabel={t.chartWeightUnit}
        genderColor={genderColor}
        patientName={patientName}
        onClick={onZoom ? () => onZoom('weight') : undefined}
        gender={gender}
        weightCategory={weightCategory}
        measureType="weight"
      />
      <GrowthChart
        data={weightForLengthData}
        title={`${t.chartWeightForLength}${suffix}`}
        xLabel={t.chartLengthUnit}
        yLabel={t.chartWeightUnit}
        genderColor={genderColor}
        patientName={patientName}
        onClick={onZoom ? () => onZoom('weightForLength') : undefined}
        gender={gender}
        weightCategory={weightCategory}
        measureType="weightForLength"
      />
      <GrowthChart
        data={headCircumferenceData}
        title={`${t.chartHeadCirc}${suffix}`}
        xLabel={t.chartCorrectedAge}
        yLabel={t.chartHeadCircUnit}
        genderColor={genderColor}
        patientName={patientName}
        onClick={onZoom ? () => onZoom('headCircumference') : undefined}
        gender={gender}
        weightCategory={weightCategory}
        measureType="headCircumference"
      />
    </div>
  );
}
