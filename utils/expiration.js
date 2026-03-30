export const getDaysUntilExpiration = (expirationDate) => {
  const today = new Date();
  const exp = new Date(expirationDate);
  return Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
};
