import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { ArrowRight, Eye, EyeOff, Globe, Shield } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { consumePostLoginRedirect } from '../../services/auth/tokenStorage';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Form, FormField, FormFieldItem } from '../../components/ui/form';
import BRANDING from '../../config/branding';

interface AuthFormValues {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

const defaultValues: AuthFormValues = {
  name: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
};

/*
 * Validation lives in zod and is enforced by react-hook-form through the
 * shared Form/FormField/FormFieldItem primitives (see docs/CLIENT-REWAMP-
 * PLAN.md Phase 5). Login only enforces email + password; the register-only
 * fields still parse through the login schema untouched so no state is
 * stripped when the resolver output is applied, and values survive toggling
 * between the two modes exactly as the old hand-rolled state did.
 */
const nameField = z.string().trim();
const emailField = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .pipe(z.email('Enter a valid email address'));
const phoneField = z.string().trim();
const passwordField = z.string().min(1, 'Password is required');
const confirmPasswordField = z.string().min(1, 'Please confirm your password');

const loginSchema = z.object({
  name: nameField,
  email: emailField,
  phone: phoneField,
  password: passwordField,
  confirmPassword: z.string(),
});

const registerSchema = z
  .object({
    // Full name is optional on the login schema (unused there) but the
    // shared `RegisterRequest` contract (Services/shared/contracts) requires
    // `min(1)` — without this, `services/api/auth.ts`'s `RegisterRequest.parse()`
    // throws a raw ZodError whose default .message is unparsed issue JSON,
    // which the catch block below would otherwise surface to the user verbatim.
    name: z.string().trim().min(1, 'Full name is required'),
    email: emailField,
    phone: phoneField,
    password: passwordField,
    confirmPassword: confirmPasswordField,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

/**
 * Resolves where a successful login/register should land. Priority:
 * 1. React Router location state (set by the /my-account auth gate when it
 *    bounces an unauthenticated visitor over here);
 * 2. the session-expiry redirect remembered by the HTTP 401 interceptor
 *    (sessionStorage — survives the hard window.location.assign to /login);
 * 3. `/`.
 */
function resolvePostLoginDestination(from: unknown): string {
  if (from && typeof from === 'object' && 'pathname' in from) {
    const target = from as { pathname?: unknown; search?: unknown };
    if (typeof target.pathname === 'string') {
      const search = typeof target.search === 'string' ? target.search : '';
      return target.pathname + search;
    }
  }
  return consumePostLoginRedirect() ?? '/';
}

/**
 * Shared field styling: converged on the Input primitive's hairline look
 * (border, not border-2) with a solid brand focus ring and a red invalid
 * state (DESIGN.md: destructive = stock red-600; scale utilities are used
 * directly until the semantic token wiring lands).
 */
const fieldInputClassName =
  'h-12 rounded-xl border-gray-200 bg-white px-4 text-gray-900 placeholder:text-gray-500 ' +
  'focus-visible:border-brand-600 focus-visible:ring-4 focus-visible:ring-brand-600/15 ' +
  'aria-invalid:border-red-600 aria-invalid:ring-4 aria-invalid:ring-red-600/15';

export default function LoginContainer() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const resolver = useMemo(
    () => (isLogin ? zodResolver(loginSchema) : zodResolver(registerSchema)),
    [isLogin],
  );
  const form = useForm<AuthFormValues>({ resolver, defaultValues });

  const switchMode = (nextIsLogin: boolean) => {
    if (nextIsLogin !== isLogin) {
      setIsLogin(nextIsLogin);
    }
  };

  const onSubmit = async (values: AuthFormValues) => {
    setError('');
    setIsSubmitting(true);
    try {
      if (isLogin) {
        await login({ email: values.email, password: values.password });
      } else {
        await register({
          name: values.name,
          email: values.email,
          phone: values.phone,
          password: values.password,
          confirmPassword: values.confirmPassword,
        });
      }
      navigate(resolvePostLoginDestination(location.state?.from));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to process request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const passwordEyeToggle = (ariaLabel: string) => (
    <button
      type="button"
      onClick={() => setShowPassword((visible) => !visible)}
      aria-label={ariaLabel}
      className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-gray-400 transition-colors hover:text-brand-600"
    >
      {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
    </button>
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="w-full max-w-5xl overflow-hidden rounded-3xl border border-gray-200 bg-white lg:grid lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Form — the primary element (DESIGN.md / plan: form-first, not a
            50/50 partner with branding). Below lg the branding rail is
            dropped entirely so the form is the first thing on screen under
            the site header. */}
        <div className="p-6 sm:p-8 lg:p-10">
          <div className="mx-auto w-full max-w-lg">
            {/* Login / Register mode toggle */}
            <div
              role="group"
              aria-label="Authentication mode"
              className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1"
            >
              <button
                type="button"
                onClick={() => switchMode(true)}
                aria-pressed={isLogin}
                className={`rounded-lg py-2.5 text-sm font-semibold transition-colors duration-200 ${
                  isLogin
                    ? 'bg-brand-600 text-white'
                    : 'text-gray-600 hover:bg-gray-200/70 hover:text-gray-900'
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => switchMode(false)}
                aria-pressed={!isLogin}
                className={`rounded-lg py-2.5 text-sm font-semibold transition-colors duration-200 ${
                  !isLogin
                    ? 'bg-brand-600 text-white'
                    : 'text-gray-600 hover:bg-gray-200/70 hover:text-gray-900'
                }`}
              >
                Register
              </button>
            </div>

            {/* Form header */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900">
                {isLogin ? 'Sign in to your account' : 'Create your account'}
              </h2>
              <p className="mt-1.5 text-sm text-gray-600">
                {isLogin
                  ? 'Enter your credentials to access your account'
                  : 'Fill in the details below to get started'}
              </p>
            </div>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                noValidate
                className="space-y-6 [&_[data-slot=field-error]]:text-red-600"
              >
                {!isLogin ? (
                  <>
                    <div className="grid gap-6 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field, fieldState }) => (
                          <FormFieldItem label="Full Name" error={fieldState.error}>
                            <Input
                              {...field}
                              type="text"
                              autoComplete="name"
                              placeholder="John Doe"
                              aria-invalid={fieldState.error ? true : undefined}
                              className={fieldInputClassName}
                            />
                          </FormFieldItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field, fieldState }) => (
                          <FormFieldItem label="Phone Number" error={fieldState.error}>
                            <Input
                              {...field}
                              type="tel"
                              inputMode="tel"
                              autoComplete="tel"
                              placeholder="10-digit mobile number"
                              aria-invalid={fieldState.error ? true : undefined}
                              className={fieldInputClassName}
                            />
                          </FormFieldItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field, fieldState }) => (
                        <FormFieldItem label="Email Address" error={fieldState.error}>
                          <Input
                            {...field}
                            type="email"
                            autoComplete="email"
                            placeholder="you@example.com"
                            aria-invalid={fieldState.error ? true : undefined}
                            className={fieldInputClassName}
                          />
                        </FormFieldItem>
                      )}
                    />

                    <div className="grid gap-6 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field, fieldState }) => (
                          <FormFieldItem label="Password" error={fieldState.error}>
                            <div className="relative">
                              <Input
                                {...field}
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="new-password"
                                placeholder="••••••••"
                                aria-invalid={fieldState.error ? true : undefined}
                                className={`${fieldInputClassName} pr-11`}
                              />
                              {passwordEyeToggle(showPassword ? 'Hide password' : 'Show password')}
                            </div>
                          </FormFieldItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="confirmPassword"
                        render={({ field, fieldState }) => (
                          <FormFieldItem label="Confirm Password" error={fieldState.error}>
                            <div className="relative">
                              <Input
                                {...field}
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="new-password"
                                placeholder="••••••••"
                                aria-invalid={fieldState.error ? true : undefined}
                                className={`${fieldInputClassName} pr-11`}
                              />
                              {passwordEyeToggle(showPassword ? 'Hide password' : 'Show password')}
                            </div>
                          </FormFieldItem>
                        )}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field, fieldState }) => (
                        <FormFieldItem label="Email Address" error={fieldState.error}>
                          <Input
                            {...field}
                            type="email"
                            autoComplete="email"
                            placeholder="you@example.com"
                            aria-invalid={fieldState.error ? true : undefined}
                            className={fieldInputClassName}
                          />
                        </FormFieldItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field, fieldState }) => (
                        <FormFieldItem label="Password" error={fieldState.error}>
                          <div className="relative">
                            <Input
                              {...field}
                              type={showPassword ? 'text' : 'password'}
                              autoComplete="current-password"
                              placeholder="••••••••"
                              aria-invalid={fieldState.error ? true : undefined}
                              className={`${fieldInputClassName} pr-11`}
                            />
                            {passwordEyeToggle(showPassword ? 'Hide password' : 'Show password')}
                          </div>
                        </FormFieldItem>
                      )}
                    />

                    {isLogin && (
                      <div className="flex items-center justify-between gap-4">
                        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600">
                          <input
                            type="checkbox"
                            className="size-4 rounded border-gray-300 accent-brand-600"
                          />
                          Remember me
                        </label>
                        <a
                          href="#"
                          className="text-sm font-semibold text-brand-600 transition-colors hover:text-brand-700"
                        >
                          Forgot password?
                        </a>
                      </div>
                    )}
                  </>
                )}

                {error && (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
                  >
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-12 w-full rounded-xl bg-brand-600 px-8 text-sm font-semibold text-white transition-colors duration-300 hover:bg-brand-700"
                >
                  <span>
                    {isSubmitting
                      ? isLogin
                        ? 'Signing In...'
                        : 'Creating Account...'
                      : isLogin
                        ? 'Sign In'
                        : 'Create Account'}
                  </span>
                  {!isSubmitting && <ArrowRight />}
                </Button>
              </form>
            </Form>

            {/* Footer toggle */}
            <p className="mt-6 text-center text-sm text-gray-600">
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <button
                type="button"
                onClick={() => switchMode(!isLogin)}
                className="font-semibold text-brand-600 transition-colors hover:text-brand-700"
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>

        {/* Supporting branding rail — logo + trust bullets only, sized as a
            sidebar not a co-equal panel (plan Phase 5). Solid deep-green
            canvas: no gradient, no decorative blurred orbs, no ambient
            animation (DESIGN.md motion budget). */}
        <aside className="hidden flex-col justify-between gap-10 bg-brand-dark-900 p-8 lg:flex">
          <img
            src={BRANDING.company.logoPath}
            alt={`${BRANDING.company.name} Logo`}
            className="h-10 w-auto object-contain"
          />
          <div className="space-y-6">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                <Globe className="size-5 text-brand-accent-400" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-white">100+ Destinations</h3>
                <p className="mt-0.5 text-sm leading-snug text-white/60">
                  Curated journeys across the globe
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                <Shield className="size-5 text-brand-accent-400" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-white">Secure Bookings</h3>
                <p className="mt-0.5 text-sm leading-snug text-white/60">
                  Your safety and privacy come first
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
