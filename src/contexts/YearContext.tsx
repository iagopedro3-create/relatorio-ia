import React, { createContext, useContext, useState } from 'react';
import { mockYears } from '../store/mockDb';
import type { SchoolYear } from '../store/mockDb';

interface YearContextType {
  selectedYear: SchoolYear;
  availableYears: SchoolYear[];
  setYear: (yearId: string) => void;
}

const YearContext = createContext<YearContextType | undefined>(undefined);

export function YearProvider({ children }: { children: React.ReactNode }) {
  const [availableYears] = useState<SchoolYear[]>(mockYears);
  const [selectedYear, setSelectedYear] = useState<SchoolYear>(
    mockYears.find(y => y.active) || mockYears[mockYears.length - 1]
  );

  const setYear = (yearId: string) => {
    const year = availableYears.find(y => y.id === yearId);
    if (year) setSelectedYear(year);
  };

  return (
    <YearContext.Provider value={{ selectedYear, availableYears, setYear }}>
      {children}
    </YearContext.Provider>
  );
}

export function useYear() {
  const context = useContext(YearContext);
  if (context === undefined) {
    throw new Error('useYear must be used within a YearProvider');
  }
  return context;
}
