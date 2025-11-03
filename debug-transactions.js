// Temporary debug script - paste this in your browser console
console.log('=== TRANSACTION DEBUG ===');
console.log('Store state:', window.__ZUSTAND_STORES__ || 'Store not accessible');

// Check if we can access the transactions from the component
const checkTransactions = () => {
  // Try to find the transactions data in React DevTools
  const reactRoot = document.querySelector('#__next');
  console.log('React root found:', !!reactRoot);
};

checkTransactions();
