const getPageTitle = (pathname: string) => {
  const pathSegments = pathname.split('/').filter(Boolean);

  if (pathSegments.length === 0) return 'Dashboard';

  const routeMap: Record<string, string> = {
    inventory: 'Inventory',
    products: 'Products',
    categories: 'Categories',
    suppliers: 'Suppliers',
    adjustments: 'Adjustments',
    sales: 'Sales',
    pos: 'POS Terminal',
    transactions: 'Transactions',
    reports: 'Reports',
    settings: 'Settings',
  };

  for (let i = pathSegments.length - 1; i >= 0; i--) {
    const segment = pathSegments[i];
    if (routeMap[segment]) {
      return routeMap[segment];
    }
  }

  return 'Dashboard';
};
export default getPageTitle;
