import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import { Plus, Download, Search, Users, Activity, AlertTriangle, CheckCircle2, Baby } from 'lucide-react';
import { usePatients } from '../hooks/usePatients';
import { useExaminations } from '../hooks/useExaminations';
import { useT } from '../i18n/LanguageContext';
import { genderColor } from '../utils/color';
import { formatBirthNumber } from '../utils/birth-number';
import { birthDateFromNumber } from '../utils/age';
import { formatDate } from '../utils/formatting';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import type { PatientWithPerson } from '../types/database';

const ATTENTION_DAYS = 30;

interface OverduePatient {
  patient: PatientWithPerson;
  daysSinceExam: number;
}

export function DashboardPage() {
  const { search, recent, exportDB, count, findByIds } = usePatients();
  const { getLatestPerPatient, countSince } = useExaminations();
  const { t } = useT();

  const [recentPatients, setRecentPatients] = useState<PatientWithPerson[]>([]);
  const [searchResults, setSearchResults] = useState<PatientWithPerson[] | null>(null);
  const [searchToken, setSearchToken] = useState('');
  const [stats, setStats] = useState<{ patients: number; week: number; month: number; attention: number } | null>(null);
  const [overdue, setOverdue] = useState<OverduePatient[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    const now = dayjs();
    const weekAgo = now.subtract(7, 'day').toDate();
    const monthAgo = now.subtract(30, 'day').toDate();
    const attentionThreshold = now.subtract(ATTENTION_DAYS, 'day').toDate();

    const [latest, recents, weekCount, monthCount, patientCount] = await Promise.all([
      getLatestPerPatient(),
      recent(10),
      countSince(weekAgo),
      countSince(monthAgo),
      count(),
    ]);

    const overdueIds: { id: number; daysSinceExam: number }[] = [];
    for (const [pid, date] of latest.entries()) {
      if (date.getTime() < attentionThreshold.getTime()) {
        const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
        overdueIds.push({ id: pid, daysSinceExam: days });
      }
    }
    overdueIds.sort((a, b) => b.daysSinceExam - a.daysSinceExam);
    const top = overdueIds.slice(0, 10);

    const patientsForOverdue = top.length > 0 ? await findByIds(top.map((o) => o.id)) : [];
    const byId = new Map(patientsForOverdue.map((p) => [p.Patient.id, p]));
    const overduePatients: OverduePatient[] = top
      .map(({ id, daysSinceExam }) => {
        const patient = byId.get(id);
        return patient ? { patient, daysSinceExam } : null;
      })
      .filter((x): x is OverduePatient => x !== null);

    setRecentPatients(recents);
    setStats({
      patients: patientCount,
      week: weekCount,
      month: monthCount,
      attention: overduePatients.length,
    });
    setOverdue(overduePatients);
    setLoading(false);
  }, [recent, count, countSince, getLatestPerPatient, findByIds]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Live search with 250ms debounce
  useEffect(() => {
    const token = searchToken.trim();
    if (!token) {
      setSearchResults(null);
      return;
    }
    const handle = setTimeout(() => {
      search(token, 10).then(setSearchResults);
    }, 250);
    return () => clearTimeout(handle);
  }, [searchToken, search]);

  const visibleList = searchResults ?? recentPatients;
  const isSearching = searchResults !== null;
  const hasNoPatients = !loading && stats?.patients === 0;

  return (
    <div>
      <PageHeader
        title={t.dashboardOverviewTitle}
        breadcrumbs={[
          { label: t.breadcrumbHome, to: '/patients/dashboard' },
          { label: t.patients },
        ]}
        actions={
          <>
            <Link to="/patients/new"><Button variant="primary"><Plus size={14} /> {t.dashboardNewPatient}</Button></Link>
            <Button onClick={() => exportDB()}><Download size={14} /> {t.export}</Button>
          </>
        }
      />

      <div className="p-6 space-y-6">
        {loading ? (
          <Spinner />
        ) : hasNoPatients ? (
          <DashboardEmptyState t={t} />
        ) : (
          <>
            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label={t.dashboardStatPatients} value={stats!.patients} icon={<Users size={18} />} />
              <StatCard label={t.dashboardStatExamsWeek} value={stats!.week} icon={<Activity size={18} />} />
              <StatCard label={t.dashboardStatExamsMonth} value={stats!.month} icon={<Activity size={18} />} />
              <StatCard
                label={t.dashboardStatAttention}
                value={stats!.attention}
                icon={<AlertTriangle size={18} />}
                tone={stats!.attention > 0 ? 'warning' : 'ok'}
              />
            </div>

            {/* Search — primary discovery affordance */}
            <div>
              <div className="relative">
                <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchToken}
                  onChange={(e) => setSearchToken(e.target.value)}
                  placeholder={t.dashboardSearchPlaceholder}
                  className="w-full rounded-lg border border-gray-300 bg-white pl-12 pr-4 py-3.5 text-base shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-shadow"
                  autoFocus
                />
              </div>
              <p className="text-xs text-gray-500 mt-1.5 ml-1">{t.dashboardSearchHelp}</p>
            </div>

            {/* Two-column body */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card title={isSearching ? t.dashboardRecentSearchTitle : t.dashboardRecentTitle}>
                  {visibleList.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8">{t.dashboardNoPatients}</p>
                  ) : (
                    <PatientTable patients={visibleList} t={t} />
                  )}
                </Card>
              </div>
              <div>
                <Card title={t.dashboardAttentionTitle}>
                  {overdue.length === 0 ? (
                    <div className="flex items-start gap-3 text-sm text-gray-600 py-2">
                      <CheckCircle2 size={18} className="text-primary shrink-0 mt-0.5" />
                      <p>{t.dashboardAttentionEmpty}</p>
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {overdue.map(({ patient, daysSinceExam }) => (
                        <AttentionRow
                          key={patient.Patient.id}
                          patient={patient}
                          daysSinceExam={daysSinceExam}
                          t={t}
                        />
                      ))}
                    </ul>
                  )}
                </Card>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone?: 'default' | 'warning' | 'ok';
}

function StatCard({ label, value, icon, tone = 'default' }: StatCardProps) {
  const accent =
    tone === 'warning' && value > 0
      ? 'text-amber-700 bg-amber-100'
      : tone === 'ok'
        ? 'text-primary bg-primary/10'
        : 'text-primary bg-primary/10';

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-3 shadow-sm">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${accent}`}>{icon}</div>
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-semibold text-gray-800 leading-tight">{value}</p>
      </div>
    </div>
  );
}

interface PatientTableProps {
  patients: PatientWithPerson[];
  t: ReturnType<typeof useT>['t'];
}

function PatientTable({ patients, t }: PatientTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs text-gray-500 uppercase tracking-wide">
            <th className="py-2 px-2">{t.thName}</th>
            <th className="py-2 px-2">{t.thBirthNumber}</th>
            <th className="py-2 px-2">{t.thBirthDate}</th>
            <th className="py-2 px-2">{t.thGestationalWeek}</th>
            <th className="py-2 px-2">{t.thBirthWeight}</th>
          </tr>
        </thead>
        <tbody>
          {patients.map((p) => (
            <tr key={p.Patient.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2 px-2">
                <Link
                  to={`/patients/detail/${p.Patient.id}`}
                  className="hover:underline font-medium inline-flex items-baseline gap-2"
                  style={{ color: genderColor(p) }}
                >
                  <span>{p.Person.firstName} {p.Person.lastName}</span>
                  <span className="text-xs text-gray-400 font-normal">#{p.Patient.id}</span>
                </Link>
              </td>
              <td className="py-2 px-2 font-mono text-xs text-gray-500">{formatBirthNumber(p.Person.birthNumber || '')}</td>
              <td className="py-2 px-2">{birthDateFromNumber(p.Person.birthNumber || '')}</td>
              <td className="py-2 px-2">{t.listGestationShort(p.Patient.birthWeek)}</td>
              <td className="py-2 px-2">{p.Patient.birthWeight} g</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface AttentionRowProps {
  patient: PatientWithPerson;
  daysSinceExam: number;
  t: ReturnType<typeof useT>['t'];
}

function AttentionRow({ patient, daysSinceExam, t }: AttentionRowProps) {
  const color = genderColor(patient);
  const fullName = `${patient.Person.firstName ?? ''} ${patient.Person.lastName ?? ''}`.trim() || `ID ${patient.Patient.id}`;
  return (
    <li>
      <Link
        to={`/patients/detail/${patient.Patient.id}`}
        className="flex items-center gap-3 px-2 py-2 -mx-2 rounded hover:bg-gray-50 transition-colors"
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${color}1a`, color }}
        >
          <Baby size={14} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate" style={{ color }}>{fullName}</p>
          <p className="text-xs text-gray-500">{t.dashboardAttentionOverdue(daysSinceExam)}</p>
        </div>
      </Link>
    </li>
  );
}

function DashboardEmptyState({ t }: { t: ReturnType<typeof useT>['t'] }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
        <Baby size={32} />
      </div>
      <h2 className="text-lg font-semibold text-gray-800 mb-1">{t.dashboardEmptyTitle}</h2>
      <p className="text-sm text-gray-500 mb-6 max-w-md">{t.dashboardEmptyBody}</p>
      <Link to="/patients/new">
        <Button variant="primary"><Plus size={14} /> {t.dashboardNewPatient}</Button>
      </Link>
    </div>
  );
}
