import { redirect } from 'next/navigation';

export default function MallamsRedirectPage() {
  redirect('/assignments?view=mallams');
}
