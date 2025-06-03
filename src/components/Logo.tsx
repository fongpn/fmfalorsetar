import { useSettings } from '@/contexts/SettingsContext';

const DefaultLogoIcon = ({ className = '' }) => (
  <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="16" cy="16" r="16" fill="#FF7F27" />
    <path d="M10 16l4 4 8-8" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const Logo = ({ className = 'h-8 w-8' }) => {
  const { settings } = useSettings();
  if (settings?.logo_url) {
    return <img src={settings.logo_url} alt="Logo" className={className + ' object-contain'} />;
  }
  return <DefaultLogoIcon className={className} />;
};

export default Logo; 