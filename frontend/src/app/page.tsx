import { redirect } from 'next/navigation';

/** Raiz sempre abre a Central operacional */
export default function HomePage() {
  redirect('/central');
}
