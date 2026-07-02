import { redirect } from 'next/navigation';

export default function LegacyTranslationsRedirect() {
  redirect('/admin/ui-strings');
}
