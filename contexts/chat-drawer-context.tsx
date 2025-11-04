'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface ChatDrawerContextType {
  isOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
}

const ChatDrawerContext = createContext<ChatDrawerContextType | undefined>(undefined);

export function ChatDrawerProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openDrawer = () => setIsOpen(true);
  const closeDrawer = () => setIsOpen(false);
  const toggleDrawer = () => setIsOpen(prev => !prev);

  return (
    <ChatDrawerContext.Provider value={{ isOpen, openDrawer, closeDrawer, toggleDrawer }}>
      {children}
    </ChatDrawerContext.Provider>
  );
}

export function useChatDrawer() {
  const context = useContext(ChatDrawerContext);
  if (!context) {
    throw new Error('useChatDrawer must be used within ChatDrawerProvider');
  }
  return context;
}

