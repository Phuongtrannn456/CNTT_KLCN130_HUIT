require("dotenv").config();
const connectDB = require("./config/db");
const Topic = require("./models/Topic");

async function seedCN1() {
  await connectDB();
  if (await Topic.countDocuments() === 0) {
    await Topic.insertMany([
      {
        title: "Hệ thống quản lý học tập thông minh",
        description: "Xây dựng hệ thống hỗ trợ quản lý và theo dõi hoạt động học tập.",
        requirements: "React, Node.js, MongoDB",
        maxStudents: 3,
        registrationDeadline: new Date(Date.now() + 14 * 86400000),
        status: "PUBLISHED",
        teacherId: "GV001"
      },
      {
        title: "Ứng dụng AI hỗ trợ giáo dục",
        description: "Nghiên cứu ứng dụng AI trong gợi ý và phản hồi học tập.",
        requirements: "Python/AI, API, Web",
        maxStudents: 2,
        registrationDeadline: new Date(Date.now() + 21 * 86400000),
        status: "DRAFT",
        teacherId: "GV001"
      }
    ]);
    console.log("Seeded 2 demo topics for CN1");
  } else {
    console.log("Topic collection already has data; seed skipped");
  }
  process.exit(0);
}

seedCN1();
