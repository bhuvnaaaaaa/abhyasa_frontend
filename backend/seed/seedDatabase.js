/**
 * ABHYASA PLATFORM - DATABASE SEEDING SCRIPT
 * 
 * This script seeds the database with curriculum data from dataConfig.js
 * Run with: node seed/seedDatabase.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import seedConfig from './config.js';

// Import Models
import Board from '../models/boardModel.js';
import Grade from '../models/gradeModel.js';
import Subject from '../models/subjectModel.js';
import Chapter from '../models/chapterModel.js';

// Load environment variables
dotenv.config({ path: '.env' });

// ============================================
// DATABASE CONNECTION
// ============================================
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected successfully\n');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

// ============================================
// CLEAR ALL DATA (OPTIONAL - Comment out if you want to preserve data)
// ============================================
const clearDatabase = async () => {
  try {
    console.log('🧹 Clearing old data...');
    await Board.deleteMany({});
    await Grade.deleteMany({});
    await Subject.deleteMany({});
    await Chapter.deleteMany({});
    console.log('   ✓ Database cleared\n');
  } catch (error) {
    console.error('❌ Error clearing database:', error.message);
    process.exit(1);
  }
};

// ============================================
// MAIN SEEDING FUNCTION
// ============================================
const seedDatabase = async () => {
  try {
    await connectDB();
    await clearDatabase();

    let boardCount = 0;
    let gradeCount = 0;
    let subjectCount = 0;
    let chapterCount = 0;

    // .boards = [CBSE, STATE_BOARD, etc.]
    for (const boardData of seedConfig.boards) {
      console.log(`📚 Creating Board: ${boardData.name}`);
      const board = await Board.create({ name: boardData.name });
      boardCount++;

      // boardData.grades = [10, 11, 12, etc.]
      for (const gradeData of boardData.grades) {
        console.log(`   📖 Creating Grade: ${gradeData.grade}`);
        const grade = await Grade.create({
          grade: gradeData.grade,
          board: board._id
        });
        gradeCount++;

        // gradeData.subjects = [Biology, Chemistry, Physics, Geography]
        for (const subjectData of gradeData.subjects) {
          console.log(`      🔬 Creating Subject: ${subjectData.name}`);
          const subject = await Subject.create({
            name: subjectData.name,
            board: board._id,
            grade: gradeData.grade
          });
          subjectCount++;

          // Create chapters for this subject
          const chapterPromises = [];
          for (const chapterData of subjectData.chapters) {
            chapterPromises.push(
              Chapter.create({
                number: chapterData.number,
                title: chapterData.title,
                description: chapterData.description,
                content: chapterData.content,
                subject: subject._id,
                videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' // Placeholder URL
              })
            );
          }

          await Promise.all(chapterPromises);
          chapterCount += subjectData.chapters.length;

          console.log(
            `         ✓ Created ${subjectData.chapters.length} chapters for ${subjectData.name}`
          );
        }
      }
    }

    // ============================================
    // SUCCESS SUMMARY
    // ============================================
    console.log('\n' + '='.repeat(60));
    console.log('✅ SEEDING COMPLETE');
    console.log('='.repeat(60));
    console.log(`📊 Summary:`);
    console.log(`   • Boards created: ${boardCount}`);
    console.log(`   • Grades created: ${gradeCount}`);
    console.log(`   • Subjects created: ${subjectCount}`);
    console.log(`   • Chapters created: ${chapterCount}`);
    console.log('='.repeat(60) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

// Run the seeding script
seedDatabase();
