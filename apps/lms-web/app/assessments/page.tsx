import { redirect } from 'next/navigation';

export default async function AssessmentsPage() {
  redirect('/content?view=assessments');
}
