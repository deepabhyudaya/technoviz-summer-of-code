import { PrismaClient, UserSex } from "@prisma/client";

const prisma = new PrismaClient();
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
const PASSWORD = "GecX@Secure#2025!";

// ---- Helpers ----
function slugify(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
}

function genParentPhone(idx: number): string {
  // Ensure unique parent phones for required field
  return `+91${String(7000000000 + idx).padStart(10, "0")}`;
}

function randBirthday(age: number): Date {
  const now = new Date();
  return new Date(
    now.getFullYear() - age,
    Math.floor(Math.random() * 12),
    Math.floor(Math.random() * 28) + 1
  );
}

async function clerkCreateUser(opts: {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}): Promise<string | null> {
  if (!CLERK_SECRET_KEY) return null;
  try {
    const res = await fetch("https://api.clerk.com/v1/users", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CLERK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: opts.username,
        password: PASSWORD,
        first_name: opts.firstName,
        last_name: opts.lastName,
        email_address: [opts.email],
        public_metadata: { role: opts.role },
      }),
    });
    const body = await res.text();
    if (!res.ok) {
      if (res.status === 422 && body.toLowerCase().includes("already exists")) {
        console.log(`Clerk user ${opts.username} already exists, skipping.`);
        return null;
      }
      throw new Error(`Clerk API error ${res.status}: ${body}`);
    }
    const json = JSON.parse(body);
    console.log(`Created Clerk user: ${opts.username} (${json.id})`);
    return json.id as string;
  } catch (err: any) {
    console.error(`Failed to create Clerk user ${opts.username}:`, err.message);
    return null;
  }
}

// ---- Seed a class server (categories, channels, CR poll) ----
async function seedClassServer(classId: number, className: string) {
  const existing = await prisma.class.findUnique({
    where: { id: classId },
    select: { classServerId: true },
  });
  if (existing?.classServerId) return;

  const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();

  const server = await prisma.server.create({
    data: {
      name: `${className} Class`,
      description: `Official server for ${className}.`,
      inviteCode,
      createdById: "system",
      isDiscoverable: false,
      channelCategories: {
        create: [
          { name: "📢 General", order: 0 },
          { name: "📚 Academic", order: 1 },
          { name: "🏛️ Governance", order: 2 },
        ],
      },
    },
    include: { channelCategories: true },
  });

  const cats = server.channelCategories.sort((a, b) => a.order - b.order);
  const [generalCat, academicCat, govCat] = cats;

  await prisma.serverChannel.createMany({
    data: [
      { serverId: server.id, categoryId: generalCat.id, name: "general", order: 0 },
      { serverId: server.id, categoryId: generalCat.id, name: "announcements", order: 1 },
      { serverId: server.id, categoryId: academicCat.id, name: "homework-help", order: 0 },
      { serverId: server.id, categoryId: academicCat.id, name: "study-sessions", order: 1 },
      { serverId: server.id, categoryId: govCat.id, name: "cr-election", order: 0 },
      { serverId: server.id, categoryId: govCat.id, name: "class-council", order: 1 },
    ],
  });

  const crChannel = await prisma.serverChannel.findFirst({
    where: { serverId: server.id, name: "cr-election" },
  });

  let crPollId: number | null = null;
  if (crChannel) {
    const msg = await prisma.serverMessage.create({
      data: {
        content: "🗳️ Vote for Class Representative",
        channelId: crChannel.id,
        senderId: "system",
        senderUsername: "system",
        senderRole: "admin",
        messageType: "COMMAND",
        poll: {
          create: {
            question: "🗳️ Vote for Class Representative",
            options: { create: [] },
          },
        },
      },
      include: { poll: true },
    });
    crPollId = msg.poll?.id ?? null;
  }

  await prisma.class.update({
    where: { id: classId },
    data: { classServerId: server.id, crPollId },
  });

  console.log(`Created class server for ${className}`);
}

