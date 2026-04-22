import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, Printer, ArrowLeft } from 'lucide-react';
import { usePatients } from '../hooks/usePatients';
import { useExaminations } from '../hooks/useExaminations';
import { useT } from '../i18n/LanguageContext';
import {
  buildChartData, getPercentileValue, getZScoreValue, getWfLPercentile, getZScoreWfl,
} from '../hooks/useChartData';
import { genderColor, shadeColor } from '../utils/color';
import { formatBirthNumber } from '../utils/birth-number';
import { birthDateFromNumber, age, gestationalAge, correctedAge, correctedWeek, expectedBirth, getAgeDiff } from '../utils/age';
import { formatDate, formatDateTime, mmToCm } from '../utils/formatting';
import { statisticalData } from '../lib/statistical-data';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Spinner } from '../components/ui/Spinner';
import { GrowthChartGrid } from '../components/charts/GrowthChartGrid';
import { ChartZoomModal } from '../components/charts/ChartZoomModal';
import { SparklineCell } from '../components/charts/SparklineCell';
import type { PatientWithExamination, PatientDetail, Examination, Person, Address } from '../types/database';
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

  return (
    <div>
      <PageHeader
        title={t.patientDetailTitle(`${patient.Person.firstName} ${patient.Person.lastName}`, patient.Patient.id)}
        breadcrumbs={[
          { label: t.breadcrumbHome, to: '/patients/dashboard' },
          { label: t.patients, to: '/patients/dashboard' },
          { label: `${patient.Person.firstName} ${patient.Person.lastName}` },
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
        {/* Patient info + Examinations */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <Card
              title={`${patient.Person.firstName} ${patient.Person.lastName}`}
              subtitle={`(${formatBirthNumber(patient.Person.birthNumber || '')})`}
            >
              {typeof examinations[0]?.image === 'string' && (
                <img src={examinations[0].image} alt="" className="w-full max-h-48 object-contain rounded mb-4" />
              )}

              <h6 className="font-semibold text-gray-700 mb-2">{t.sectionAge}</h6>
              <table className="w-full text-sm mb-4">
                <tbody>
                  <tr className="border-b border-gray-100">
                    <th className="py-1.5 text-left text-gray-500 font-normal">{t.labelBirthDateFromBN}</th>
                    <td className="py-1.5">{birthDateFromNumber(patient.Person.birthNumber || '')}</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <th className="py-1.5 text-left text-gray-500 font-normal">{t.labelExpectedBirthCalc}</th>
                    <td className="py-1.5">{expectedBirth(patient)}</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <th className="py-1.5 text-left text-gray-500 font-normal">{t.labelExpectedBirthPlanned}</th>
                    <td className="py-1.5">{formatDate(patient.Patient.expectedBirthDate)}</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <th className="py-1.5 text-left text-gray-500 font-normal">{t.labelGestationalAgeAtBirth}</th>
                    <td className="py-1.5">{patient.Patient.birthWeek}. {t.week}</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <th className="py-1.5 text-left text-gray-500 font-normal">{t.labelGestationalAgeNow}</th>
                    <td className="py-1.5">{gestationalAge(patient)}</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <th className="py-1.5 text-left text-gray-500 font-normal">{t.labelCorrectedAge}</th>
                    <td className="py-1.5">{correctedAge(patient)}</td>
                  </tr>
                  <tr>
                    <th className="py-1.5 text-left text-gray-500 font-normal">{t.labelCalendarAge}</th>
                    <td className="py-1.5">{age(patient)}</td>
                  </tr>
                </tbody>
              </table>

              {patient.Person.description && (
                <div className="mb-4">
                  <h6 className="font-semibold text-gray-700 mb-1">{t.sectionNotes}</h6>
                  <p className="text-sm text-gray-600">{patient.Person.description}</p>
                </div>
              )}

              {examinations.length > 0 && chartDataMaps && (
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <SparklineCell data={chartDataMaps.inlineLength} color={color} fillColor={shadeColor(color, 0.3)} />
                    <p className="text-xs font-semibold">{mmToCm(examinations[0].length)} cm <span className="font-normal text-gray-500">{t.labelLength}</span></p>
                  </div>
                  <div className="text-center">
                    <SparklineCell data={chartDataMaps.inlineWeight} color={color} fillColor={shadeColor(color, 0.3)} />
                    <p className="text-xs font-semibold">{examinations[0].weight} g <span className="font-normal text-gray-500">{t.labelWeight}</span></p>
                  </div>
                  <div className="text-center">
                    <SparklineCell data={chartDataMaps.inlineCircumference} color={color} fillColor={shadeColor(color, 0.3)} />
                    <p className="text-xs font-semibold">{mmToCm(examinations[0].headCircumference)} cm <span className="font-normal text-gray-500">{t.labelHead}</span></p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 hidden-print">
                <Link to={`/examinations/new/${patient.Patient.id}`}>
                  <Button variant="primary" size="sm" className="w-full"><Plus size={12} /> {t.newExamination}</Button>
                </Link>
                <Link to={`/patients/edit/${patient.Patient.id}`}>
                  <Button size="sm" className="w-full"><Pencil size={12} /> {t.edit}</Button>
                </Link>
                <div />
                <Button
                  variant="danger"
                  size="sm"
                  className="w-full"
                  onClick={() => setDeleteModal({ type: 'patient' })}
                >
                  <Trash2 size={12} /> {t.delete}
                </Button>
              </div>
            </Card>
          </div>

          <div className="md:col-span-2 hidden-print">
            <Card title={t.patientCard} subtitle={t.examinationsCount(examinations.length)}>
              {examinations.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {examinations.map((e, idx) => (
                      (idx < 4 || showAll) && (
                        <div key={e.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            {typeof e.image === 'string' && <img src={e.image} alt="" className="w-12 h-12 rounded-full object-cover" />}
                            <div className="flex-1">
                              <p className="font-semibold text-sm">
                                {t.examinationAt} {formatDateTime(e.dateTime)}
                                <span className="font-normal text-gray-400 ml-1">({correctedAge(patient, e.dateTime)})</span>
                              </p>
                              <p className="text-xs text-gray-500 mt-1">{e.description || t.noNotes}</p>
                              <table className="w-full text-xs mt-2">
                                <tbody>
                                  <tr><th className="text-left py-0.5">{t.bodyLength}</th><td>{mmToCm(e.length)} cm</td></tr>
                                  <tr><th className="text-left py-0.5">{t.bodyWeight}</th><td>{e.weight} g</td></tr>
                                  <tr><th className="text-left py-0.5">{t.headCircumference}</th><td>{mmToCm(e.headCircumference)} cm</td></tr>
                                </tbody>
                              </table>
                              <div className="flex gap-2 mt-2 justify-end">
                                <Link to={`/examinations/edit/${patient.Patient.id}/${e.id}`}>
                                  <Button size="sm" variant="white"><Pencil size={10} /> {t.change}</Button>
                                </Link>
                                <Button size="sm" variant="danger" onClick={() => setDeleteModal({ type: 'examination', examId: e.id })}>
                                  <Trash2 size={10} /> {t.delete}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                  {examinations.length > 4 && (
                    <div className="text-center mt-4">
                      <Button variant="primary" size="sm" onClick={() => setShowAll(!showAll)}>
                        {showAll ? t.showLess : t.showMore}
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-400">{t.noExaminations}</p>
              )}
            </Card>
          </div>
        </div>

        {/* Charts */}
        {chartData && (
          <Card
            title={t.chartsTitle}
            subtitle={t.chartSubtitle(genderName, weightCategoryName, patient.Patient.birthWeight)}
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
                        <td className="py-1.5 px-1">{formatDateTime(e.dateTime)}</td>
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

        {/* Parent info */}
        <Card title={t.parentInfo} className="hidden-print">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {parents.sort((a, b) => (a.Person.gender === 'female' ? -1 : 1)).map((p, idx) => (
              <div key={idx}>
                <h6 className="font-semibold text-gray-700 mb-3">
                  {p.Person.gender === 'female' ? t.mother : t.father}
                </h6>
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b border-gray-100"><th className="py-1 text-left text-gray-500 font-normal">{t.thBirthNumber}</th><td className="py-1">{formatBirthNumber(p.Person.birthNumber || '')}</td></tr>
                    <tr className="border-b border-gray-100"><th className="py-1 text-left text-gray-500 font-normal">{t.thBirthDate}</th><td className="py-1">{birthDateFromNumber(p.Person.birthNumber || '')}</td></tr>
                    <tr className="border-b border-gray-100"><th className="py-1 text-left text-gray-500 font-normal">{t.labelSurname}</th><td className="py-1">{p.Person.lastName}</td></tr>
                    <tr className="border-b border-gray-100"><th className="py-1 text-left text-gray-500 font-normal">{t.labelFirstName}</th><td className="py-1">{p.Person.firstName}</td></tr>
                    <tr><td colSpan={2} className="py-1" /></tr>
                    <tr className="border-b border-gray-100"><th className="py-1 text-left text-gray-500 font-normal">{t.labelWeightKg}</th><td className="py-1">{p.Person.weight ? p.Person.weight / 1000 : ''}</td></tr>
                    <tr className="border-b border-gray-100"><th className="py-1 text-left text-gray-500 font-normal">{t.labelHeightCm}</th><td className="py-1">{mmToCm(p.Person.length)}</td></tr>
                    <tr className="border-b border-gray-100"><th className="py-1 text-left text-gray-500 font-normal">{t.labelHeadCircCm}</th><td className="py-1">{mmToCm(p.Person.headCircumference)}</td></tr>
                    <tr><td colSpan={2} className="py-1" /></tr>
                    <tr className="border-b border-gray-100"><th className="py-1 text-left text-gray-500 font-normal">{t.labelNotes}</th><td className="py-1">{p.Person.description}</td></tr>
                    <tr className="border-b border-gray-100"><th className="py-1 text-left text-gray-500 font-normal">{t.labelPhone}</th><td className="py-1">{p.Person.phone}</td></tr>
                    <tr className="border-b border-gray-100"><th className="py-1 text-left text-gray-500 font-normal">{t.labelEmail}</th><td className="py-1">{p.Person.email}</td></tr>
                    <tr><td colSpan={2} className="py-1" /></tr>
                    <tr className="border-b border-gray-100"><th className="py-1 text-left text-gray-500 font-normal">{t.labelStreet}</th><td className="py-1">{p.Address.street}</td></tr>
                    <tr className="border-b border-gray-100"><th className="py-1 text-left text-gray-500 font-normal">{t.labelCity}</th><td className="py-1">{p.Address.city}</td></tr>
                    <tr className="border-b border-gray-100"><th className="py-1 text-left text-gray-500 font-normal">{t.labelZip}</th><td className="py-1">{p.Address.zipcode}</td></tr>
                    <tr><th className="py-1 text-left text-gray-500 font-normal">{t.labelCountry}</th><td className="py-1">{p.Address.country}</td></tr>
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </Card>
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
