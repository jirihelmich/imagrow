import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useDatabase } from '../contexts/DatabaseContext';
import { useT } from '../i18n/LanguageContext';
import { Spinner } from '../components/ui/Spinner';
import { LanguageSwitcher } from '../components/ui/LanguageSwitcher';

export function LoginPage() {
  const { signIn } = useAuth();
  const { loading } = useDatabase();
  const { t } = useT();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <Spinner />;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const user = await signIn(username, password);
      if (!user) {
        toast.error(t.loginFailed);
      } else {
        navigate('/patients/dashboard');
      }
    } catch {
      toast.error(t.unexpectedError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-[2fr_3fr]">
      {/* Brand panel — all narrative content lives here */}
      <aside className="relative bg-gradient-to-br from-[#1c84c6] via-[#256ea0] to-[#2f4050] text-white px-8 py-10 lg:px-12 lg:py-14 flex flex-col overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-white/5 blur-3xl pointer-events-none"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-40 -left-20 w-[28rem] h-[28rem] rounded-full bg-white/5 blur-3xl pointer-events-none"
        />

        <div className="relative z-10 mb-8">
          <h1 className="text-3xl font-bold tracking-tight leading-tight">ImaGrow</h1>
          <p className="text-sm text-white/85 mt-1">{t.loginTitle}</p>
        </div>

        <div className="relative z-10 space-y-4 max-w-xl">
          <p className="text-sm text-white/85 leading-relaxed">{t.loginDescription1}</p>
          <p className="text-sm text-white/85 leading-relaxed">{t.loginDescription2}</p>
        </div>

        <div className="relative z-10 flex-1 flex items-center justify-center my-8">
          <img
            src="./img/login-hero.png"
            alt=""
            aria-hidden="true"
            className="w-72 h-72 lg:w-80 lg:h-80 xl:w-96 xl:h-96 drop-shadow-2xl"
          />
        </div>

        <div className="relative z-10 space-y-3 text-xs text-white/75">
          <p
            className="text-white/65 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: t.loginFooterCopyright }}
          />
          <p className="whitespace-pre-line leading-relaxed">{t.loginFooterGrant}</p>
          <p>{t.loginFooterNorway}</p>
          <div className="flex items-center gap-4 pt-2">
            <img
              src="./img/norsko.png"
              alt="Norsko"
              className="h-10 bg-white rounded px-2 py-1"
            />
            <img
              src="./img/vfn.jpg"
              alt="VFN"
              className="h-9 bg-white rounded px-2 py-1"
            />
          </div>
        </div>
      </aside>

      {/* Form panel — login form only */}
      <main className="bg-gray-50 flex flex-col px-6 py-8 lg:px-12 lg:py-10">
        <div className="flex justify-end">
          <LanguageSwitcher />
        </div>

        <div className="flex-1 flex items-center justify-center">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 w-full max-w-sm space-y-4"
          >
            <header className="mb-2">
              <h2 className="text-xl font-semibold text-gray-900">{t.loginFormTitle}</h2>
              <p className="text-sm text-gray-500 mt-1">{t.loginFormSubtitle}</p>
            </header>

            <input
              type="text"
              className="w-full rounded border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder={t.loginPlaceholderUsername}
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <input
              type="password"
              className="w-full rounded border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder={t.loginPlaceholderPassword}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-primary text-white py-2.5 rounded font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              {t.loginButton}
            </button>
            <Link
              to="/register"
              className="block text-center w-full border border-gray-300 text-gray-700 py-2 rounded text-sm hover:bg-gray-50 transition-colors"
            >
              {t.loginCreateAccount}
            </Link>
          </form>
        </div>
      </main>
    </div>
  );
}