async function seedAddStudentToClassServer(
  studentId: string,
  classId: number,
  username: string,
  displayName: string
) {
  const classData = await prisma.class.findUnique({
    where: { id: classId },
    select: { classServerId: true, crPollId: true },
  });
  if (!classData?.classServerId) return;

  await prisma.serverMember.upsert({
    where: { serverId_userId: { serverId: classData.classServerId, userId: studentId } },
    update: {},
    create: {
      serverId: classData.classServerId,
      userId: studentId,
      role: "MEMBER",
      username,
      displayName,
    },
  });

  if (classData.crPollId) {
    const already = await prisma.pollOption.findFirst({
      where: { pollId: classData.crPollId, studentId },
    });
    if (!already) {
      await prisma.pollOption.create({
        data: {
          pollId: classData.crPollId,
          text: displayName,
          studentId,
        },
      });
    }
  }
}

// ---- Student data ----
interface StudentData {
  rollNumber: string;
  registrationNumber: string;
  collegeRollNumber: string;
  firstName: string;
  surname: string;
  fatherName: string;
  fatherSurname: string;
  sex: UserSex;
  phone: string | null;
  reservationCategory: string;
  branchKey: string;
  collegeKey: string;
}

const COLLEGES = [
  {
    key: "bokaro",
    name: "Government Engineering College Bokaro",
    shortName: "GEC Bokaro",
    collegeCode: "GECB",
    city: "Bokaro",
    state: "Jharkhand",
  },
  {
    key: "godda",
    name: "Government Engineering College Godda",
    shortName: "GEC Godda",
    collegeCode: "GECG",
    city: "Godda",
    state: "Jharkhand",
  },
];

const BRANCHES: Record<string, { name: string; code: string; department: string }> = {
  "bokaro-cse-aiml": {
    name: "Computer Science and Engineering (Artificial Intelligence and Machine Learning)",
    code: "CSE-AI/ML",
    department: "Computer Science & Engineering",
  },
  "bokaro-vlsi": {
    name: "Electronics Engineering (VLSI Design and Technology)",
    code: "ECE-VLSI",
    department: "Electronics & Communication Engineering",
  },
  "bokaro-met": {
    name: "Metallurgical and Materials Engineering",
    code: "MET",
    department: "Metallurgical and Materials Engineering",
  },
  "godda-ele": {
    name: "Electrical and Electronics Engineering",
    code: "EEE",
    department: "Electrical & Electronics Engineering",
  },
  "godda-mech-am": {
    name: "Mechanical and Mechatronics Engineering (Additive Manufacturing)",
    code: "MECH-AM",
    department: "Mechanical & Mechatronics Engineering",
  },
  "godda-min": {
    name: "Mining Engineering",
    code: "MIN",
    department: "Mining Engineering",
  },
};

