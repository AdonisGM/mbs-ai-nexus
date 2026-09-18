import { createFileRoute } from '@tanstack/react-router'
import { Card, CardTitle } from '~/components/ui/primitives'
import { t } from '~/i18n'

export const Route = createFileRoute('/_app/')({ component: Today })

/** Placeholder while the screens are built. It shows who is signed in, which
 *  is the one thing worth proving before anything else exists. */
function Today() {
  const { user } = Route.useRouteContext()

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[17px] font-semibold tracking-tight">{t('nav.today')}</h1>
        <p className="mt-1 text-[12.5px] text-muted">
          {user.name} · {t(`role.${user.role}`)}
          {user.segment ? ` · ${t(`segment.${user.segment}`)}` : ''}
        </p>
      </div>

      <Card>
        <CardTitle>Đang dựng</CardTitle>
        <p className="mt-2 text-[12.5px] text-muted">
          Khung ứng dụng đã chạy. Các màn hình sẽ dựng tiếp lên đây.
        </p>
      </Card>
    </div>
  )
}
