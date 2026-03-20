import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(formData.email, formData.password);
      toast.success('Connexion réussie ! Bienvenue 🌿');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Email ou mot de passe incorrect.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-yellow-50 p-4">
      <div className="card w-full max-w-md p-8">
        {/* Logo et titre */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div
            className="h-16 w-16 rounded-full bg-[#1B5E20] flex items-center justify-center shadow-md"
            aria-hidden="true"
          >
            <span className="text-3xl">🌿</span>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-[#1B5E20]">MalaMaraichage</h1>
            <p className="text-sm text-gray-500 mt-1">
              Gestion de votre exploitation maraîchère
            </p>
          </div>
        </div>

        {/* Formulaire de connexion */}
        <form onSubmit={handleSubmit} noValidate aria-label="Formulaire de connexion">
          {/* Message d'erreur */}
          {error && (
            <div
              role="alert"
              className="mb-4 flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm"
            >
              <span aria-hidden="true">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Champ Email */}
          <div className="mb-4">
            <label htmlFor="email" className="form-label">
              Adresse e-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="form-input"
              placeholder="vous@exemple.fr"
              aria-required="true"
              aria-describedby={error ? 'login-error' : undefined}
            />
          </div>

          {/* Champ Mot de passe */}
          <div className="mb-6">
            <label htmlFor="password" className="form-label">
              Mot de passe
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={formData.password}
              onChange={handleChange}
              className="form-input"
              placeholder="••••••••"
              aria-required="true"
            />
          </div>

          {/* Bouton de connexion */}
          <button
            type="submit"
            disabled={isLoading || !formData.email || !formData.password}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base"
            aria-label="Se connecter à l'application"
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8z"
                  />
                </svg>
                <span>Connexion en cours…</span>
              </>
            ) : (
              'Se connecter'
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} MalaMaraichage — Tous droits réservés
        </p>
      </div>
    </div>
  );
}
