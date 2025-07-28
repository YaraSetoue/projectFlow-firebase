
import { useContext } from 'react';
import { NetworkStatusContext } from '../contexts/NetworkStatusContext';

export const useNetworkStatus = () => {
  const context = useContext(NetworkStatusContext);
  if (context === undefined) {
    throw new Error('useNetworkStatus must be used within a NetworkStatusProvider');
  }
  return context;
};
