// Test script to verify BigInt role permissions work
const { ROLE_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } = require('./src/actions/role.actions.ts');

console.log('Testing BigInt role permissions...');
console.log('ROLE_PERMISSIONS:', ROLE_PERMISSIONS);
console.log('DEFAULT_ROLE_PERMISSIONS.ADMIN:', DEFAULT_ROLE_PERMISSIONS.ADMIN);

// Test the reduce function that was causing issues
try {
  const adminPerms = Object.values(ROLE_PERMISSIONS).reduce((a, b) => a | b, 0n);
  console.log('✓ ADMIN permissions calculated successfully:', adminPerms.toString());
} catch (error) {
  console.error('✗ Error calculating ADMIN permissions:', error.message);
}
