function resolveIdentity(config, lineUserId, users) {
  if (config.ownerLineUserId === lineUserId) return { role: 'landlord', tenantId: '' };
  const tenant = users.find(user => user.role === 'tenant' && user.landlordId === config.landlordId);
  return tenant ? { role: 'tenant', tenantId: tenant.id, name: tenant.name } : { role: 'unbound', tenantId: '' };
}

function bindingMatches(config, binding, user) {
  if (binding.type === 'landlord') return binding.uid === config.landlordId;
  return user?.role === 'tenant' && user.landlordId === config.landlordId;
}

module.exports = { resolveIdentity, bindingMatches };
