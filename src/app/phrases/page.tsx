import { Suspense } from 'react';
import { PhraseLibrary } from '@/components/phrases/phrase-library';
export const metadata = { title: 'Sayohat iboralari' };
export default function Page() {
  return (
    <Suspense fallback={<div className="skeleton translator-skeleton" />}>
      <PhraseLibrary />
    </Suspense>
  );
}
