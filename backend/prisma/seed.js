const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create sample users
  const teacherPassword = await bcrypt.hash('password123', 12);
  const studentPassword = await bcrypt.hash('password123', 12);

  const teacher = await prisma.user.upsert({
    where: { email: 'teacher@tutoriai.com' },
    update: {},
    create: {
      email: 'teacher@tutoriai.com',
      passwordHash: teacherPassword,
      firstName: 'John',
      lastName: 'Doe',
      role: 'teacher',
    },
  });

  const student = await prisma.user.upsert({
    where: { email: 'student@tutoriai.com' },
    update: {},
    create: {
      email: 'student@tutoriai.com',
      passwordHash: studentPassword,
      firstName: 'Jane',
      lastName: 'Smith',
      role: 'student',
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
  console.log('👨‍🏫 Sample Teacher: teacher@tutoriai.com (password: password123)');
  console.log('👨‍🎓 Sample Student: student@tutoriai.com (password: password123)');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });