export type NotificationTarget = {
  path: string;
  query?: Record<string, string>;
};

/** Serialize one server-authored, in-app navigation target. */
export function toNotificationUrl(target: NotificationTarget): string {
  const query = new URLSearchParams(target.query ?? {}).toString();
  return query ? `${target.path}?${query}` : target.path;
}
