import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { login } from '~/api/auth'
import { requireGuest } from '~/api/auth-queries'
import { ApiError } from '~/api/client'
import { AuthFooter, AuthLayout, BrandLockup } from '~/components/layout/auth-layout'
import { inputBase } from '~/components/ui/form-controls'
import { Button, cx } from '~/components/ui/primitives'
import { t, tError } from '~/i18n'

export const Route = createFileRoute('/login')({
  beforeLoad: ({ context }) => requireGuest(context.queryClient),
  component: LoginScreen,
})

function LoginScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (busy) return

    setBusy(true)
    setError(null)

    try {
      await login({ code, password })
      /** Drop whatever the guard cached before this session existed, then let
       *  the router re-run it against the server. */
      queryClient.clear()
      await router.navigate({ to: '/' })
    } catch (caught) {
      /** The API answers in codes, never sentences — the dictionary turns them
       *  into something a salesperson can act on. A code with no entry falls
       *  back to a general line rather than showing its own name. */
      setError(tError(caught instanceof ApiError ? caught.message : null))
      setBusy(false)
    }
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-[400px]">
        <BrandLockup />

        <h1 className="mt-5 text-[26px] leading-tight font-semibold tracking-tight">
          {t('auth.welcome')}
        </h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{t('auth.welcomeNote')}</p>

        <div className="mt-6 rounded-xl border border-line bg-surface p-5">
          <h2 className="text-[14.5px] font-semibold">{t('auth.cardTitle')}</h2>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">{t('auth.cardNote')}</p>

          <form onSubmit={submit} className="mt-4 flex flex-col gap-3" noValidate>
            <Field label={t('auth.code')}>
              <input
                id="code"
                name="code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder={t('auth.codePlaceholder')}
                /** Account codes are upper case and typed by people in a
                 *  hurry. Showing them that way stops a lower-case entry
                 *  looking wrong when the server accepts it anyway. */
                className={cx(inputBase, 'uppercase placeholder:normal-case')}
                autoComplete="username"
                autoCapitalize="characters"
                autoFocus
                required
              />
            </Field>

            <Field label={t('auth.password')}>
              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={inputBase}
                autoComplete="current-password"
                required
              />
            </Field>

            {/** Kept in the flow rather than floated over the form: a message
              *  that overlays the fields covers the one it is about. */}
            {error ? (
              <p role="alert" className="text-[12px] text-danger">
                {error}
              </p>
            ) : null}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={busy}
              className="mt-1 w-full"
            >
              {busy ? t('auth.signingIn') : t('auth.signIn')}
            </Button>
          </form>

          <div className="mt-4 flex items-center justify-between border-t border-line pt-3.5">
            <span className="flex items-center gap-2 text-[12px] text-muted">
              <span className="size-1 rounded-full bg-muted" />
              {t('auth.forgot')}
            </span>
            <span className="text-[12px] text-ink2">{t('auth.contactAdmin')}</span>
          </div>
        </div>

        <p className="mt-5 text-[11.5px] leading-relaxed text-muted">{t('auth.issuedNote')}</p>

        <div className="mt-6">
          <AuthFooter />
        </div>
      </div>
    </AuthLayout>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium text-muted">{label}</span>
      {children}
    </label>
  )
}
