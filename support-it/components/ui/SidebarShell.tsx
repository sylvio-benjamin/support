'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X, PanelLeftClose, PanelLeftOpen, LogOut } from 'lucide-react';
import { urlConnexion } from '../../lib/authRedirect';
import Avatar from '../Avatar';

export interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
  exact?: boolean;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

interface SidebarShellProps {
  brand: string;
  sections: NavSection[];
  user: { nom: string; prenom: string; roleLabel: string; photoprofil?: string } | null;
}

export default function SidebarShell({ brand, sections, user }: SidebarShellProps) {
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 900);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleLogout = () => {
    if (!window.confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) return;
    localStorage.removeItem('user');
    localStorage.removeItem('userType');
    localStorage.removeItem('userRole');
    window.location.href = urlConnexion(pathname);
  };

  const isActive = (item: NavItem) => (item.exact ? pathname === item.href : pathname.startsWith(item.href));
  const isCollapsed = !isMobile && collapsed;

  return (
    <>
      {isMobile && (
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="fixed top-4 left-4 z-[1001] w-11 h-11 rounded-full bg-white border border-slate-200 shadow-md flex items-center justify-center text-slate-700"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      )}

      {isMobile && mobileOpen && (
        <div className="fixed inset-0 bg-slate-900/40 z-[999]" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className="fixed left-0 top-0 h-screen z-[1000] flex flex-col bg-white border-r border-slate-200 transition-[width,transform] duration-200 ease-out overflow-x-hidden"
        style={{
          width: isMobile ? 264 : isCollapsed ? 76 : 248,
          transform: isMobile && !mobileOpen ? 'translateX(-100%)' : 'translateX(0)',
        }}
      >
        <div className="flex items-center h-16 px-4 border-b border-slate-200 shrink-0">
          <img src="/images/logo_lyo-removebg-preview.png" alt="LyovaTech" className="w-8 h-8 object-contain shrink-0" />
          {!isCollapsed && <span className="ml-2.5 font-semibold text-slate-900 truncate">{brand}</span>}
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-6">
          {sections.map((section) => (
            <div key={section.title}>
              {!isCollapsed && (
                <h3 className="px-2 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {section.title}
                </h3>
              )}
              <div className="flex flex-col gap-0.5">
                {section.items.map((item) => {
                  const active = isActive(item);
                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      title={isCollapsed ? item.label : undefined}
                      className={`relative flex items-center gap-3 px-2.5 h-10 rounded-md text-sm font-medium transition-colors ${
                        active ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      } ${isCollapsed ? 'justify-center' : ''}`}
                    >
                      <span className="relative shrink-0">
                        {item.icon}
                        {!!item.badge && (
                          <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                            {item.badge > 9 ? '9+' : item.badge}
                          </span>
                        )}
                      </span>
                      {!isCollapsed && <span className="truncate">{item.label}</span>}
                    </a>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-slate-200 p-3 shrink-0">
          {!isCollapsed && user && (
            <div className="flex items-center gap-2.5 px-1 py-2 mb-1">
              <Avatar photoUrl={user.photoprofil} nom={user.nom} prenom={user.prenom} size={32} />
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {user.prenom} {user.nom}
                </p>
                <p className="text-xs text-slate-500 truncate">{user.roleLabel}</p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className={`flex items-center gap-2 w-full h-9 rounded-md text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors ${
              isCollapsed ? 'justify-center' : 'px-2.5'
            }`}
          >
            <LogOut size={16} />
            {!isCollapsed && 'Se déconnecter'}
          </button>
        </div>

        {!isMobile && (
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="absolute top-[52px] right-2 w-6 h-6 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-500 hover:text-slate-700"
          >
            {isCollapsed ? <PanelLeftOpen size={13} /> : <PanelLeftClose size={13} />}
          </button>
        )}
      </aside>

      {/* Espaceur pour pousser le contenu à droite de la sidebar fixe */}
      {!isMobile && <div style={{ width: isCollapsed ? 76 : 248 }} className="shrink-0 transition-[width] duration-200" />}
    </>
  );
}
