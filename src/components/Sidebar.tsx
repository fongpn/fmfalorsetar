import Logo from '@/components/Logo';
import { useSettings } from '@/contexts/SettingsContext';

export default function Sidebar() {
  const { settings } = useSettings();
  return (
    <aside className="...">
      <div className="flex items-center gap-2 px-4 py-6">
        <Logo className="h-8 w-8" />
        <span className="font-bold text-xl">{settings?.logo_text || 'FMF'}</span>
      </div>
      {/* ...rest of your sidebar... */}
    </aside>
  );
} 