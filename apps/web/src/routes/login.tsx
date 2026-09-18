import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { login } from '~/api/auth'
import { requireGuest } from '~/api/auth-queries'
import { ApiError } from '~/api/client'
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
    <div className="grid min-h-screen place-items-center bg-bg px-4 py-10 text-ink">
      <div className="w-full max-w-[360px]">
        <div className="mb-7">
          <h1 className="text-[19px] font-semibold tracking-tight">{t('app.name')}</h1>
          <p className="mt-1 text-[12.5px] text-muted">{t('app.tagline')}</p>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-3.5" noValidate>
          <Field label={t('auth.code')} hint={t('auth.codeHint')}>
            <input
              id="code"
              name="code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              /** Account codes are upper case and typed by people in a hurry.
               *  Displaying them that way stops a lower-case entry looking
               *  wrong when the server accepts it anyway. */
              className={cx(inputBase, "uppercase")}
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

          {/** Held in the flow rather than floated over it: an error that
            *  overlays the form covers the field it is about. */}
          {error ? (
            <p role="alert" className="text-[12px] text-[var(--danger)]">
              {error}
            </p>
          ) : null}

          <Button type="submit" variant="primary" size="md" disabled={busy} className="mt-1">
            {busy ? t('auth.signingIn') : t('auth.signIn')}
          </Button>
        </form>
      </div>
    </div>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium text-muted">{label}</span>
      {children}
      {hint ? <span className="text-[11px] text-muted">{hint}</span> : null}
    </label>
  )
}
