import type React from 'react';
import { createContext, type ReactNode, useContext } from 'react';
import type { UIState } from '../App';

interface UIStateContextType {
  uiState: UIState;
  updateUIState: (updates: Partial<UIState>) => void;
}

const UIStateContext = createContext<UIStateContextType | undefined>(undefined);

export const useUIState = () => {
  const context = useContext(UIStateContext);
  if (context === undefined) {
    throw new Error('useUIState must be used within a UIStateProvider');
  }
  return context;
};

interface UIStateProviderProps {
  value: UIStateContextType;
  children: ReactNode;
}

export const UIStateProvider: React.FC<UIStateProviderProps> = ({ value, children }) => {
  return <UIStateContext.Provider value={value}>{children}</UIStateContext.Provider>;
};
