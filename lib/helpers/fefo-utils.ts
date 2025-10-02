// FEFO (First-Expired-First-Out) Utility Functions

export const getExpiryUrgency = (expiryDate: string) => {
  const now = new Date();
  const expiry = new Date(expiryDate);
  const daysUntilExpiry = Math.ceil(
    (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );

  // Industry-standard expiry thresholds for pharmacy operations
  if (daysUntilExpiry <= 30)
    return {
      level: 'expiring_soon',
      days: daysUntilExpiry,
      color: 'bg-red-400',
      textColor: 'text-red-700',
      borderColor: 'border-red-300', // Red = Expiring Soon (≤30 days) - Highest Priority
      badge: 'EXPIRING SOON',
      icon: '🔴',
    };
  if (daysUntilExpiry <= 90)
    return {
      level: 'moderately_close',
      days: daysUntilExpiry,
      color: 'bg-yellow-400',
      textColor: 'text-yellow-700',
      borderColor: 'border-yellow-300', // Yellow = Moderately Close (31-90 days) - Medium Priority
      badge: 'MODERATELY CLOSE',
      icon: '🟡',
    };
  return {
    level: 'safe_shelf_life',
    days: daysUntilExpiry,
    color: 'bg-green-400',
    textColor: 'text-green-700',
    borderColor: 'border-green-300', // Green = Safe Shelf Life (>90 days) - Lowest Priority
    badge: 'SAFE SHELF LIFE',
    icon: '🟢',
  };
};
