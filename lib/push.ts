import webpush from 'web-push'
import type { PushSubscriptionRow } from './types'

let configured = false

function configure() {
  if (configured) return
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT
  if (!pub || !priv || !subject) throw new Error('VAPID env vars missing')
  webpush.setVapidDetails(subject, pub, priv)
  configured = true
}

export async function sendPush(
  sub: PushSubscriptionRow,
  payload: { title: string; body: string; gameId?: string; url?: string }
): Promise<'sent' | 'gone'> {
  configure()
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload)
    )
    return 'sent'
  } catch (e: unknown) {
    // 410 Gone = subscription expired / revoked
    if (e instanceof Error && 'statusCode' in e && (e as { statusCode: number }).statusCode === 410) {
      return 'gone'
    }
    throw e
  }
}
