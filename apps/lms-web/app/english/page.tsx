import { redirect } from 'next/navigation';

export default function EnglishStudioPage() {
  redirect('/content?message=English%20Studio%20is%20not%20in%20the%20pilot%20shell%20yet.%20Use%20Content%20Library%20for%20live%20authoring.');
}
