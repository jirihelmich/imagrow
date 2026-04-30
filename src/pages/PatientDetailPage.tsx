import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, Printer, ArrowLeft, ChevronDown, ChevronRight } from 'lucide-react';
import { usePatients } from '../hooks/usePatients';
import { useExaminations } from '../hooks/useExaminations';
import { useT } from '../i18n/LanguageContext';
import {
  buildChartData, getPercentileValue, getZScoreValue, getWfLPercentile, getZScoreWfl,
} from '../hooks/useChartData';
import { genderColor, shadeColor } from '../utils/color';
import { formatBirthNumber } from '../utils/birth-number';
import { birthDateFromNumber, age, gestationalAge, correctedAge, correctedWeek, expectedBirth, getAgeDiff } from '../utils/age';
import { formatDate, mmToCm } from '../utils/formatting';
import { statisticalData } from '../lib/statistical-data';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Spinner } from '../components/ui/Spinner';
import { GrowthChartGrid } from '../components/charts/GrowthChartGrid';
import { ChartZoomModal } from '../components/charts/ChartZoomModal';
import { SparklineCell } from '../components/charts/SparklineCell';
import type { PatientWithExamination, Examination, Person, Address } from '../types/database';
import type { Gender, WeightCategory, MeasureType } from '../types/statistical';

const STATISTICAL_DATA_START = 37;

