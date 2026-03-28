import 'dotenv/config';
import { PrismaClient, UserType } from '@prisma/client';
import { genSaltSync, hashSync } from 'bcrypt-ts';

const prisma = new PrismaClient();

function generateHashedPassword(password: string) {
  const salt = genSaltSync(10);
  return hashSync(password, salt);
}

async function syncRole(envEmails: string | undefined, envPasswords: string | undefined, type: UserType) {
  const emails = (envEmails ?? '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
  const passwords = (envPasswords ?? '').split(',').map(p => p.trim());

  for (let i = 0; i < emails.length; i++) {
    const email = emails[i];
    const password = passwords[i];
    if (!password) {
      console.warn(`Password not found for privileged user: ${email}. Skipping sync.`);
      continue;
    }
    const hashed = generateHashedPassword(password);
    await prisma.user.upsert({
      where: { email },
      update: { password: hashed, type },
      create: { email, password: hashed, type },
    });
    console.log(`Upserted ${email} as ${type}`);
  }
}

(async () => {
  try {
    await syncRole(process.env.ARCHITECT_EMAILS, process.env.ARCHITECT_PASSWORDS, UserType.architect);
    await syncRole(process.env.ADMIN_EMAILS, process.env.ADMIN_PASSWORDS, UserType.admin);
    await syncRole(process.env.EDITOR_EMAILS, process.env.EDITOR_PASSWORDS, UserType.editor);
    console.log('Done');
    await prisma.$disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error', err);
    await prisma.$disconnect();
    process.exit(1);
  }
})();
