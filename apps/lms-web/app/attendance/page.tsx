import { redirect } from 'next/navigation';
import { buildLegacyRedirectTarget } from '../../lib/legacy-route-redirect';

export default async function AttendanceRedirectPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  redirect(await buildLegacyRedirectTarget('/progress', searchParams));
}
