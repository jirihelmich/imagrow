import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Baby, Search } from 'lucide-react';
import { usePatients } from '../hooks/usePatients';
import { useExaminations } from '../hooks/useExaminations';
import { useT } from '../i18n/LanguageContext';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { formatBirthNumber, dateFromBirthNumber, birthDateObjectToDate } from '../utils/birth-number';
import { birthDateFromNumber } from '../utils/age';
import { formatDate } from '../utils/formatting';
import { genderColor } from '../utils/color';
import type { PatientWithPerson } from '../types/database';

type SortKey = 'newest' | 'oldest' | 'name' | 'lastVisit' | 'gestation';

export function PatientListPage() {
  const { all } = usePatients();
  const { getLatestPerPatient } = useExaminations();
  const { t } = useT();
  const [patients, setPatients] = useState<PatientWithPerson[]>([]);
  const [latestExams, setLatestExams] = useState<Map<number, Date>>(new Map());
  const [filter, setFilter] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('newest');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([all(), getLatestPerPatient()]).then(([ps, latest]) => {
      setPatients(ps);
      setLatestExams(latest);
      setLoading(false);
    });
  }, [all, getLatestPerPatient]);

  const visible = useMemo(() => {
    const f = filter.trim().toLowerCase();
    let list = patients;
    if (f) {
      list = list.filter((p) => {
        const fullName = `${p.Person.firstName ?? ''} ${p.Person.lastName ?? ''}`.toLowerCase();
        const bn = (p.Person.birthNumber || '').toLowerCase();
        const dob = birthDateFromNumber(p.Person.birthNumber || '').toLowerCase();
        return fullName.includes(f) || bn.includes(f) || dob.includes(f);
      });
    }

    const cmp = (a: PatientWithPerson, b: PatientWithPerson) => {
      switch (sortBy) {
        case 'newest':
        case 'oldest': {
          const aBd = dateFromBirthNumber(a.Person.birthNumber || '');
          const bBd = dateFromBirthNumber(b.Person.birthNumber || '');
          const aT = aBd ? birthDateObjectToDate(aBd).getTime() : 0;
          const bT = bBd ? birthDateObjectToDate(bBd).getTime() : 0;
          return sortBy === 'newest' ? bT - aT : aT - bT;
        }
        case 'name':
          return (a.Person.lastName || '').localeCompare(b.Person.lastName || '', 'cs');
        case 'lastVisit': {
          const aT = latestExams.get(a.Patient.id)?.getTime() ?? 0;
          const bT = latestExams.get(b.Patient.id)?.getTime() ?? 0;
          return bT - aT;
        }
        case 'gestation':
          return a.Patient.birthWeek - b.Patient.birthWeek;
      }
    };

    return [...list].sort(cmp);
  }, [patients, filter, sortBy, latestExams]);

  const totalCount = patients.length;
  const showingFiltered = filter.trim().length > 0 && visible.length !== totalCount;

  return (
    <div>
      <PageHeader
        title={t.patientListTitle}
        breadcrumbs={[
          { label: t.breadcrumbHome, to: '/patients/dashboard' },
          { label: t.patients, to: '/patients/dashboard' },
          { label: t.patientListBreadcrumb },
        ]}
        actions={
          <>
            <span className="text-sm text-gray-500">
              {showingFiltered ? `${visible.length} / ${totalCount}` : t.patientListTotal(totalCount)}
            </span>
            <Link to="/patients/new">
              <Button variant="primary"><Plus size={14} /> {t.dashboardNewPatient}</Button>
            </Link>
          </>
        }
      />

      <div className="p-6 space-y-4">
        {/* Filter + sort toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder={t.listFilterPlaceholder}
              className="w-full rounded border border-gray-300 bg-white pl-9 pr-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 shrink-0">{t.listSortBy}</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="rounded border border-gray-300 bg-white px-2 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="newest">{t.listSortNewest}</option>
              <option value="oldest">{t.listSortOldest}</option>
              <option value="name">{t.listSortName}</option>
              <option value="lastVisit">{t.listSortLastVisit}</option>
              <option value="gestation">{t.listSortGestation}</option>
            </select>
          </div>
        </div>

        {loading ? (
          <Spinner />
        ) : totalCount === 0 ? (
          <EmptyState
            title={t.listEmptyTitle}
            body={t.listEmptyBody}
            actionLabel={t.listEmptyAction}
            actionTo="/patients/new"
          />
        ) : visible.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-12">{t.listFilterNoResults}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {visible.map((p) => (
              <PatientCard
                key={p.Patient.id}
                patient={p}
                lastSeen={latestExams.get(p.Patient.id) ?? null}
                t={t}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface PatientCardProps {
  patient: PatientWithPerson;
  lastSeen: Date | null;
  t: ReturnType<typeof useT>['t'];
}

function PatientCard({ patient, lastSeen, t }: PatientCardProps) {
  const color = genderColor(patient);
  const fullName = `${patient.Person.firstName ?? ''} ${patient.Person.lastName ?? ''}`.trim() || `ID ${patient.Patient.id}`;
  const bn = formatBirthNumber(patient.Person.birthNumber || '');
  const dob = birthDateFromNumber(patient.Person.birthNumber || '');

  return (
    <div
      className="group relative bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-primary/40 transition-all overflow-hidden"
      style={{ borderLeftColor: color, borderLeftWidth: 4 }}
    >
      <Link to={`/patients/detail/${patient.Patient.id}`} className="block p-4">
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${color}1a`, color }}
          >
            <Baby size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="font-semibold text-gray-800 truncate" style={{ color }}>{fullName}</h3>
              <span className="text-xs text-gray-400 shrink-0">#{patient.Patient.id}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {dob} · {t.listGestationShort(patient.Patient.birthWeek)}
            </p>
            <p className="text-xs text-gray-400 font-mono">{bn}</p>
            <p className="text-xs text-gray-500 mt-2">
              {lastSeen ? t.listLastSeen(formatDate(lastSeen)) : <span className="italic text-gray-400">{t.listNeverSeen}</span>}
            </p>
          </div>
        </div>
      </Link>

      <Link
        to={`/examinations/new/${patient.Patient.id}`}
        className="absolute bottom-2 right-2 px-2 py-1 rounded text-xs font-medium text-primary bg-primary/0 hover:bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {t.listAddExamShort}
      </Link>
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  body: string;
  actionLabel: string;
  actionTo: string;
}

function EmptyState({ title, body, actionLabel, actionTo }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
        <Baby size={32} />
      </div>
      <h2 className="text-lg font-semibold text-gray-800 mb-1">{title}</h2>
      <p className="text-sm text-gray-500 mb-6 max-w-sm">{body}</p>
      <Link to={actionTo}>
        <Button variant="primary"><Plus size={14} /> {actionLabel}</Button>
      </Link>
    </div>
  );
}
