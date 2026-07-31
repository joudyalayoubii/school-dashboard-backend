import { PrismaClient, Lesson, LessonStatus, QuestionType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const STUDENTS = [
  { username: 'mina01', name: 'Mina El-Sayed', email: 'mina@northview.test' },
  { username: 'sara22', name: 'Sara Hamdy', email: 'sara@northview.test' },
  { username: 'omar77', name: 'Omar Nabil', email: 'omar@northview.test' },
  { username: 'laila10', name: 'Laila Farid', email: 'laila@northview.test' },
  { username: 'ahmed33', name: 'Ahmed Hassan', email: 'ahmed@northview.test' },
  { username: 'nour15', name: 'Nour Ahmed', email: 'nour@northview.test' },
];

const QUIZ_LESSONS: Lesson[] = ['LESSON_1', 'LESSON_2', 'LESSON_3', 'LESSON_4', 'LESSON_5'];

const QUESTION_BANK = [
  { questionText: 'What is 2 + 2?', options: { A: '3', B: '4', C: '5', D: '6' }, correctAnswer: 'B' },
  { questionText: 'The sky is typically what color on a clear day?', options: { A: 'Green', B: 'Red', C: 'Blue', D: 'Purple' }, correctAnswer: 'C' },
  { questionText: 'Water boils at 100°C at sea level.', questionType: QuestionType.TRUE_FALSE, options: { A: 'True', B: 'False' }, correctAnswer: 'A' },
  { questionText: 'What is the capital of Egypt?', options: { A: 'Alexandria', B: 'Cairo', C: 'Giza', D: 'Luxor' }, correctAnswer: 'B' },
];

async function main() {
  const hashedPassword = await bcrypt.hash('test', 10);

  const superAdmin = await prisma.user.upsert({
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
  console.log('Super admin ready:', superAdmin.username);

  const school = await prisma.school.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Northview School',
    },
  });
  console.log('School ready:', school.name);

  const schoolAdminPassword = await bcrypt.hash('admin123', 10);
  const schoolAdmin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      name: 'Ava Thompson',
      email: 'admin@northview.test',
      password: schoolAdminPassword,
      role: 'SCHOOL_ADMIN',
      schoolId: school.id,
    },
  });
  console.log('School admin ready:', schoolAdmin.username);

  // Students
  const studentPassword = await bcrypt.hash('student123', 10);
  const students: Awaited<ReturnType<typeof prisma.user.upsert>>[] = [];
  for (const s of STUDENTS) {
    const student = await prisma.user.upsert({
      where: { username: s.username },
      update: {},
      create: {
        username: s.username,
        name: s.name,
        email: s.email,
        password: studentPassword,
        role: 'STUDENT',
        schoolId: school.id,
      },
    });
    students.push(student);
  }
  console.log(`${students.length} students ready`);

  // Quizzes + questions for the first 5 lessons
  const quizzes: Record<string, { id: string; lessonName: Lesson }> = {};
  for (const lessonName of QUIZ_LESSONS) {
    const quiz = await prisma.quiz.upsert({
      where: { lessonName_schoolId: { lessonName, schoolId: school.id } },
      update: {},
      create: { lessonName, schoolId: school.id },
    });
    quizzes[lessonName] = quiz;

    const existingQuestions = await prisma.question.count({ where: { quizId: quiz.id } });
    if (existingQuestions === 0) {
      await prisma.question.createMany({
        data: QUESTION_BANK.map((q) => ({
          questionText: q.questionText,
          questionType: q.questionType ?? QuestionType.MCQ,
          options: q.options,
          correctAnswer: q.correctAnswer,
          quizId: quiz.id,
        })),
      });
    }
  }
  console.log(`Quizzes + questions ready for ${QUIZ_LESSONS.join(', ')}`);

  // Submissions: each student has a real score on each of the first 3 lessons
  const scoreTable: Record<string, number[]> = {
    mina01: [80, 100, 75],
    sara22: [60, 80, 70],
    omar77: [100, 90, 95],
    laila10: [50, 70, 65],
    ahmed33: [90, 85, 80],
    nour15: [100, 95, 90],
  };

  for (const student of students) {
    const scores = scoreTable[student.username] ?? [70, 70, 70];
    for (let i = 0; i < 3; i++) {
      const lessonName = QUIZ_LESSONS[i];
      const quiz = quizzes[lessonName];
      await prisma.submission.upsert({
        where: { studentId_quizId: { studentId: student.id, quizId: quiz.id } },
        update: { score: scores[i] },
        create: {
          score: scores[i],
          lessonName,
          studentId: student.id,
          quizId: quiz.id,
        },
      });
    }
  }
  console.log('Submissions ready (first 3 lessons for every student)');

  // Lesson control: give the school a realistic in-progress state across all 15 lessons
  const allLessons = Object.values(Lesson);
  for (const lessonName of allLessons) {
    let status: LessonStatus = LessonStatus.LOCKED;
    let activeQuizId: string | undefined;
    let examStartedAt: Date | null = null;

    if (lessonName === 'LESSON_1' || lessonName === 'LESSON_2') {
      status = LessonStatus.LESSON_OPEN;
    } else if (lessonName === 'LESSON_3') {
      status = LessonStatus.QUIZ_OPEN;
      activeQuizId = quizzes['LESSON_3'].id;
      examStartedAt = new Date();
    }

    await prisma.lessonControl.upsert({
      where: { lessonName_schoolId: { lessonName, schoolId: school.id } },
      update: { status, activeQuizId, examStartedAt },
      create: { lessonName, status, activeQuizId, examStartedAt, schoolId: school.id },
    });
  }
  console.log('Lesson controls ready for all 15 lessons');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
