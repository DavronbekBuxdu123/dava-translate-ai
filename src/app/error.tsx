'use client';
import { Button } from '@/components/ui/button';
export default function ErrorPage({ reset }: { reset: () => void }) { return <div className="panel empty"><h1>Sahifa yuklanmadi</h1><p>Ulanishni tekshirib, qayta urinib ko‘ring.</p><Button onClick={reset}>Qayta urinish</Button></div>; }
