const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  const teacher = await prisma.user.upsert({
    where: { email: 'teacher@tutoriai.com' },
    update: {},
    create: {
      email: 'teacher@tutoriai.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'teacher',
      verified: true,
    },
  });

  const student = await prisma.user.upsert({
    where: { email: 'student@tutoriai.com' },
    update: {},
    create: {
      email: 'student@tutoriai.com',
      firstName: 'Jane',
      lastName: 'Smith',
      role: 'student',
      verified: true,
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@tutoriai.com' },
    update: {},
    create: {
      email: 'admin@tutoriai.com',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      verified: true,
    },
  });

  // Create sample class
  const sampleClass = await prisma.class.create({
    data: {
      name: 'Introduction to Computer Science',
      description: 'Learn the basics of programming and computer science',
      iconName: 'book',
      iconColor: '#3B82F6',
      teacherId: teacher.id,
    },
  });

  // Enroll student in class
  await prisma.classEnrollment.create({
    data: {
      classId: sampleClass.id,
      studentId: student.id,
    },
  });

  console.log('✅ Database seeded successfully!');
  console.log('👨‍🏫 Sample Teacher: teacher@tutoriai.com');
  console.log('👨‍🎓 Sample Student: student@tutoriai.com');
  console.log('ℹ️  Create matching accounts and passwords in Supabase Auth to sign in.');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });