// This helper is deprecated - use session.user.pharmacyId instead
// All pharmacy data access should be session-based for security
export const getPharmacyId = async (): Promise<number> => {
  throw new Error(
    'Deprecated: Use session.user.pharmacyId for pharmacy access',
  );
};
