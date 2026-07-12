import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminEmail = process.env.SUPER_ADMIN_EMAIL;
  const adminPassword = process.env.SUPER_ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    throw new Error(
      'ERREUR: SUPER_ADMIN_EMAIL et SUPER_ADMIN_PASSWORD doivent être définis dans le fichier .env',
    );
  }

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existingAdmin) {
    console.log(`L'utilisateur admin existe déjà : ${existingAdmin.email}`);
    return;
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(adminPassword, salt);

  const admin = await prisma.user.create({
    data: {
      firstName: 'Super',
      lastName: 'Admin',
      email: adminEmail,
      phone: '0000000000',
      password: hashedPassword,
      role: Role.SUPER_ADMIN_SAAS,
      emailVerified: true,
      isActive: true,
    },
  });

  console.log(`Super Admin créé avec succès : ${admin.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
