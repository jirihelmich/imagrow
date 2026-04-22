import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import { useExaminations, type ExaminationFormData } from '../../hooks/useExaminations';
import { useT } from '../../i18n/LanguageContext';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { TextArea } from '../ui/TextArea';
import { MeasurementInput } from '../ui/MeasurementInput';
import { Button } from '../ui/Button';
import type { PatientWithExamination, Examination } from '../../types/database';

interface ExaminationFormProps {
  patientId: number;
  patient: PatientWithExamination | null;
  initialExamination?: Examination | null;
}

export function ExaminationForm({ patientId, patient, initialExamination }: ExaminationFormProps) {
  const { createOrUpdate } = useExaminations();
  const { t } = useT();
  const navigate = useNavigate();

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

          {!isEdit && (lastExam ? (
            <div className="bg-navy/10 rounded-lg p-4 mb-4">
              <h6 className="font-semibold text-gray-700 mb-2">{t.lastExamValues}</h6>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div><span className="text-gray-500">{t.labelBodyLength}</span> {lastExam.length / 10} cm</div>
                <div><span className="text-gray-500">{t.labelBodyWeight}</span> {lastExam.weight} g</div>
                <div><span className="text-gray-500">{t.labelHeadCircumference}</span> {lastExam.headCircumference / 10} cm</div>
              </div>
            </div>
          ) : patient?.Patient && (
            <div className="bg-navy/10 rounded-lg p-4 mb-4">
              <h6 className="font-semibold text-gray-700 mb-2">{t.birthData}</h6>
              <div className="grid grid-cols-3 gap-4 text-sm">
                {patient.Patient.birthLength != null && <div><span className="text-gray-500">{t.labelBirthLengthColon}</span> {patient.Patient.birthLength / 10} cm</div>}
                <div><span className="text-gray-500">{t.labelBirthWeightColon}</span> {patient.Patient.birthWeight} g</div>
                {patient.Patient.birthHeadCircumference != null && <div><span className="text-gray-500">{t.labelBirthHeadCircColon}</span> {patient.Patient.birthHeadCircumference / 10} cm</div>}
              </div>
            </div>
          ))}

          <MeasurementInput label={t.examLength} value={String(examination.length)} onChange={(v) => update('length', v)} />
          <Input label={t.examWeight} type="number" placeholder="2345" suffix="g" value={String(examination.weight)} onChange={(e) => update('weight', e.target.value)} />
          <MeasurementInput label={t.examHeadCirc} value={String(examination.headCircumference)} onChange={(v) => update('headCircumference', v)} placeholder="37.5" />

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="white" onClick={() => navigate(`/patients/detail/${patientId}`)}>{t.cancel}</Button>
            <Button type="submit" variant="primary">{isEdit ? t.editMeasurement : t.addMeasurement}</Button>
          </div>
        </div>
      </Card>
    </form>
  );
}
