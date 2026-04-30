import { useState, useEffect, useMemo, type FormEvent, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import { useExaminations, type ExaminationFormData } from '../../hooks/useExaminations';
import { useT } from '../../i18n/LanguageContext';
import { buildChartData } from '../../hooks/useChartData';
import { correctedWeek } from '../../utils/age';
import { genderColor } from '../../utils/color';
import { numerize, cmToMm, mmToCm } from '../../utils/formatting';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { TextArea } from '../ui/TextArea';
import { MeasurementInput } from '../ui/MeasurementInput';
import { Button } from '../ui/Button';
import { GrowthChartGrid } from '../charts/GrowthChartGrid';
import type { PatientWithExamination, Examination } from '../../types/database';
import type { Gender, WeightCategory } from '../../types/statistical';

interface ExaminationFormProps {
  patientId: number;
  patient: PatientWithExamination | null;
  initialExamination?: Examination | null;
}

export function ExaminationForm({ patientId, patient, initialExamination }: ExaminationFormProps) {
  const { createOrUpdate, getAllByPatient } = useExaminations();
  const { t } = useT();
  const navigate = useNavigate();
  const [history, setHistory] = useState<Examination[]>([]);

  useEffect(() => {
    getAllByPatient(patientId).then(setHistory);
  }, [getAllByPatient, patientId]);

  const [examination, setExamination] = useState<ExaminationFormData>({
    id: initialExamination?.id,
    dateTime: initialExamination
      ? dayjs(initialExamination.dateTime).format('D. M. YYYY')
      : dayjs().format('D. M. YYYY'),
    weight: initialExamination?.weight ? String(initialExamination.weight) : '',
    length: initialExamination?.length
      ? String(initialExamination.length / 10) + (initialExamination.length % 10 === 0 ? '.0' : '')
      : '',
    headCircumference: initialExamination?.headCircumference
      ? String(initialExamination.headCircumference / 10) + (initialExamination.headCircumference % 10 === 0 ? '.0' : '')
      : '',
    description: initialExamination?.description || '',
    image: initialExamination?.image || null,
  });

  const update = (field: string, value: unknown) => setExamination((e) => ({ ...e, [field]: value }));

  const handleKeyDown = (e: KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
      e.preventDefault();
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const parsed = dayjs(examination.dateTime, ['D. M. YYYY H:m', 'D. M. YYYY']);
    if (parsed.toDate().getFullYear() < 1950) {
      toast.error(t.errorYearBefore1950);
      return;
    }

    try {
      await createOrUpdate(patientId, examination);
      navigate(`/patients/detail/${patientId}`);
    } catch (err) {
      console.error(err);
      toast.error(t.errorUnexpected);
    }
  };

  const isEdit = !!initialExamination;
  const lastExam = patient?.Examination?.id ? patient.Examination : null;

  const lengthRef = lastExam?.length ?? patient?.Patient.birthLength;
  const weightRef = lastExam?.weight ?? patient?.Patient.birthWeight;
  const headCircRef = lastExam?.headCircumference ?? patient?.Patient.birthHeadCircumference;
  const refLabel = lastExam ? t.examHintLast : t.examHintBirth;
  const lengthHint = lengthRef ? `${refLabel} ${mmToCm(lengthRef)} cm` : undefined;
  const weightHint = weightRef ? `${refLabel} ${weightRef} g` : undefined;
  const headCircHint = headCircRef ? `${refLabel} ${mmToCm(headCircRef)} cm` : undefined;

  const gender = (patient?.Person?.gender || 'male') as Gender;
  const weightCategory: WeightCategory = patient && patient.Patient.birthWeight <= 1500 ? 'under' : 'above';
  const color = genderColor(patient ?? null);
  const genderName = gender === 'female' ? t.genderFemale : t.genderMale;
  const weightCategoryName = weightCategory === 'under' ? t.weightBelow : t.weightAbove;
  const patientName = patient ? `${patient.Person.firstName ?? ''} ${patient.Person.lastName ?? ''}`.trim() : '';

  const livePreviewChartData = useMemo(() => {
    if (!patient?.Patient) return null;

    const weights: Record<number, number> = {};
    const lengths: Record<number, number> = {};
    const headCircumferences: Record<number, number> = {};
    const weightsForLengths: Record<number, number> = {};

    for (const e of history) {
      if (initialExamination && e.id === initialExamination.id) continue;
      if (!e.length) continue;
      const week = correctedWeek(patient, e.dateTime);
      if (isNaN(week)) continue;
      weights[week] = e.weight;
      lengths[week] = e.length;
      headCircumferences[week] = e.headCircumference;
      weightsForLengths[Math.floor(e.length / 10)] = e.weight;
    }

    if (patient.Patient.birthWeight) {
      weights[patient.Patient.birthWeek - 40] = patient.Patient.birthWeight;
    }
    if (patient.Patient.birthLength) {
      lengths[patient.Patient.birthWeek - 40] = patient.Patient.birthLength;
    }
    if (patient.Patient.birthHeadCircumference) {
      headCircumferences[patient.Patient.birthWeek - 40] = patient.Patient.birthHeadCircumference;
    }

    const liveDate = dayjs(examination.dateTime, ['D. M. YYYY H:m', 'D. M. YYYY']).toDate();
    const liveDateValid = !isNaN(liveDate.getTime()) && liveDate.getFullYear() >= 1950;
    const liveWeight = numerize(examination.weight);
    const liveLength = cmToMm(examination.length);
    const liveHeadCirc = cmToMm(examination.headCircumference);

    if (liveDateValid) {
      const liveWeek = correctedWeek(patient, liveDate);
      if (!isNaN(liveWeek)) {
        if (!isNaN(liveWeight) && liveWeight > 0) weights[liveWeek] = liveWeight;
        if (!isNaN(liveLength) && liveLength > 0) lengths[liveWeek] = liveLength;
        if (!isNaN(liveHeadCirc) && liveHeadCirc > 0) headCircumferences[liveWeek] = liveHeadCirc;
        if (
          !isNaN(liveWeight) && liveWeight > 0 &&
          !isNaN(liveLength) && liveLength > 0
        ) {
          weightsForLengths[Math.floor(liveLength / 10)] = liveWeight;
        }
      }
    }

    return {
      weight: buildChartData(gender, weightCategory, 'weight', weights),
      length: buildChartData(gender, weightCategory, 'length', lengths),
      headCircumference: buildChartData(gender, weightCategory, 'headCircumference', headCircumferences),
      weightForLength: buildChartData(gender, weightCategory, 'weightForLength', weightsForLengths),
    };
  }, [patient, history, initialExamination, examination, gender, weightCategory]);

  return (
    <form onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
      <Card
        title={isEdit ? t.examFormEditTitle : t.examFormNewTitle}
        subtitle={t.examFormSubtitle}
      >
        <div className="space-y-4">
          <Input label={t.labelExamDate} placeholder="17. 3. 2016" value={examination.dateTime} onChange={(e) => update('dateTime', e.target.value)} />
          <TextArea label={t.labelNotes} value={examination.description || ''} onChange={(e) => update('description', e.target.value)} />

          <hr className="border-dashed" />

          <MeasurementInput
            label={t.examLength}
            value={String(examination.length)}
            onChange={(v) => update('length', v)}
            placeholder={lastExam ? mmToCm(lastExam.length) : undefined}
            hint={lengthHint}
          />
          <Input
            label={t.examWeight}
            type="number"
            placeholder={lastExam ? String(lastExam.weight) : '2345'}
            suffix="g"
            value={String(examination.weight)}
            onChange={(e) => update('weight', e.target.value)}
            hint={weightHint}
          />
          <MeasurementInput
            label={t.examHeadCirc}
            value={String(examination.headCircumference)}
            onChange={(v) => update('headCircumference', v)}
            placeholder={lastExam ? mmToCm(lastExam.headCircumference) : '37.5'}
            hint={headCircHint}
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="white" onClick={() => navigate(`/patients/detail/${patientId}`)}>{t.cancel}</Button>
            <Button type="submit" variant="primary">{isEdit ? t.editMeasurement : t.addMeasurement}</Button>
          </div>
        </div>
      </Card>

      {livePreviewChartData && (
        <div className="mt-6">
          <Card title={t.examPreviewTitle} subtitle={t.examPreviewSubtitle}>
            <GrowthChartGrid
              weightData={livePreviewChartData.weight}
              lengthData={livePreviewChartData.length}
              headCircumferenceData={livePreviewChartData.headCircumference}
              weightForLengthData={livePreviewChartData.weightForLength}
              genderColor={color}
              genderName={genderName}
              weightCategoryName={weightCategoryName}
              birthWeight={patient?.Patient.birthWeight}
              patientName={patientName}
              gender={gender}
              weightCategory={weightCategory}
              columns={4}
              height={260}
            />
          </Card>
        </div>
      )}
    </form>
  );
}
