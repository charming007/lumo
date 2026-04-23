import { redirect } from 'next/navigation';

export default function DevicesPage() {
  redirect('/pods?message=Devices%20are%20managed%20inside%20Pods%20because%20tablet%20assignment%20is%20pod-scoped%20operational%20work.');
}
