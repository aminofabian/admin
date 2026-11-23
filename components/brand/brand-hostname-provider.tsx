'use client';

import { createContext, useContext, type ReactNode } from 'react';

const BrandHostnameContext = createContext('localhost');

export function BrandHostnameProvider({
  hostname,
  children,
}: {
  hostname: string;
  children: ReactNode;
}) {
  return (
    <BrandHostnameContext.Provider value={hostname}>
      {children}
    </BrandHostnameContext.Provider>
  );
}

export function useBrandHostname(): string {
  return useContext(BrandHostnameContext);
}
