import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectToDatabase } from '../config/db';
import { User } from '../models/User';

function getArg(name: string) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

async function main() {
  const email = getArg('--email') ?? process.env.ADMIN_EMAIL;
  const password = getArg('--password') ?? process.env.ADMIN_PASSWORD;
  const name = getArg('--name') ?? process.env.ADMIN_NAME ?? 'Admin';

  if (!email || !password) {
    console.error(
      'Usage: npm run seed:admin -- --email admin@example.com --password StrongPass123 --name Admin',
    );
    process.exit(1);
  }

  await connectToDatabase();

  const existing = await User.findOne({ email });
  if (existing) {
    console.log('Admin already exists:', { id: String(existing._id), email: existing.email, role: existing.role });
    await mongoose.disconnect();
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, passwordHash, role: 'admin' });

  console.log('Created admin:', { id: String(user._id), email: user.email, role: user.role });

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

