import { Input } from '../ui/Input';
import { TextArea } from '../ui/TextArea';
import { MeasurementInput } from '../ui/MeasurementInput';
import { useT } from '../../i18n/LanguageContext';
import { birthDateFromNumber } from '../../utils/age';

interface PersonSubFormProps {
  data: {
    birthNumber: string;
    firstname: string;
    lastname: string;
    weight: string;
    length: string;
    headCircumference: string;
    description: string;
    phone: string;
    email: string;
  };
  onChange: (field: string, value: string) => void;
  genderLabel: string;
  firstnamePlaceholder?: string;
  lastnamePlaceholder?: string;
}

export function PersonSubForm({ data, onChange, genderLabel, firstnamePlaceholder = 'Jana', lastnamePlaceholder = 'Nováková' }: PersonSubFormProps) {
  const { t } = useT();

  return (
    <div className="space-y-4">
      <Input label={t.personBirthNumber} placeholder="260212/2457" value={data.birthNumber} onChange={(e) => onChange('birthNumber', e.target.value)} />

      <div className="flex items-center gap-4">
        <label className="w-40 shrink-0 text-right text-sm font-medium text-gray-700">{t.personBirthDate}</label>
        <p className="text-sm text-gray-600">{birthDateFromNumber(data.birthNumber || '')}</p>
      </div>

      <hr className="border-dashed" />

      <MeasurementInput label={t.personHeight} value={data.length} onChange={(v) => onChange('length', v)} placeholder="170" />

      <Input label={t.personWeight} type="number" placeholder="70000" suffix="g" value={data.weight} onChange={(e) => onChange('weight', e.target.value)} />

      <MeasurementInput label={t.personHeadCirc} value={data.headCircumference} onChange={(v) => onChange('headCircumference', v)} placeholder="55" />

      <hr className="border-dashed" />

      <div className="flex items-center gap-4">
        <label className="w-40 shrink-0 text-right text-sm font-medium text-gray-700">{t.personGender}</label>
        <p className="text-sm text-gray-600">{genderLabel}</p>
      </div>

      <Input label={t.personFirstName} placeholder={firstnamePlaceholder} value={data.firstname} onChange={(e) => onChange('firstname', e.target.value)} />
      <Input label={t.personSurname} placeholder={lastnamePlaceholder} value={data.lastname} onChange={(e) => onChange('lastname', e.target.value)} />

      <hr className="border-dashed" />

      <TextArea label={t.personNotes} value={data.description} onChange={(e) => onChange('description', e.target.value)} />

      <hr className="border-dashed" />

      <Input label={t.personPhone} placeholder="777 777 770" value={data.phone} onChange={(e) => onChange('phone', e.target.value)} />
      <Input label={t.personEmail} type="email" placeholder="jana@novak.cz" value={data.email} onChange={(e) => onChange('email', e.target.value)} />
    </div>
  );
}
