import { redirect } from 'next/navigation';
import { buildLegacyRedirectTarget } from '../../lib/legacy-route-redirect';

export default async function StudentsRedirectPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  redirect(await buildLegacyRedirectTarget('/progress', searchParams));
}
