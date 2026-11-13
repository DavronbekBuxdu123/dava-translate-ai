'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  Home,
  Languages,
  MessagesSquare,
  History,
  Heart,
  BookOpen,
  Settings,
  Search,
  Moon,
  Sun,
  Menu,
  X,
  ArrowUpRight,
  Globe2,
  WifiOff,
  PanelLeftClose,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
const navigation = [
  { href: '/', label: 'Bosh sahifa', icon: Home },
  { href: '/translate', label: 'Tezkor tarjima', icon: Languages },
  { href: '/conversation', label: 'Jonli suhbat', icon: MessagesSquare },
  { href: '/history', label: 'Tarix', icon: History },
  { href: '/favorites', label: 'Sevimlilar', icon: Heart },
  { href: '/phrases', label: 'Sayohat iboralari', icon: BookOpen },
  { href: '/settings', label: 'Sozlamalar', icon: Settings },
];
export function AppShell({ children }: { children: React.ReactNode }) {
  const sidebar = useRef<HTMLElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const [mobile, setMobile] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [offline, setOffline] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const [search, setSearch] = useState('');
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    if ('serviceWorker' in navigator)
      void navigator.serviceWorker.register('/sw.js').catch(() => {});
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  useEffect(() => {
    if (!mobile) return;
    const previous = document.activeElement as HTMLElement | null;
    const focusable = () =>
      Array.from(sidebar.current?.querySelectorAll<HTMLElement>('a,button') || []).filter(
        (el) => el.getClientRects().length,
      );
    focusable()[0]?.focus();
    const listener = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobile(false);
      if (event.key === 'Tab') {
        const items = focusable();
        const first = items[0],
          last = items.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', listener);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener('keydown', listener);
      previous?.focus();
    };
  }, [mobile]);
  return (
    <div className={cn('app-shell', collapsed && 'sidebar-collapsed')}>
      <a href="#main" className="skip-link">
        Asosiy tarkibga o‘tish
      </a>
      {mobile && (
        <button
          className="mobile-backdrop"
          aria-label="Menyuni yopish"
          onClick={() => setMobile(false)}
        />
      )}
      <aside
        ref={sidebar}
        className={cn('sidebar', mobile && 'sidebar-open')}
        aria-label="Asosiy menyu"
      >
        <Link href="/" className="brand" onClick={() => setMobile(false)}>
          <span className="brand-icon">
            <Languages size={25} />
          </span>
          <span className="brand-name">
            DAVA<span>TRANSLATE AI</span>
          </span>
        </Link>
        <div className="sidebar-caption">ISH MAYDONI</div>
        <nav>
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              title={label}
              aria-current={pathname === href ? 'page' : undefined}
              onClick={() => setMobile(false)}
              className={cn('nav-link', pathname === href && 'active')}
            >
              <Icon size={20} />
              <span>{label}</span>
              {pathname === href && <i />}
            </Link>
          ))}
        </nav>
        <div className="travel-card">
          <span className="travel-icon">
            <Globe2 size={24} />
          </span>
          <h3>Til to‘siqsiz sayohat</h3>
          <p>Eng kerakli iboralar doimo yoningizda. Hatto internetsiz ham.</p>
          <Link href="/phrases">
            Iboralarni ochish <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="guest-card">
          <span className="avatar">D</span>
          <div>
            <strong>Mehmon rejimi</strong>
            <small>Shaxsiy brauzer tarixi</small>
          </div>
          <Link href="/settings" aria-label="Mehmon sozlamalari">
            <Settings size={18} />
          </Link>
        </div>
        <Button
          variant="ghost"
          className="collapse-button"
          onClick={() => setCollapsed(!collapsed)}
          aria-label="Menyuni yig‘ish yoki yoyish"
        >
          <PanelLeftClose size={18} />
          <span>Menyuni yig‘ish</span>
        </Button>
        <Button
          variant="ghost"
          className="mobile-close"
          onClick={() => setMobile(false)}
          aria-label="Menyuni yopish"
        >
          <X />
        </Button>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="topbar-left">
            <Button
              variant="ghost"
              size="icon"
              className="mobile-menu"
              aria-label="Menyuni ochish"
              onClick={() => setMobile(true)}
            >
              <Menu />
            </Button>
            <span className="breadcrumb">
              Ish maydoni <span>/</span>{' '}
              <strong>{navigation.find((n) => n.href === pathname)?.label || 'DAVA'}</strong>
            </span>
          </div>
          <div className="topbar-right">
            <form
              className="global-search"
              role="search"
              onSubmit={(event) => {
                event.preventDefault();
                router.push(`/phrases?q=${encodeURIComponent(search)}`);
              }}
            >
              <Search size={17} />
              <input
                aria-label="Iboralarni qidirish"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Iboralarni qidirish..."
              />
              <kbd>↵</kbd>
            </form>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Mavzuni almashtirish"
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            >
              <Sun className="theme-sun" size={20} />
              <Moon className="theme-moon" size={20} />
            </Button>
            <Link href="/settings" className="top-avatar" aria-label="Sozlamalar">
              D
            </Link>
          </div>
        </header>
        {offline && (
          <div className="offline-banner" role="status">
            <WifiOff size={17} /> Siz oflaynsiz. AI tarjima internet talab qiladi; sayohat iboralari
            mavjud.
          </div>
        )}
        <main id="main" className="main-content">
          {children}
        </main>
        <footer className="footer">
          <span>© {new Date().getFullYear()} DAVA Translate AI</span>
          <span>Ikki til. Cheksiz imkoniyatlar.</span>
          <Link href="/settings#privacy">Maxfiylik</Link>
        </footer>
      </div>
    </div>
  );
}
