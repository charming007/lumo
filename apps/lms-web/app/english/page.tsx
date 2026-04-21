import { redirect } from 'next/navigation';

export default function EnglishRedirectPage() {
  redirect('/content?view=english');
}
