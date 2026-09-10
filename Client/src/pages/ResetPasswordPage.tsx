import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { resetPassword } from '../services/api/auth';
import { apiErrorMessage } from '@/services/http/apiErrorMessage';

const inputClassName =
  'h-12 rounded-xl border-gray-200 bg-white px-4 text-gray-900 placeholder:text-gray-500 ' +
  'focus-visible:border-brand-600 focus-visible:ring-4 focus-visible:ring-brand-600/15';

export default function ResetPasswordPage() {
  const { token = '' } = useParams<{ token: string }>();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!token) {
      setError('This password reset link is invalid. Request a new link from the sign-in page.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword(token, password);
      setIsComplete(true);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-gray-50 px-4 py-12 sm:px-6">
      <section className="w-full max-w-lg rounded-3xl border border-gray-200 bg-white p-6 sm:p-10">
        {isComplete ? (
          <div className="text-center">
            <CheckCircle2 className="mx-auto mb-5 size-12 text-brand-600" aria-hidden="true" />
            <h1 className="text-3xl font-bold text-gray-900">Password reset successfully</h1>
            <p className="mt-3 text-gray-600">
              Your new password is ready. Sign in again to continue planning your trip.
            </p>
            <Link
              to="/login"
              className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand-600 px-8 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
            >
              Return to sign in
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-bold text-gray-900">Choose a new password</h1>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">
              Use at least 8 characters. This reset link can only be used while it remains valid.
            </p>

            <form className="mt-8 space-y-6" onSubmit={handleSubmit} noValidate>
              <label className="block text-sm font-semibold text-gray-800">
                New Password
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className={`mt-2 ${inputClassName}`}
                />
              </label>
              <label className="block text-sm font-semibold text-gray-800">
                Confirm New Password
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className={`mt-2 ${inputClassName}`}
                />
              </label>

              {error && (
                <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
                className="h-12 w-full rounded-xl bg-brand-600 px-8 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
              >
                <span aria-live="polite">{isSubmitting ? 'Resetting Password...' : 'Reset Password'}</span>
                {!isSubmitting && <ArrowRight aria-hidden="true" />}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-600">
              Need a new link?{' '}
              <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">
                Return to sign in
              </Link>
            </p>
          </>
        )}
      </section>
    </main>
  );
}
