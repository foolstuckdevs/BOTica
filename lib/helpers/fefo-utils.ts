// FEFO (First-Expired-First-Out) Utility Functions

export const getExpiryUrgency = (expiryDate: string) => {
  const now = new Date();
  const expiry = new Date(expiryDate);
  const daysUntilExpiry = Math.ceil(
    (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );

  // Industry-standard pharmacy expiry thresholds
  if (daysUntilExpiry <= 30)
    return {
      level: 'expiring_soon',
      days: daysUntilExpiry,
      color: 'bg-red-400',
      textColor: 'text-red-700',
      borderColor: 'border-red-300', // Red = Expiring Soon (≤ 1 month)
      badge: 'EXPIRING SOON',
      icon: '🔴',
    };
  if (daysUntilExpiry <= 90)
    return {
      level: 'warning',
      days: daysUntilExpiry,
      color: 'bg-yellow-400',
      textColor: 'text-yellow-700',
      borderColor: 'border-yellow-300', // Yellow = Warning (≤ 3 months)
      badge: 'WARNING',
      icon: '🟡',
    };
  return {
    level: 'safe',
    days: daysUntilExpiry,
    color: 'bg-green-400',
    textColor: 'text-green-700',
    borderColor: 'border-green-300', // Green = Safe (> 3 months)
    badge: 'SAFE',
    icon: '🟢',
  };
};
