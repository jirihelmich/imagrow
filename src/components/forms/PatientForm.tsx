import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { usePatients, type PatientFormData, type ParentFormData } from '../../hooks/usePatients';
import { useT } from '../../i18n/LanguageContext';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { TextArea } from '../ui/TextArea';
import { MeasurementInput } from '../ui/MeasurementInput';
import { Button } from '../ui/Button';
import { PersonSubForm } from './PersonSubForm';
import { AddressSubForm } from './AddressSubForm';
import { birthDateFromNumber } from '../../utils/age';

interface PatientFormProps {
  initialPatient?: PatientFormData;
  initialMother?: ParentFormData;
  initialFather?: ParentFormData;
  isEdit?: boolean;
}

const emptyAddress = { street: '', city: '', country: '', zipcode: '' };

export function PatientForm({ initialPatient, initialMother, initialFather, isEdit = false }: PatientFormProps) {
  const { createOrUpdate } = usePatients();
  const { t } = useT();
  const navigate = useNavigate();

  const hasMotherData = !!(initialMother && (initialMother.birthNumber || initialMother.firstname || initialMother.lastname));
  const hasFatherData = !!(initialFather && (initialFather.birthNumber || initialFather.firstname || initialFather.lastname));
  const [motherOpen, setMotherOpen] = useState(hasMotherData);
  const [fatherOpen, setFatherOpen] = useState(hasFatherData);

  const [patient, setPatient] = useState<PatientFormData>(initialPatient || {
    birthNumber: '', gender: '', birthWeight: 0, birthWeek: 0, expectedBirthDate: '',
    firstname: '', lastname: '', description: '', birthLength: '', birthHeadCircumference: '',
    address: { ...emptyAddress },
  });

  const [mother, setMother] = useState({
    birthNumber: initialMother?.birthNumber || '',
    firstname: initialMother?.firstname || '',
    lastname: initialMother?.lastname || '',
    weight: String(initialMother?.weight || ''),
    length: String(initialMother?.length || ''),
    headCircumference: String(initialMother?.headCircumference || ''),
    description: initialMother?.description || '',
    phone: initialMother?.phone || '',
    email: initialMother?.email || '',
  });
  const [motherAddress, setMotherAddress] = useState(initialMother?.address || { ...emptyAddress });

  const [father, setFather] = useState({
    birthNumber: initialFather?.birthNumber || '',
    firstname: initialFather?.firstname || '',
    lastname: initialFather?.lastname || '',
    weight: String(initialFather?.weight || ''),
    length: String(initialFather?.length || ''),
    headCircumference: String(initialFather?.headCircumference || ''),
    description: initialFather?.description || '',
    phone: initialFather?.phone || '',
    email: initialFather?.email || '',
  });
  const [fatherAddress, setFatherAddress] = useState(initialFather?.address || { ...emptyAddress });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    let hasError = false;
    if (!patient.birthNumber) { toast.error(t.errorNoBirthNumber); hasError = true; }
    if (!patient.birthWeight) { toast.error(t.errorNoBirthWeight); hasError = true; }
    if (!patient.gender) { toast.error(t.errorNoGender); hasError = true; }
    if (!patient.birthWeek) { toast.error(t.errorNoGestationalWeek); hasError = true; }
    if (hasError) return;

    try {
      const motherData: ParentFormData = {
        id: initialMother?.id,
        birthNumber: mother.birthNumber,
        gender: 'female',
        firstname: mother.firstname,
        lastname: mother.lastname,
        weight: mother.weight ? parseInt(mother.weight) : undefined,
        length: mother.length || undefined,
        headCircumference: mother.headCircumference || undefined,
        description: mother.description,
        phone: mother.phone,
        email: mother.email,
        address: { id: (initialMother?.address as Record<string, unknown>)?.id as number | undefined, ...motherAddress },
      };

      const fatherData: ParentFormData = {
        id: initialFather?.id,
        birthNumber: father.birthNumber,
        gender: 'male',
        firstname: father.firstname,
        lastname: father.lastname,
        weight: father.weight ? parseInt(father.weight) : undefined,
        length: father.length || undefined,
        headCircumference: father.headCircumference || undefined,
        description: father.description,
        phone: father.phone,
        email: father.email,
        address: { id: (initialFather?.address as Record<string, unknown>)?.id as number | undefined, ...fatherAddress },
      };

      const result = await createOrUpdate(patient, motherData, fatherData);
      navigate(`/patients/detail/${result[0].id}`);
    } catch (err) {
      toast.error(t.unexpectedError);
      console.error(err);
    }
  };

  const updatePatient = (field: string, value: unknown) => setPatient((p) => ({ ...p, [field]: value }));

  const handleKeyDown = (e: KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
      e.preventDefault();
    }
  };

  return (
    <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-6">
      <Card title={isEdit ? t.patientFormEditTitle : t.patientFormNewTitle} subtitle={t.patientFormSubtitle}>
        <div className="space-y-4">
          <Input label={t.labelBirthNumber} placeholder="260212/2457" required value={patient.birthNumber} onChange={(e) => updatePatient('birthNumber', e.target.value)} />

          <div className="flex items-center gap-4">
            <label className="w-40 shrink-0 text-right text-sm font-medium text-gray-700">{t.labelBirthDateFromNumber}</label>
            <p className="text-sm text-gray-600">{birthDateFromNumber(patient.birthNumber || '')}</p>
          </div>

          <Input label={t.labelExpectedBirthDate} placeholder="17. 3. 2016" value={patient.expectedBirthDate} onChange={(e) => updatePatient('expectedBirthDate', e.target.value)} />

          <hr className="border-dashed" />

          <Select
            label={t.labelGenderRequired}
            options={[{ value: 'female', label: t.optionGirl }, { value: 'male', label: t.optionBoy }]}
            required
            value={patient.gender}
            onChange={(e) => updatePatient('gender', e.target.value)}
          />

          <Input label={t.labelBirthWeightRequired} type="number" placeholder="2345" min={0} max={2500} required suffix="g" value={String(patient.birthWeight || '')} onChange={(e) => updatePatient('birthWeight', parseInt(e.target.value) || 0)} />

          <Input label={t.labelGestationalWeekRequired} type="number" placeholder="28" max={37} min={0} required value={String(patient.birthWeek || '')} onChange={(e) => updatePatient('birthWeek', parseInt(e.target.value) || 0)} />

          <hr className="border-dashed" />

          <Input label={t.labelFirstName} placeholder="Jan" value={patient.firstname || ''} onChange={(e) => updatePatient('firstname', e.target.value)} />
          <Input label={t.labelSurname} placeholder="Novák" value={patient.lastname || ''} onChange={(e) => updatePatient('lastname', e.target.value)} />

          <hr className="border-dashed" />

          <TextArea label={t.labelNotes} placeholder={t.labelNotes} value={patient.description || ''} onChange={(e) => updatePatient('description', e.target.value)} />

          <hr className="border-dashed" />

          <MeasurementInput label={t.labelBirthLength} value={String(patient.birthLength || '')} onChange={(v) => updatePatient('birthLength', v)} />
          <MeasurementInput label={t.labelBirthHeadCirc} value={String(patient.birthHeadCircumference || '')} onChange={(v) => updatePatient('birthHeadCircumference', v)} placeholder="37.5" />
        </div>
      </Card>

      <Card
        title={t.motherCardTitle}
        subtitle={t.motherCardSubtitle}
        headerActions={
          <button type="button" onClick={() => setMotherOpen((o) => !o)} className="text-sm text-gray-500 hover:text-primary flex items-center gap-1">
            {motherOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            {motherOpen ? t.hideSection : t.showSection}
          </button>
        }
      >
        {motherOpen ? (
          <>
            <PersonSubForm
              data={mother}
              onChange={(f, v) => setMother((m) => ({ ...m, [f]: v }))}
              genderLabel={t.genderLabelFemale}
            />
            <hr className="border-dashed my-4" />
            <AddressSubForm
              data={motherAddress as { street: string; city: string; country: string; zipcode: string }}
              onChange={(f, v) => setMotherAddress((a) => ({ ...a, [f]: v }))}
            />
          </>
        ) : (
          <p className="text-sm text-gray-400">{t.sectionCollapsedHint}</p>
        )}
      </Card>

      <Card
        title={t.fatherCardTitle}
        subtitle={t.fatherCardSubtitle}
        headerActions={
          <button type="button" onClick={() => setFatherOpen((o) => !o)} className="text-sm text-gray-500 hover:text-primary flex items-center gap-1">
            {fatherOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            {fatherOpen ? t.hideSection : t.showSection}
          </button>
        }
      >
        {fatherOpen ? (
          <>
            <PersonSubForm
              data={father}
              onChange={(f, v) => setFather((fa) => ({ ...fa, [f]: v }))}
              genderLabel={t.genderLabelMale}
              firstnamePlaceholder="Jan"
              lastnamePlaceholder="Novák"
            />
            <hr className="border-dashed my-4" />
            <AddressSubForm
              data={fatherAddress as { street: string; city: string; country: string; zipcode: string }}
              onChange={(f, v) => setFatherAddress((a) => ({ ...a, [f]: v }))}
            />
          </>
        ) : (
          <p className="text-sm text-gray-400">{t.sectionCollapsedHint}</p>
        )}
      </Card>

      <Card title={isEdit ? t.editPatientDetailsTitle : t.createPatientTitle}>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="white" onClick={() => navigate('/patients/dashboard')}>{t.cancel}</Button>
          <Button type="submit" variant="primary">{isEdit ? t.editPatientDetailsButton : t.addPatientButton}</Button>
        </div>
      </Card>
    </form>
  );
}
