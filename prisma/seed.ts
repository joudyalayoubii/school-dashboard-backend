import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Hash the password
  const hashedPassword = await bcrypt.hash('test', 10);

  // Create the user
  const user = await prisma.user.upsert({
    where: { username: 'joudy' },
    update: {},
    create: {
      username: 'joudy',
      name: 'Joudy Alayoubi',
      email: 'joudy.alayoubi@gmail.com',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
    },
  });

  console.log('User created:', user);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
