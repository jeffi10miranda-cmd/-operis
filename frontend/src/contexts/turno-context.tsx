'use client';

import { createContext, useContext, useState } from 'react';

export type TurnoValue = 'TODOS' | 'PRIMEIRO' | 'SEGUNDO' | 'TERCEIRO';

interface TurnoContextType {
  turnoAtual: TurnoValue;
  setTurnoAtual: (t: TurnoValue) => void;
}

const TurnoContext = createContext<TurnoContextType>({
  turnoAtual: 'TODOS',
  setTurnoAtual: () => {},
});

export function TurnoProvider({ children }: { children: React.ReactNode }) {
  const [turnoAtual, setTurnoAtual] = useState<TurnoValue>('TODOS');
  return (
    <TurnoContext.Provider value={{ turnoAtual, setTurnoAtual }}>
      {children}
    </TurnoContext.Provider>
  );
}

export function useTurno() {
  return useContext(TurnoContext);
}