const STUDENTS: StudentData[] = [
  // GEC Bokaro
  {
    rollNumber: "19",
    registrationNumber: "13018537",
    collegeRollNumber: "2501019",
    firstName: "Kshitiz",
    surname: "Bhashkar",
    fatherName: "Murari Prasad",
    fatherSurname: "Singh",
    sex: UserSex.MALE,
    phone: "+917209596648",
    reservationCategory: "UR",
    branchKey: "bokaro-cse-aiml",
    collegeKey: "bokaro",
  },
  {
    rollNumber: "1",
    registrationNumber: "13003370",
    collegeRollNumber: "2504001",
    firstName: "Abhyudaya Deep",
    surname: "Verma",
    fatherName: "Dipen Kumar",
    fatherSurname: "Verma",
    sex: UserSex.MALE,
    phone: "+918207747495",
    reservationCategory: "UR",
    branchKey: "bokaro-vlsi",
    collegeKey: "bokaro",
  },
  {
    rollNumber: "7",
    registrationNumber: "13015823",
    collegeRollNumber: "2504007",
    firstName: "Ankit Kumar",
    surname: "Sharma",
    fatherName: "Ajay",
    fatherSurname: "Sharma",
    sex: UserSex.MALE,
    phone: "+919693796200",
    reservationCategory: "UR",
    branchKey: "bokaro-vlsi",
    collegeKey: "bokaro",
  },
  {
    rollNumber: "62",
    registrationNumber: "13002589",
    collegeRollNumber: "2504062",
    firstName: "Udit",
    surname: "Kumar",
    fatherName: "Ravindra",
    fatherSurname: "Ram",
    sex: UserSex.MALE,
    phone: "+919631189514",
    reservationCategory: "SC",
    branchKey: "bokaro-vlsi",
    collegeKey: "bokaro",
  },
  {
    rollNumber: "43",
    registrationNumber: "13016839",
    collegeRollNumber: "2505043",
    firstName: "Rishi",
    surname: "Raj",
    fatherName: "Mithlesh Kumar",
    fatherSurname: "Sinha",
    sex: UserSex.MALE,
    phone: "+919304892162",
    reservationCategory: "UR",
    branchKey: "bokaro-met",
    collegeKey: "bokaro",
  },
  // GEC Godda
  {
    rollNumber: "13",
    registrationNumber: "13017196",
    collegeRollNumber: "2503013",
    firstName: "Anubhav",
    surname: "Kumar",
    fatherName: "Pankaj Kumar",
    fatherSurname: "Tewary",
    sex: UserSex.MALE,
    phone: null,
    reservationCategory: "UR",
    branchKey: "godda-ele",
    collegeKey: "godda",
  },
  {
    rollNumber: "17",
    registrationNumber: "13001019",
    collegeRollNumber: "2505017",
    firstName: "Kshitij",
    surname: "Jaiswal",
    fatherName: "Sanjay",
    fatherSurname: "Prasad",
    sex: UserSex.MALE,
    phone: null,
    reservationCategory: "BC-II",
    branchKey: "godda-mech-am",
    collegeKey: "godda",
  },
  {
    rollNumber: "53",
    registrationNumber: "13014030",
    collegeRollNumber: "2506053",
    firstName: "Samrat",
    surname: "Sandilya",
    fatherName: "Ratikant",
    fatherSurname: "Tiwari",
    sex: UserSex.MALE,
    phone: null,
    reservationCategory: "EWS",
    branchKey: "godda-min",
    collegeKey: "godda",
  },
];

