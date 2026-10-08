export function loginDestination(role: string, redirect: unknown): string {
  const prefix = role === 'landlord' ? '/landlord/' : role === 'admin' ? '/admin/' : '/tenant/';
  if (typeof redirect === 'string' && redirect.startsWith(prefix) && !/[\\\r\n]/.test(redirect)) {
    const destination = new URL(redirect, 'https://rental.local');
    if (destination.pathname.startsWith(prefix)) return destination.pathname + destination.search + destination.hash;
  }
  return `${prefix}dashboard`;
}
