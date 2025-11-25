// src/lib/wallet.js
// Safe wallet utility functions that handle window.ethereum safely

export function isWalletAvailable() {
  if (typeof window === 'undefined') return false;
  return typeof window.ethereum !== 'undefined';
}

export function getWalletAddress() {
  if (!isWalletAvailable()) return null;
  try {
    return window.ethereum?.selectedAddress || null;
  } catch (error) {
    console.warn('Error accessing wallet address:', error);
    return null;
  }
}

export async function connectWallet() {
  if (!isWalletAvailable()) {
    throw new Error('No wallet detected. Please install MetaMask or another Web3 wallet.');
  }
  
  try {
    const accounts = await window.ethereum.request({ 
      method: 'eth_requestAccounts' 
    });
    return accounts[0] || null;
  } catch (error) {
    console.error('Error connecting wallet:', error);
    throw error;
  }
}

export function onWalletAccountChange(callback) {
  if (!isWalletAvailable()) return () => {};
  
  const handleAccountsChanged = (accounts) => {
    callback(accounts[0] || null);
  };
  
  try {
    window.ethereum.on('accountsChanged', handleAccountsChanged);
    
    // Return cleanup function
    return () => {
      if (window.ethereum?.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      }
    };
  } catch (error) {
    console.warn('Error setting up wallet listeners:', error);
    return () => {};
  }
}

export function isMobileDevice() {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    window.navigator.userAgent
  );
}

export function isWalletMobile() {
  return isMobileDevice() && !isWalletAvailable();
}

export function getWalletDeepLink() {
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
  return `https://metamask.app.link/dapp/${currentUrl}`;
}