export function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getById, deleteById } = usePatients();
  const { getAllByPatient, deleteById: deleteExam } = useExaminations();
  const { t } = useT();

  const [patient, setPatient] = useState<PatientWithExamination | null>(null);
  const [parents, setParents] = useState<{ Person: Person; Address: Address }[]>([]);
  const [examinations, setExaminations] = useState<Examination[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [showMoreDates, setShowMoreDates] = useState(false);
  const [showParents, setShowParents] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ type: 'patient' | 'examination'; examId?: number } | null>(null);
  const [zoomedChart, setZoomedChart] = useState<'weight' | 'length' | 'headCircumference' | 'weightForLength' | null>(null);

  const loadData = useCallback(async () => {
    if (!id) return;
    const patientId = parseInt(id);
    const p = await getById(patientId);
    if (!p) { setLoading(false); return; }

    setPatient(p);
    setParents([
      { Person: p.Mother, Address: p.MotherAddress },
      { Person: p.Father, Address: p.FatherAddress },
    ]);

    const exams = await getAllByPatient(patientId);
    setExaminations(exams);
    setLoading(false);
  }, [id, getById, getAllByPatient]);

  useEffect(() => { loadData(); }, [loadData]);

  const gender = (patient?.Person.gender || 'male') as Gender;
  const weightCategory: WeightCategory = patient && patient.Patient.birthWeight <= 1500 ? 'under' : 'above';
  const color = genderColor(patient);
  const genderName = gender === 'female' ? t.genderFemale : t.genderMale;
  const weightCategoryName = weightCategory === 'under' ? t.weightBelow : t.weightAbove;

  // Build chart data maps
  const chartDataMaps = useMemo(() => {
    if (!patient) return null;

    const weights: Record<number, number> = {};
    const lengths: Record<number, number> = {};
    const headCircumferences: Record<number, number> = {};
    const weightsForLengths: Record<number, number> = {};
    const inlineWeight: number[] = [];
    const inlineLength: number[] = [];
    const inlineCircumference: number[] = [];

    examinations.forEach((e) => {
      if (e.length) {
        const week = correctedWeek(patient, e.dateTime);
        if (isNaN(week)) return;

        inlineWeight.unshift(e.weight);
        inlineLength.unshift(e.length);
        inlineCircumference.unshift(e.headCircumference);

        weights[week] = e.weight;
        lengths[week] = e.length;
        headCircumferences[week] = e.headCircumference;
        weightsForLengths[Math.floor(e.length / 10)] = e.weight;
      }
    });

    if (patient.Patient.birthWeight) {
      inlineWeight.unshift(patient.Patient.birthWeight);
      weights[patient.Patient.birthWeek - 40] = patient.Patient.birthWeight;
    }
    if (patient.Patient.birthLength) {
      inlineLength.unshift(patient.Patient.birthLength);
      lengths[patient.Patient.birthWeek - 40] = patient.Patient.birthLength;
    }
    if (patient.Patient.birthHeadCircumference) {
      inlineCircumference.unshift(patient.Patient.birthHeadCircumference);
      headCircumferences[patient.Patient.birthWeek - 40] = patient.Patient.birthHeadCircumference;
    }

    return { weights, lengths, headCircumferences, weightsForLengths, inlineWeight, inlineLength, inlineCircumference };
  }, [patient, examinations]);

  const chartData = useMemo(() => {
    if (!chartDataMaps || !patient) return null;
    return {
      weight: buildChartData(gender, weightCategory, 'weight', chartDataMaps.weights),
      length: buildChartData(gender, weightCategory, 'length', chartDataMaps.lengths),
      headCircumference: buildChartData(gender, weightCategory, 'headCircumference', chartDataMaps.headCircumferences),
      weightForLength: buildChartData(gender, weightCategory, 'weightForLength', chartDataMaps.weightsForLengths),
    };
  }, [chartDataMaps, patient, gender, weightCategory]);

  const computePercentile = useCallback((patientValue: number, type: MeasureType, examinationDate: Date) => {
    if (type === 'weightForLength') return 'N/A';
    const value = type === 'weight' ? patientValue : patientValue / 10;
    const diff = getAgeDiff(patient!, examinationDate);
    const offset = (diff.weeks + patient!.Patient.birthWeek) - STATISTICAL_DATA_START;
    return getPercentileValue(gender, weightCategory, value, type, offset);
  }, [patient, gender, weightCategory]);

  const computeZScore = useCallback((patientValue: number, type: MeasureType, examinationDate: Date) => {
    if (type === 'weightForLength') return 'N/A';
    const value = type === 'weight' ? patientValue : patientValue / 10;
    const diff = getAgeDiff(patient!, examinationDate);
    const offset = (diff.weeks + patient!.Patient.birthWeek) - STATISTICAL_DATA_START;
    return getZScoreValue(gender, weightCategory, value, type, offset);
  }, [patient, gender, weightCategory]);

  const computeWfLPercentile = useCallback((weight: number, length: number) => {
    const offset = Math.round(length / 10) - statisticalData[gender][weightCategory].startWeight;
    return getWfLPercentile(gender, weightCategory, weight, offset);
  }, [gender, weightCategory]);

  const computeZScoreWfl = useCallback((weight: number, length: number) => {
    const offset = Math.round(length / 10) - statisticalData[gender][weightCategory].startWeight;
    return getZScoreWfl(gender, weightCategory, weight, offset);
  }, [gender, weightCategory]);

  const handleDelete = async () => {
    if (!deleteModal || !patient) return;
    if (deleteModal.type === 'patient') {
      await deleteById(patient.Patient.id);
      navigate('/patients/dashboard');
    } else if (deleteModal.examId !== undefined) {
      await deleteExam(deleteModal.examId);
      setExaminations((prev) => prev.filter((e) => e.id !== deleteModal.examId));
    }
    setDeleteModal(null);
  };

  if (loading) return <Spinner />;
  if (!patient) return <div className="p-6">{t.patientNotFound}</div>;

  const zoomChartConfig: Record<string, { title: string; xLabel: string; yLabel: string }> = {
    weight: { title: t.chartWeight, xLabel: t.chartCorrectedAge, yLabel: t.chartWeightUnit },
    length: { title: t.chartLength, xLabel: t.chartCorrectedAge, yLabel: t.chartLengthUnit },
    headCircumference: { title: t.chartHeadCirc, xLabel: t.chartCorrectedAge, yLabel: t.chartHeadCircUnit },
    weightForLength: { title: t.chartWeightForLength, xLabel: t.chartLengthUnit, yLabel: t.chartWeightUnit },
  };

  const patientName = `${patient.Person.firstName ?? ''} ${patient.Person.lastName ?? ''}`.trim() || `ID ${patient.Patient.id}`;
  const dob = birthDateFromNumber(patient.Person.birthNumber || '');
  const formattedBn = formatBirthNumber(patient.Person.birthNumber || '');

  const motherHasData = hasParentData(patient.Mother, patient.MotherAddress);
  const fatherHasData = hasParentData(patient.Father, patient.FatherAddress);
  const anyParentData = motherHasData || fatherHasData;

  return (
    <div>
      <PageHeader
        title={patientName}
        breadcrumbs={[
          { label: t.breadcrumbHome, to: '/patients/dashboard' },
          { label: t.patients, to: '/patients/dashboard' },
          { label: patientName },
        ]}
        actions={
          <>
            <Button variant="white" onClick={() => navigate('/patients/dashboard')}>
              <ArrowLeft size={14} /> {t.backToList}
            </Button>
            <Button onClick={() => window.print()}><Printer size={14} /> {t.print}</Button>
          </>
        }
      />

      <div className="p-6 space-y-6">
        {/* Top: identity + key stats + sparklines + actions || examinations history */}
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-6">
          <Card>
            {/* Identity meta line */}
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-4 pb-3 border-b border-gray-100">
              <span className="font-semibold" style={{ color }}>{patientName}</span>
              <span className="text-xs text-gray-400 font-mono">{formattedBn}</span>
              <span className="text-xs text-gray-400">·</span>
              <span className="text-xs text-gray-500">{dob}</span>
              <span className="text-xs text-gray-400">·</span>
              <span className="text-xs text-gray-500">#{patient.Patient.id}</span>
            </div>

            {/* 4 stat boxes */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <StatBlock label={t.labelGestationalAgeAtBirth} value={`${patient.Patient.birthWeek}. ${t.week}`} />
              <StatBlock label={t.thBirthWeight} value={`${patient.Patient.birthWeight} g`} />
              <StatBlock label={t.labelCorrectedAge} value={correctedAge(patient)} />
              <StatBlock label={t.labelCalendarAge} value={age(patient)} />
            </div>

            {/* Sparklines */}
            {examinations.length > 0 && chartDataMaps && (
              <div className="grid grid-cols-3 gap-3 mb-4 pt-3 border-t border-gray-100">
                <SparklineStat
                  label={t.labelLength}
                  value={`${mmToCm(examinations[0].length)} cm`}
                  data={chartDataMaps.inlineLength}
                  color={color}
                />
                <SparklineStat
                  label={t.labelWeight}
                  value={`${examinations[0].weight} g`}
                  data={chartDataMaps.inlineWeight}
                  color={color}
                />
                <SparklineStat
                  label={t.labelHead}
                  value={`${mmToCm(examinations[0].headCircumference)} cm`}
                  data={chartDataMaps.inlineCircumference}
                  color={color}
                />
              </div>
            )}

            {/* Notes */}
            {patient.Person.description && (
              <div className="mb-4 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{t.sectionNotes}</p>
                <p className="text-sm text-gray-700">{patient.Person.description}</p>
              </div>
            )}

            {/* Action toolbar */}
            <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100 hidden-print">
              <Link to={`/examinations/new/${patient.Patient.id}`}>
                <Button variant="primary" size="sm"><Plus size={12} /> {t.newExamination}</Button>
              </Link>
              <Link to={`/patients/edit/${patient.Patient.id}`}>
                <Button size="sm" variant="white"><Pencil size={12} /> {t.detailEditPatient}</Button>
              </Link>
              <div className="flex-1" />
              <Button
                variant="danger"
                size="sm"
                onClick={() => setDeleteModal({ type: 'patient' })}
              >
                <Trash2 size={12} /> {t.detailDeletePatient}
              </Button>
            </div>

            {/* More dates collapsible */}
            <div className="mt-4 pt-3 border-t border-gray-100 hidden-print">
              <button
                type="button"
                onClick={() => setShowMoreDates((v) => !v)}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-primary"
              >
                {showMoreDates ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                {showMoreDates ? t.detailHideDetails : t.detailMoreDetails}
              </button>
              {showMoreDates && (
                <table className="w-full text-sm mt-3">
                  <tbody>
                    <tr className="border-b border-gray-100">
                      <th className="py-1.5 text-left text-gray-500 font-normal">{t.labelExpectedBirthCalc}</th>
                      <td className="py-1.5">{expectedBirth(patient)}</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <th className="py-1.5 text-left text-gray-500 font-normal">{t.labelExpectedBirthPlanned}</th>
                      <td className="py-1.5">{formatDate(patient.Patient.expectedBirthDate)}</td>
                    </tr>
                    <tr>
                      <th className="py-1.5 text-left text-gray-500 font-normal">{t.labelGestationalAgeNow}</th>
                      <td className="py-1.5">{gestationalAge(patient)}</td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          </Card>

          <Card title={t.detailExamHistory} subtitle={t.examinationsCount(examinations.length)} className="hidden-print">
            {examinations.length > 0 ? (
              <>
                <ul className="divide-y divide-gray-100">
                  {examinations.map((e, idx) => (
                    (idx < 4 || showAll) && (
                      <ExaminationRow
                        key={e.id}
                        examination={e}
                        patient={patient}
                        accent={color}
                        onDelete={() => setDeleteModal({ type: 'examination', examId: e.id })}
                        labels={{
                          editLabel: t.change,
                          deleteLabel: t.delete,
                          noNotes: t.noNotes,
                        }}
                      />
                    )
                  ))}
                </ul>
                {examinations.length > 4 && (
                  <div className="text-center mt-4">
                    <Button variant="white" size="sm" onClick={() => setShowAll(!showAll)}>
                      {showAll ? t.showLess : t.showMore}
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-400 text-center py-6">{t.noExaminations}</p>
            )}
          </Card>
        </div>

        {/* Charts */}
        {chartData && (
          <Card
            title={t.chartsTitle}
            subtitle={t.chartSubtitleCompact(genderName, weightCategoryName)}
          >
            <GrowthChartGrid
              weightData={chartData.weight}
              lengthData={chartData.length}
              headCircumferenceData={chartData.headCircumference}
              weightForLengthData={chartData.weightForLength}
              genderColor={color}
              genderName={genderName}
              weightCategoryName={weightCategoryName}
              birthWeight={patient.Patient.birthWeight}
              patientName={`${patient.Person.firstName} ${patient.Person.lastName}`}
              onZoom={setZoomedChart}
              gender={gender}
              weightCategory={weightCategory}
            />
          </Card>
        )}

        {/* Tabulated data */}
        {examinations.length > 0 && (
          <Card title={t.tabulatedData} subtitle={t.tabulatedSubtitle}>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th rowSpan={2} className="py-2 px-1">#</th>
                    <th rowSpan={2} className="py-2 px-1">{t.thDate}</th>
                    <th rowSpan={2} className="py-2 px-1">{t.labelCorrectedAge}</th>
                    <th colSpan={3} className="py-1 px-1 border-r border-gray-300">{t.thWeight}</th>
                    <th colSpan={3} className="py-1 px-1 border-r border-gray-300">{t.thLength}</th>
                    <th colSpan={3} className="py-1 px-1 border-r border-gray-300">{t.thHeadCirc}</th>
                    <th colSpan={2} className="py-1 px-1">{t.thWeightForLength}</th>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <th className="py-1 px-1">[g]</th>
                    <th className="py-1 px-1">P</th>
                    <th className="py-1 px-1 border-r border-gray-300">SDS</th>
                    <th className="py-1 px-1">[cm]</th>
                    <th className="py-1 px-1">P</th>
                    <th className="py-1 px-1 border-r border-gray-300">SDS</th>
                    <th className="py-1 px-1">[cm]</th>
                    <th className="py-1 px-1">P</th>
                    <th className="py-1 px-1 border-r border-gray-300">SDS</th>
                    <th className="py-1 px-1">P</th>
                    <th className="py-1 px-1">SDS</th>
                  </tr>
                </thead>
                <tbody>
                  {examinations.map((e, idx) => {
                    const pWeight = computePercentile(e.weight, 'weight', e.dateTime);
                    const pLength = computePercentile(e.length, 'length', e.dateTime);
                    const pHead = computePercentile(e.headCircumference, 'headCircumference', e.dateTime);
                    const pWfl = computeWfLPercentile(e.weight, e.length);
                    const extremeClass = (p: string) => {
                      const n = parseFloat(p);
                      if (isNaN(n)) return '';
                      if (n < 1) return 'bg-red-100 text-red-800 font-semibold';
                      if (n > 99) return 'bg-red-100 text-red-800 font-semibold';
                      return '';
                    };
                    return (
                      <tr key={e.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-1.5 px-1">{examinations.length - idx}</td>
                        <td className="py-1.5 px-1">{formatDate(e.dateTime)}</td>
                        <td className="py-1.5 px-1">{correctedAge(patient, e.dateTime)}</td>
                        <td className={`py-1.5 px-1 whitespace-nowrap ${extremeClass(pWeight)}`}>{e.weight}</td>
                        <td className={`py-1.5 px-1 ${extremeClass(pWeight)}`}>{pWeight}</td>
                        <td className={`py-1.5 px-1 border-r border-gray-300 whitespace-nowrap ${extremeClass(pWeight)}`}>{computeZScore(e.weight, 'weight', e.dateTime)}</td>
                        <td className={`py-1.5 px-1 ${extremeClass(pLength)}`}>{mmToCm(e.length)}</td>
                        <td className={`py-1.5 px-1 ${extremeClass(pLength)}`}>{pLength}</td>
                        <td className={`py-1.5 px-1 border-r border-gray-300 whitespace-nowrap ${extremeClass(pLength)}`}>{computeZScore(e.length, 'length', e.dateTime)}</td>
                        <td className={`py-1.5 px-1 ${extremeClass(pHead)}`}>{mmToCm(e.headCircumference)}</td>
                        <td className={`py-1.5 px-1 ${extremeClass(pHead)}`}>{pHead}</td>
                        <td className={`py-1.5 px-1 border-r border-gray-300 whitespace-nowrap ${extremeClass(pHead)}`}>{computeZScore(e.headCircumference, 'headCircumference', e.dateTime)}</td>
                        <td className={`py-1.5 px-1 ${extremeClass(pWfl)}`}>{pWfl}</td>
                        <td className={`py-1.5 px-1 whitespace-nowrap ${extremeClass(pWfl)}`}>{computeZScoreWfl(e.weight, e.length)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Parent info — only when at least one parent has data */}
        {anyParentData && (
          <Card
            title={t.parentInfo}
            className="hidden-print"
            headerActions={
              <button
                type="button"
                onClick={() => setShowParents((v) => !v)}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-primary"
              >
                {showParents ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                {showParents ? t.detailToggleHide : t.detailToggleShow}
              </button>
            }
          >
            {showParents ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {parents
                  .filter((p) => hasParentData(p.Person, p.Address))
                  .sort((a, b) => (a.Person.gender === 'female' ? -1 : 1))
                  .map((p, idx) => (
                    <ParentBlock
                      key={idx}
                      person={p.Person}
                      address={p.Address}
                      label={p.Person.gender === 'female' ? t.mother : t.father}
                      t={t}
                    />
                  ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400">{t.detailParentInfoEmpty}</p>
            )}
          </Card>
        )}
      </div>

      {/* Chart zoom modal */}
      {zoomedChart && chartData && (
        <ChartZoomModal
          data={chartData[zoomedChart]}
          title={zoomChartConfig[zoomedChart].title}
          xLabel={zoomChartConfig[zoomedChart].xLabel}
          yLabel={zoomChartConfig[zoomedChart].yLabel}
          genderColor={color}
          patientName={patient ? `${patient.Person.firstName} ${patient.Person.lastName}` : undefined}
          onClose={() => setZoomedChart(null)}
          gender={gender}
          weightCategory={weightCategory}
          measureType={zoomedChart}
        />
      )}

      {/* Delete confirmation modal */}
      <Modal
        open={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        onConfirm={handleDelete}
        title={t.confirmation}
        confirmLabel={t.delete}
      >
        {deleteModal?.type === 'patient'
          ? t.deletePatientConfirm
          : t.deleteExaminationConfirm
        }
      </Modal>
    </div>
  );
}

interface StatBlockProps {
  label: string;
  value: string;
}

function StatBlock({ label, value }: StatBlockProps) {
  return (
    <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-gray-800">{value || '—'}</p>
    </div>
  );
}

interface SparklineStatProps {
  label: string;
  value: string;
  data: number[];
  color: string;
}

function SparklineStat({ label, value, data, color }: SparklineStatProps) {
  return (
    <div className="text-center">
      <SparklineCell data={data} color={color} fillColor={shadeColor(color, 0.3)} />
      <p className="text-sm font-semibold text-gray-800 mt-1">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-gray-500">{label}</p>
    </div>
  );
}

interface ExaminationRowProps {
  examination: Examination;
  patient: PatientWithExamination;
  accent: string;
  onDelete: () => void;
  labels: { editLabel: string; deleteLabel: string; noNotes: string };
}

function ExaminationRow({ examination: e, patient, accent, onDelete, labels }: ExaminationRowProps) {
  return (
    <li className="py-3 first:pt-0 last:pb-0 group">
      <div className="flex items-start gap-3">
        <div
          className="w-2 h-2 rounded-full mt-2 shrink-0"
          style={{ backgroundColor: accent }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2 flex-wrap">
            <p className="font-semibold text-sm text-gray-800">
              {formatDate(e.dateTime)}
              <span className="font-normal text-gray-500 ml-2">{correctedAge(patient, e.dateTime)}</span>
            </p>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-medium text-gray-700">{mmToCm(e.length)} cm</span>
              <span className="text-gray-300">·</span>
              <span className="font-medium text-gray-700">{e.weight} g</span>
              <span className="text-gray-300">·</span>
              <span className="font-medium text-gray-700">{mmToCm(e.headCircumference)} cm</span>
            </div>
          </div>
          {e.description && (
            <p className="text-xs text-gray-500 mt-1 italic">{e.description}</p>
          )}
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <Link to={`/examinations/edit/${patient.Patient.id}/${e.id}`} aria-label={labels.editLabel}>
            <button className="p-1 text-gray-400 hover:text-primary" title={labels.editLabel}>
              <Pencil size={14} />
            </button>
          </Link>
          <button
            onClick={onDelete}
            className="p-1 text-gray-400 hover:text-red-600"
            title={labels.deleteLabel}
            aria-label={labels.deleteLabel}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </li>
  );
}

interface ParentBlockProps {
  person: Person;
  address: Address;
  label: string;
  t: ReturnType<typeof useT>['t'];
}

function ParentBlock({ person, address, label, t }: ParentBlockProps) {
  const rows: { label: string; value: string }[] = [];
  const push = (l: string, v: string | number | null | undefined) => {
    if (v === null || v === undefined || v === '' || v === 0) return;
    rows.push({ label: l, value: String(v) });
  };

  push(t.thBirthNumber, formatBirthNumber(person.birthNumber || ''));
  push(t.thBirthDate, birthDateFromNumber(person.birthNumber || ''));
  push(t.labelSurname, person.lastName || '');
  push(t.labelFirstName, person.firstName || '');
  push(t.labelWeightKg, person.weight ? person.weight / 1000 : '');
  push(t.labelHeightCm, mmToCm(person.length));
  push(t.labelHeadCircCm, mmToCm(person.headCircumference));
  push(t.labelNotes, person.description || '');
  push(t.labelPhone, person.phone || '');
  push(t.labelEmail, person.email || '');
  push(t.labelStreet, address?.street || '');
  push(t.labelCity, address?.city || '');
  push(t.labelZip, address?.zipcode || '');
  push(t.labelCountry, address?.country || '');

  return (
    <div>
      <h6 className="font-semibold text-gray-700 mb-3">{label}</h6>
      <table className="w-full text-sm">
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i < rows.length - 1 ? 'border-b border-gray-100' : ''}>
              <th className="py-1 text-left text-gray-500 font-normal">{row.label}</th>
              <td className="py-1">{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function hasParentData(person: Person | undefined, address: Address | undefined): boolean {
  if (!person) return false;
  return Boolean(
    person.birthNumber ||
      person.firstName ||
      person.lastName ||
      person.weight ||
      person.length ||
      person.headCircumference ||
      person.description ||
      person.email ||
      person.phone ||
      address?.street ||
      address?.city ||
      address?.country ||
      address?.zipcode,
  );
}