async function main() {
  if (!CLERK_SECRET_KEY) {
    console.warn("WARNING: CLERK_SECRET_KEY is not set. Only Prisma records will be created; Clerk users will be skipped.");
  }

  // ---- Admins ----
  const adminCount = await prisma.admin.count();
  if (adminCount === 0) {
    await prisma.admin.createMany({
      data: [
        { id: "admin1", username: "admin1" },
        { id: "admin2", username: "admin2" },
      ],
      skipDuplicates: true,
    });
    console.log("Created admins");
  }

  // ---- Colleges ----
  const collegeMap: Record<string, string> = {};
  for (const col of COLLEGES) {
    const existing = await prisma.college.findUnique({ where: { name: col.name } });
    if (existing) {
      collegeMap[col.key] = existing.id;
      console.log(`College ${col.name} already exists`);
      continue;
    }
    const created = await prisma.college.create({
      data: {
        name: col.name,
        shortName: col.shortName,
        collegeCode: col.collegeCode,
        city: col.city,
        state: col.state,
        country: "India",
        isActive: true,
      },
    });
    collegeMap[col.key] = created.id;
    console.log(`Created college: ${col.name}`);
  }

  // ---- Grade (Year 1) ----
  let grade = await prisma.grade.findUnique({ where: { level: 1 } });
  if (!grade) {
    grade = await prisma.grade.create({ data: { level: 1 } });
    console.log("Created grade (year 1)");
  }

  // ---- Classes (Branches) ----
  const classMap: Record<string, number> = {};
  for (const [key, branch] of Object.entries(BRANCHES)) {
    const [collegeKey] = key.split("-", 2) as [string, string];
    // Adjust: key is like "bokaro-cse-aiml", we need college part
    // Actually the keys have variable dash counts, use the known college keys
    const matchedCollege = COLLEGES.find((c) => key.startsWith(c.key));
    const collegeId = matchedCollege ? collegeMap[matchedCollege.key] : null;

    const className = `${matchedCollege?.collegeCode}-${branch.code}-A`;
    let cls = await prisma.class.findUnique({ where: { name: className } });
    if (!cls) {
      cls = await prisma.class.create({
        data: {
          name: className,
          gradeId: grade.id,
          capacity: 60,
          branchCode: branch.code,
          department: branch.department,
          totalSemesters: 8,
          intakeCapacity: 60,
          collegeId,
        },
      });
      console.log(`Created class: ${className}`);
    } else {
      console.log(`Class ${className} already exists`);
    }
    classMap[key] = cls.id;
    await seedClassServer(cls.id, className);
  }

  // ---- Students & Parents ----
  for (let i = 0; i < STUDENTS.length; i++) {
    const s = STUDENTS[i];
    const classId = classMap[s.branchKey];
    const collegeId = collegeMap[s.collegeKey];

    const username = `s_${slugify(s.firstName)}_${slugify(s.surname)}`;
    const email = `${username}@gecx.edu.in`;

    // Check existing student
    const existingStudent = await prisma.student.findUnique({ where: { username } });
    if (existingStudent) {
      console.log(`Student ${username} already exists, skipping`);
      continue;
    }

    // Create Parent (father)
    const parentUsername = `p_${slugify(s.fatherName)}_${slugify(s.fatherSurname)}_${i}`;
    const parentEmail = `${parentUsername}@gecx.edu.in`;
    const parentPhone = s.phone ?? genParentPhone(i + 100);

    const clerkParentId = await clerkCreateUser({
      username: parentUsername,
      firstName: s.fatherName,
      lastName: s.fatherSurname,
      email: parentEmail,
      role: "parent",
    });
    const parentId = clerkParentId ?? `parent_fallback_${i}`;

    const parent = await prisma.parent.create({
      data: {
        id: parentId,
        username: parentUsername,
        name: s.fatherName,
        surname: s.fatherSurname,
        email: parentEmail,
        phone: parentPhone,
        address: `${s.collegeKey === "bokaro" ? "Bokaro" : "Godda"}, Jharkhand, India`,
      },
    });
    console.log(`Created parent: ${parentUsername}`);

    // Create Student
    const clerkStudentId = await clerkCreateUser({
      username,
      firstName: s.firstName,
      lastName: s.surname,
      email,
      role: "student",
    });
    const studentId = clerkStudentId ?? `student_fallback_${i}`;

    const student = await prisma.student.create({
      data: {
        id: studentId,
        username,
        name: s.firstName,
        surname: s.surname,
        email,
        phone: s.phone,
        address: `${s.collegeKey === "bokaro" ? "Bokaro" : "Godda"}, Jharkhand, India`,
        bloodType: "O+",
        sex: s.sex,
        birthday: randBirthday(18),
        parentId: parent.id,
        gradeId: grade.id,
        classId,
        rollNumber: s.rollNumber,
        registrationNumber: s.registrationNumber,
        collegeRollNumber: s.collegeRollNumber,
        reservationCategory: s.reservationCategory,
        admissionYear: 2025,
        currentSemester: 1,
        program: "B.Tech",
        batch: "2025-29",
        section: "A",
        hosteller: false,
        guardianName: `${s.fatherName} ${s.fatherSurname}`,
        guardianPhone: parentPhone,
        guardianRelation: "Father",
        collegeId,
      },
    });
    console.log(`Created student: ${username}`);

    // Add to class server / CR poll
    await seedAddStudentToClassServer(
      student.id,
      classId,
      student.username,
      `${student.name} ${student.surname}`
    );
  }

  // ---- Karma Settings ----
  const existingSettings = await prisma.karmaSettings.findFirst();
  if (!existingSettings) {
    await prisma.karmaSettings.create({
      data: {
        likeReceived: 2,
        commentCreated: 1,
        commentReceived: 1,
        postCreated: 2,
        repostReceived: 10,
        perfectAttendanceWeek: 5,
        attendancePerDay: 1,
        resultAbove95: 25,
        resultAbove90: 20,
        resultAbove85: 15,
        resultAbove80: 12,
        resultAbove70: 8,
        resultAbove60: 5,
        messageSent: 2,
        messageReactionReceived: 1,
        serverBumpReceived: 5,
        bestAnswerKarma: 100,
        helpfulAnswerKarma: 50,
        promisingAnswerKarma: 25,
      },
    });
    console.log("Default karma settings created.");
  }

  console.log("Seeding completed successfully.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
