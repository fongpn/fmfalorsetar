import Logo from '@/components/Logo';
import { useSettings } from '@/contexts/SettingsContext';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function Sidebar() {
  const { settings } = useSettings();
  const router = useRouter();

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Validate', path: '/validate' },
    { name: 'Walk-In', path: '/walk-in' },
    { name: 'Coupon', path: '/coupon' },
    { name: 'POS', path: '/pos' },
    { name: 'Members', path: '/members' },
    { name: 'Reports', path: '/reports' },
  ];

  return (
    <aside className="w-64 h-screen bg-white border-r border-gray-200">
      <div className="flex items-center justify-center px-4 py-2 w-full">
        <Logo className="w-full h-24 object-contain" />
      </div>
      <nav className="mt-4">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.path}>
              <Link
                href={item.path}
                className={`flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 ${
                  router.pathname === item.path ? 'bg-gray-100' : ''
                }`}
              >
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
} 