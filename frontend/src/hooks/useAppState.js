import { useState } from 'react';

/**
 * Central app state hook.
 * Used in App.jsx and passed as props – avoids Context file-naming conflicts.
 */
export function useAppState() {
  const [isLoggedIn, setIsLoggedIn]       = useState(false);
  const [activeTab, setActiveTab]         = useState('tongquan');
  const [selectedReply, setSelectedReply] = useState(null);

  const login  = () => setIsLoggedIn(true);
  const logout = () => { setIsLoggedIn(false); setActiveTab('tongquan'); };

  return {
    isLoggedIn, login, logout,
    activeTab, setActiveTab,
    selectedReply, setSelectedReply,
  };
}
