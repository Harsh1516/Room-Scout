import bcrypt from 'bcryptjs';

const password = process.argv[2];

if (!password) {
  console.log('Usage: node scripts/hashAdminPassword.js <your_password>');
  console.log('Example: node scripts/hashAdminPassword.js "mySecurePass123"');
  process.exit(1);
}

const saltRounds = 10;
const hash = bcrypt.hashSync(password.trim(), saltRounds);

console.log('\n======================================================');
console.log('         ROOMSCOUT ADMIN PASSWORD HASHER             ');
console.log('======================================================');
console.log(`Original Password : ${password}`);
console.log(`Bcrypt Hash (10)  : ${hash}`);
console.log('------------------------------------------------------');
console.log('Copy and paste the line below into your backend/.env:');
console.log(`ADMIN_KEY=${hash}`);
console.log('======================================================\n');
