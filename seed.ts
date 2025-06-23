// seed.ts
import {
  ApplicationStage,
  Company,
  ContactPerson,
  JobApplication,
  JobSearch,
  LinkType,
  PrismaClient,
  User,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

// Конфигурация генерации
const CONFIG = {
  USERS_COUNT: 5,
  MIN_SEARCHES_PER_USER: 2,
  MAX_SEARCHES_PER_USER: 3,
  MIN_APPLICATIONS_PER_SEARCH: 10,
  MAX_APPLICATIONS_PER_SEARCH: 30,
  COMPANIES_COUNT: 50, // Больше чем нужно, чтобы были повторные обращения
  DEFAULT_PASSWORD: 'Password123!', // Для удобства тестирования
};

// Предустановленные данные для большей реалистичности
const INDUSTRIES = [
  'Technology',
  'Finance',
  'Healthcare',
  'Education',
  'Retail',
  'Manufacturing',
  'Media',
  'Entertainment',
  'Logistics',
  'Consulting',
];

const POSITION_TITLES = [
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'UI/UX Designer',
  'Product Manager',
  'QA Engineer',
  'DevOps Engineer',
  'Data Scientist',
  'Machine Learning Engineer',
  'Project Manager',
  'Software Architect',
  'Systems Administrator',
  'Mobile Developer',
  'Technical Writer',
  'Scrum Master',
  'Database Administrator',
];

const JOB_LINKS_DOMAINS = [
  'linkedin.com/jobs',
  'indeed.com',
  'glassdoor.com',
  'monster.com',
  'dice.com',
  'zip-recruiter.com',
  'angel.co',
  'remoteok.io',
  'stackoverflow.com/jobs',
];

async function main() {
  console.log('🌱 Starting seed process...');

  // Сначала очистим таблицы
  await cleanDatabase();

  // Создаем пользователей сначала
  const users = await createUsers();
  console.log(`✅ Created ${users.length} users`);

  // Создаем компании для каждого пользователя
  const companies = await createCompanies(users);
  console.log(`✅ Created ${companies.length} companies`);

  // Создаем системные этапы (общие для всех)
  const defaultStages = await createDefaultStages();
  console.log(`✅ Created ${defaultStages.length} default application stages`);

  // Для каждого пользователя создаем персональные данные
  for (const user of users) {
    // Создаем настраиваемые этапы для пользователя
    const userStages = await createUserStages(user.id);
    console.log(
      `✅ Created ${userStages.length} stages for user ${user.email}`,
    );

    // Объединяем системные и пользовательские этапы
    const allStages = [...defaultStages, ...userStages];

    // Создаем поиски работы для пользователя
    const searchesCount = faker.number.int({
      min: CONFIG.MIN_SEARCHES_PER_USER,
      max: CONFIG.MAX_SEARCHES_PER_USER,
    });

    for (let i = 0; i < searchesCount; i++) {
      const jobSearch = await createJobSearch(user.id);
      console.log(
        `✅ Created job search "${jobSearch.title}" for user ${user.email}`,
      );

      // Создаем контактных лиц
      const contactPersons = await createContactPersons(20); // Создаем пул контактных лиц

      // Создаем заявки для этого поиска
      const applicationsCount = faker.number.int({
        min: CONFIG.MIN_APPLICATIONS_PER_SEARCH,
        max: CONFIG.MAX_APPLICATIONS_PER_SEARCH,
      });

      for (let j = 0; j < applicationsCount; j++) {
        // Выбираем случайную компанию
        const company = faker.helpers.arrayElement(companies);

        // Возможно, добавляем заметку о компании для пользователя
        if (faker.datatype.boolean(0.3)) {
          // 30% шанс
          await createCompanyNote(company.id, user.id);
        }

        // Создаем заявку
        const application = await createJobApplication(
          jobSearch.id,
          company.id,
          faker.helpers.arrayElement(allStages).id,
        );

        // Добавляем 0-3 контактных лица к заявке
        const contactsCount = faker.number.int({ min: 0, max: 3 });
        // Выбираем случайные контактные лица без повторений
        const selectedContactPersons = faker.helpers.arrayElements(
          contactPersons,
          contactsCount,
        );

        for (const contactPerson of selectedContactPersons) {
          await connectContactToApplication(application.id, contactPerson.id);

          // Иногда связываем контакт и с компанией тоже
          if (faker.datatype.boolean(0.7)) {
            // 70% шанс
            await connectContactToCompany(company.id, contactPerson.id);
          }
        }

        // Добавляем 0-5 комментариев к заявке
        const commentsCount = faker.number.int({ min: 0, max: 5 });
        for (let k = 0; k < commentsCount; k++) {
          await createComment(application.id, user.id);
        }

        // Иногда создаем события, связанные с заявкой
        if (faker.datatype.boolean(0.4)) {
          // 40% шанс
          const eventsCount = faker.number.int({ min: 1, max: 3 });
          for (let e = 0; e < eventsCount; e++) {
            await createEvent(
              user.id,
              application.id,
              faker.helpers.maybe(() => allStages[0].id, { probability: 0.3 }),
            );
          }
        }
      }
    }
  }

  console.log('✅ Seed process completed successfully!');
}

// Очистка базы данных перед наполнением
async function cleanDatabase() {
  console.log('🧹 Cleaning database...');

  // Порядок важен из-за внешних ключей
  await prisma.eventReminder.deleteMany();
  await prisma.event.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.jobApplicationContactPerson.deleteMany();
  await prisma.companyContactPerson.deleteMany();
  await prisma.contactPerson.deleteMany();
  await prisma.companyLink.deleteMany();
  await prisma.jobApplication.deleteMany();
  await prisma.applicationStage.deleteMany();
  await prisma.jobSearch.deleteMany();
  await prisma.token.deleteMany();
  await prisma.company.deleteMany();
  await prisma.user.deleteMany();

  console.log('✅ Database cleaned');
}

// Создание пользователей
async function createUsers(): Promise<User[]> {
  console.log('👤 Creating users...');
  const users: User[] = [];

  const hashedPassword = await bcrypt.hash(CONFIG.DEFAULT_PASSWORD, 10);

  for (let i = 0; i < CONFIG.USERS_COUNT; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();

    const user = await prisma.user.create({
      data: {
        email: faker.internet.email({ firstName, lastName }).toLowerCase(),
        password: hashedPassword,
        firstName,
        lastName,
      },
    });

    users.push(user);
  }

  return users;
}

// Создание компаний
async function createCompanies(users: User[]): Promise<Company[]> {
  console.log('🏢 Creating companies...');
  const companies: Company[] = [];

  for (let i = 0; i < CONFIG.COMPANIES_COUNT; i++) {
    // Добавляем уникальный суффикс к имени компании
    const companyName = `${faker.company.name()} ${faker.string.nanoid(5)}`;

    // Распределяем компании между пользователями
    const randomUser = faker.helpers.arrayElement(users);

    const company = await prisma.company.create({
      data: {
        name: companyName,
        website: faker.internet.url(),
        description: faker.company.catchPhrase(),
        userId: randomUser.id,
        // Создаем 1-3 ссылки для компании
        links: {
          create: Array.from(
            { length: faker.number.int({ min: 1, max: 3 }) },
            () => ({
              url: faker.internet.url(),
              title: faker.helpers.arrayElement([
                'Company website',
                'Career page',
                'About us',
                'LinkedIn profile',
              ]),
              type: faker.helpers.arrayElement(Object.values(LinkType)),
            }),
          ),
        },
      },
    });

    companies.push(company);
  }

  return companies;
}

// Создание поиска работы
async function createJobSearch(userId: string): Promise<JobSearch> {
  return prisma.jobSearch.create({
    data: {
      userId,
      title: faker.helpers.arrayElement([
        'Job Search 2025',
        `${faker.word.adjective()} Developer Positions`,
        `Search for ${faker.helpers.arrayElement(INDUSTRIES)} Jobs`,
        `${faker.helpers.arrayElement(['Spring', 'Summer', 'Fall', 'Winter'])} ${new Date().getFullYear()} Search`,
        `Job Search after ${faker.company.name()}`,
      ]),
      description: faker.helpers.maybe(() => faker.lorem.paragraph()),
    },
  });
}

// Создание системных этапов заявки
async function createDefaultStages(): Promise<ApplicationStage[]> {
  console.log('📋 Creating default application stages...');

  const defaultStages = [
    {
      name: 'CV Sended',
      description: 'Resume submitted to company',
      color: '#3498db',
      order: 1,
    },
    {
      name: 'Interview scheduled',
      description: 'Interview has been scheduled',
      color: '#f39c12',
      order: 2,
    },
    {
      name: 'Feedback awaited',
      description: 'Waiting for feedback after interview',
      color: '#9b59b6',
      order: 3,
    },
    // Final outcome stages
    {
      name: 'Offer',
      description: 'Received an offer',
      color: '#27ae60',
      order: 5,
    },
    {
      name: 'Rejected',
      description: 'Application rejected',
      color: '#c0392b',
      order: 99,
    },
  ];

  return Promise.all(
    defaultStages.map((stage) =>
      prisma.applicationStage.create({ data: stage }),
    ),
  );
}

// Создание пользовательских этапов заявки
async function createUserStages(userId: string): Promise<ApplicationStage[]> {
  const userStages = [
    {
      name: 'Technical Task',
      description: 'Working on technical assignment',
      color: '#1abc9c',
      order: 3,
      userId,
    },
    {
      name: 'Final Interview',
      description: 'Final interview with management',
      color: '#34495e',
      order: 4,
      userId,
    },
  ];

  return Promise.all(
    userStages.map((stage) => prisma.applicationStage.create({ data: stage })),
  );
}

// Создание контактных лиц
async function createContactPersons(count: number): Promise<ContactPerson[]> {
  console.log('👥 Creating contact persons...');

  const contactPersons: ContactPerson[] = [];

  for (let i = 0; i < count; i++) {
    const gender = faker.helpers.arrayElement(['male', 'female']);
    const firstName = faker.person.firstName(gender);
    const lastName = faker.person.lastName();

    // Создаем данные для socialLinks как JSON
    const socialLinksData: Record<string, string> = {};

    // Добавляем ссылки только если они действительно генерируются
    const linkedinUrl = faker.helpers.maybe(
      () =>
        `https://linkedin.com/in/${firstName.toLowerCase()}-${lastName.toLowerCase()}-${faker.number.int(999)}`,
    );
    if (linkedinUrl) socialLinksData.linkedin = linkedinUrl;

    const twitterUrl = faker.helpers.maybe(
      () =>
        `https://twitter.com/${firstName.toLowerCase()}${faker.number.int(999)}`,
    );
    if (twitterUrl) socialLinksData.twitter = twitterUrl;

    const telegramHandle = faker.helpers.maybe(
      () =>
        `@${firstName.toLowerCase()}${lastName.substring(0, 1).toLowerCase()}${faker.number.int(999)}`,
    );
    if (telegramHandle) socialLinksData.telegram = telegramHandle;

    const contactPerson = await prisma.contactPerson.create({
      data: {
        firstName,
        lastName,
        position: faker.helpers.arrayElement([
          'Recruiter',
          'HR Manager',
          'Talent Acquisition Specialist',
          'Hiring Manager',
          'Technical Recruiter',
          'CEO',
          'CTO',
          'Team Lead',
          'Department Manager',
        ]),
        email: faker.internet.email({ firstName, lastName }).toLowerCase(),
        phone: faker.helpers.maybe(() => faker.phone.number()),
        socialLinks:
          Object.keys(socialLinksData).length > 0 ? socialLinksData : undefined,
      },
    });

    contactPersons.push(contactPerson);
  }

  return contactPersons;
}

// Создание заявки на вакансию
async function createJobApplication(
  jobSearchId: string,
  companyId: string,
  currentStageId: string,
): Promise<JobApplication> {
  const positionTitle = faker.helpers.arrayElement(POSITION_TITLES);

  // Создаем 1-3 ссылки для вакансии
  const jobLinks = Array.from(
    { length: faker.number.int({ min: 1, max: 3 }) },
    () =>
      `https://${faker.helpers.arrayElement(JOB_LINKS_DOMAINS)}/job/${faker.number.int({ min: 100000, max: 999999 })}`,
  );

  // Дата подачи заявки (в пределах последних 6 месяцев)
  const applicationDate = faker.date.recent({ days: 180 });

  return prisma.jobApplication.create({
    data: {
      jobSearchId,
      companyId,
      positionTitle,
      jobDescription: `
# ${positionTitle}

## About the Role
${faker.lorem.paragraphs(3)}

## Requirements
${Array.from({ length: 5 }, () => `- ${faker.lorem.sentence()}`).join('\n')}

## Nice to Have
${Array.from({ length: 3 }, () => `- ${faker.lorem.sentence()}`).join('\n')}

## Benefits
${Array.from({ length: 4 }, () => `- ${faker.lorem.sentence()}`).join('\n')}
      `,
      jobLinks,
      applicationDate,
      currentStageId,
      customColor: faker.helpers.maybe(() => faker.color.rgb()),
    },
  });
}

// Подключение контактного лица к заявке
async function connectContactToApplication(
  applicationId: string,
  contactPersonId: string,
) {
  // Проверяем, существует ли уже такая связь
  const existingConnection = await prisma.jobApplicationContactPerson.findFirst(
    {
      where: {
        jobApplicationId: applicationId,
        contactPersonId,
      },
    },
  );

  if (!existingConnection) {
    return prisma.jobApplicationContactPerson.create({
      data: {
        jobApplicationId: applicationId,
        contactPersonId,
        notes: faker.helpers.maybe(() => faker.lorem.sentence()),
      },
    });
  }
}

// Подключение контактного лица к компании
async function connectContactToCompany(
  companyId: string,
  contactPersonId: string,
) {
  // Проверяем, существует ли уже такая связь
  const existingConnection = await prisma.companyContactPerson.findFirst({
    where: {
      companyId,
      contactPersonId,
    },
  });

  if (!existingConnection) {
    return prisma.companyContactPerson.create({
      data: {
        companyId,
        contactPersonId,
        notes: faker.helpers.maybe(() => faker.lorem.sentence()),
      },
    });
  }
}

// Создание комментария к заявке
async function createComment(jobApplicationId: string, userId: string) {
  return prisma.comment.create({
    data: {
      jobApplicationId,
      userId,
      content: faker.helpers.arrayElement([
        faker.lorem.paragraph(),
        `Had an interview on ${faker.date.recent({ days: 30 }).toLocaleDateString()}. ${faker.lorem.sentence()}`,
        `Recruiter said: "${faker.lorem.sentence()}"`,
        `Need to prepare for technical interview on ${faker.date.soon({ days: 14 }).toLocaleDateString()}`,
        `Expected salary range: ${faker.number.int({ min: 70, max: 150 })}k-${faker.number.int({ min: 90, max: 180 })}k`,
        `Follow up sent on ${faker.date.recent({ days: 7 }).toLocaleDateString()}`,
        `Red flags: ${faker.lorem.sentence()}`,
      ]),
    },
  });
}

// Создание заметки о компании
async function createCompanyNote(companyId: string, userId: string) {
  // Get the existing company
  const existingCompany = await prisma.company.findFirst({
    where: {
      id: companyId,
      userId,
    },
  });

  // If company doesn't exist or already has a note, skip
  if (!existingCompany || existingCompany.companyNote) {
    return existingCompany;
  }

  const isBlacklisted = faker.datatype.boolean(0.2); // 20% шанс
  const isFavorite = !isBlacklisted && faker.datatype.boolean(0.3); // 30% шанс, если не в черном списке

  const companyNote = faker.helpers.arrayElement([
    faker.lorem.paragraph(),
    isBlacklisted
      ? `Avoid this company because: ${faker.lorem.sentence()}`
      : `Good company because: ${faker.lorem.sentence()}`,
    `Company culture: ${faker.lorem.sentence()}`,
    `Known for: ${faker.lorem.sentence()}`,
    `Glassdoor rating: ${faker.number.float({ min: 1, max: 5, fractionDigits: 1 })}/5`,
  ]);

  // Update company with flags and note
  return prisma.company.update({
    where: { id: companyId },
    data: {
      isBlacklisted,
      isFavorite,
      companyNote,
    },
  });
}

// Создание событий
async function createEvent(
  userId: string,
  jobApplicationId: string,
  applicationStageId: string | null = null,
) {
  // Вычисляем даты вместо использования строковых форматов
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);

  const thirtyDaysLater = new Date(today);
  thirtyDaysLater.setDate(today.getDate() + 30);

  // Определяем дату события (в диапазоне от 7 дней назад до 30 дней вперед)
  const startTime = faker.date.between({
    from: sevenDaysAgo,
    to: thirtyDaysLater,
  });

  // 30% событий будут иметь конечное время
  const hasEndTime = faker.datatype.boolean(0.3);
  // Используем undefined вместо null для endTime
  let endTime: Date | undefined = undefined;

  if (hasEndTime) {
    // Конечное время от 30 минут до 3 часов после начала
    endTime = new Date(
      startTime.getTime() + faker.number.int({ min: 30, max: 180 }) * 60000,
    );
  }

  // Создаем событие
  const event = await prisma.event.create({
    data: {
      userId,
      jobApplicationId,
      applicationStageId,
      title: faker.helpers.arrayElement([
        'Interview',
        'Technical Interview',
        'HR Screening',
        'Follow-up Call',
        'Test Assignment Deadline',
        'Meeting with Team',
        'Feedback Discussion',
        'Offer Negotiation',
      ]),
      description: faker.helpers.maybe(() => faker.lorem.sentence(), {
        probability: 0.7,
      }),
      startTime,
      endTime,
      location: faker.helpers.maybe(() =>
        faker.helpers.arrayElement([
          faker.location.streetAddress(),
          'Google Meet',
          'Zoom Call',
          'Microsoft Teams',
          'Skype',
          'Phone Call',
        ]),
      ),
      isAllDay: faker.datatype.boolean(0.2), // 20% шанс на событие на весь день
      color: faker.helpers.maybe(() => faker.color.rgb()),
      recurringPattern: faker.helpers.maybe(
        () =>
          faker.helpers.arrayElement([
            'RRULE:FREQ=WEEKLY;COUNT=4;BYDAY=MO',
            'RRULE:FREQ=DAILY;COUNT=5',
            'RRULE:FREQ=WEEKLY;UNTIL=20251231T000000Z;BYDAY=WE',
          ]),
        { probability: 0.1 },
      ), // 10% шанс на повторяющееся событие
    },
  });

  // Добавляем напоминания (от 0 до 2)
  const remindersCount = faker.number.int({ min: 0, max: 2 });

  if (remindersCount > 0) {
    for (let i = 0; i < remindersCount; i++) {
      await prisma.eventReminder.create({
        data: {
          eventId: event.id,
          timeBeforeEvent: faker.helpers.arrayElement([15, 30, 60, 120, 1440]), // минуты (15 мин, 30 мин, 1 час, 2 часа, 1 день)
          notificationType: faker.helpers.arrayElement([
            'EMAIL',
            'PUSH',
            'BROWSER',
          ]),
        },
      });
    }
  }

  return event;
}

// Запускаем функцию наполнения данными
main()
  .catch((e) => {
    console.error('Error during seed process:', e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect().catch((e) => {
      console.error('Error during disconnect:', e);
    });
  });
