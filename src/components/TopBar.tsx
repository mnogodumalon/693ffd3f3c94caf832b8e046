import { useState, useEffect, useRef } from 'react';
import { getHeaderProfile, getAppGroups } from '@/services/livingAppsService';
import type { HeaderProfile, AppGroupInfo } from '@/services/livingAppsService';

function AppsIcon({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
      <circle cx="5.83" cy="5.83" r="2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="11.67" y="3.33" width="5" height="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="3.33" y="11.67" width="5" height="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="14.17" cy="14.17" r="2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function TopBar() {
  const [profile, setProfile] = useState<HeaderProfile | null>(null);
  const [appGroups, setAppGroups] = useState<AppGroupInfo[]>([]);
  const [appsOpen, setAppsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const appsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getHeaderProfile().then(p => {
      setProfile(p);
      if (p.image) { const img = new Image(); img.src = p.image; }
    }).catch(() => {});
    getAppGroups().then(groups => {
      setAppGroups(groups);
      groups.forEach(g => { if (g.image) { const img = new Image(); img.src = g.image; } });
    }).catch(() => {});
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (appsRef.current && !appsRef.current.contains(e.target as Node)) setAppsOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const initials = profile
    ? `${profile.firstname?.[0] ?? ''}${profile.surname?.[0] ?? ''}`.toUpperCase()
    : '';

  return (
    <div className="flex items-center gap-3 lg:gap-5">
      {/* Apps */}
      <div ref={appsRef} className="relative">
        <button
          onClick={() => { setAppsOpen(!appsOpen); setProfileOpen(false); }}
          className="flex flex-col items-center gap-1 cursor-pointer"
        >
          <div className="flex items-center justify-center w-[35px] h-[35px] rounded-full bg-white shadow-[0px_0px_4px_rgba(155,155,155,0.5)]">
            <AppsIcon size={20} className="text-foreground" />
          </div>
          <span className="text-xs text-[#767676] hidden lg:block">Apps</span>
        </button>
        {appsOpen && appGroups.length > 0 && (
          <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-lg border border-border p-2 z-50 max-h-96 overflow-y-auto">
            {appGroups.map(g => (
              <a
                key={g.id}
                href={g.href} /* Falls back to /gateway/apps/{firstAppId} when no dashboard exists */
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors"
              >
                {g.image ? (
                  <img src={g.image} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <AppsIcon size={14} className="text-muted-foreground" />
                  </div>
                )}
                <span className="text-sm truncate">{g.name}</span>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Profile */}
      <div ref={profileRef} className="relative">
        <button
          onClick={() => { setProfileOpen(!profileOpen); setAppsOpen(false); }}
          className="flex flex-col items-center gap-1 cursor-pointer"
        >
          {profile?.image ? (
            <img src={profile.image} alt="" className="w-[35px] h-[35px] rounded-full object-cover" />
          ) : (
            <div className="w-[35px] h-[35px] rounded-full bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground">
              {initials}
            </div>
          )}
          <span className="text-xs text-[#767676] hidden lg:block">Profil</span>
        </button>
        {profileOpen && profile && (
          <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-lg border border-border p-4 z-50">
            <div className="flex items-center gap-3">
              {profile.image ? (
                <img src={profile.image} alt="" className="w-12 h-12 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-lg font-medium text-muted-foreground shrink-0">
                  {initials}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{profile.firstname} {profile.surname}</p>
                <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
                {profile.company && <p className="text-xs text-muted-foreground truncate mt-0.5">{profile.company}</p>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
