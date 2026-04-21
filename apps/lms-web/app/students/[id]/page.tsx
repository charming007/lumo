import { redirect } from 'next/navigation';

export default function StudentDetailRedirectPage() {
  redirect('/progress?view=students');
}
