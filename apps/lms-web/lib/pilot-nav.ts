import { redirect } from 'next/navigation';

const PILOT_HIDDEN_ROUTE_TARGETS: Record<string, string> = {
  '/canvas': '/content',
  '/english': '/content',
  '/reports': '/',
  '/rewards': '/progress',
  '/guide': '/settings',
};

export function redirectIfPilotHiddenRoute(pathname: string) {
  const target = PILOT_HIDDEN_ROUTE_TARGETS[pathname];

  if (target) {
    redirect(target);
  }
}
