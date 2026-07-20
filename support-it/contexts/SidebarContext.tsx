'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface SidebarContextType {
  sidebarWidth: number;
  setSidebarWidth: (width: number) => void;
  sidebarHidden: boolean;
  setSidebarHidden: (hidden: boolean) => void;
  /** Largeur de la sidebar quand elle est dans l’état "collapsed" (repli). */
  collapsedWidth: number;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const collapsedWidth = 82;

  // largeur courante (peut être modifiée par le redimensionnement)
  const [sidebarWidth, setSidebarWidth] = useState(280);

  // masquée complètement (rétractée)
  const [sidebarHidden, setSidebarHidden] = useState(false);

  return (
    <SidebarContext.Provider
      value={{
        sidebarWidth,
        setSidebarWidth,
        sidebarHidden,
        setSidebarHidden,
        collapsedWidth,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}

