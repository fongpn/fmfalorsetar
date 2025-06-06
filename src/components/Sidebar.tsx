import Logo from '@/components/Logo';
import { useSettings } from '@/contexts/SettingsContext';

export default function Sidebar() {
  const { settings } = useSettings();
  return (
    <aside className="...">
      <div className="flex items-center justify-center px-4 py-2 w-full">
        <Logo className="w-full h-24 object-contain" />
      </div>
      {/* ...rest of your sidebar... */}
    </aside>
  );
} 