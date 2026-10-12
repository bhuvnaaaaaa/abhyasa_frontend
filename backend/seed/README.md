# Database Seeding Guide

## Overview
The seed folder uses a modular structure for managing curriculum data:

```
seed/
├── seedDatabase.js    # Main seeding execution script
├── config.js          # Central configuration (imports all subjects)
├── README.md          # Documentation
└── data/              # Subject-specific curriculum files
    ├── Biology.js     # 12 Biology chapters
    ├── Chemistry.js   # 12 Chemistry chapters
    ├── Physics.js     # 12 Physics chapters
    └── Geography.js   # 12 Geography chapters
```

## Files

### 1. config.js
Main configuration file that imports all subject data and provides the seed structure:
- Imports Biology, Chemistry, Physics, Geography
- Defines board structure (CBSE)
- Defines grade structure (Grade 10)
- Cleanly organized for easy additions

### 2. Subject Data Files (data/Biology.js, Chemistry.js, Physics.js, Geography.js)
Each subject file contains:
- **12 Chapters** per subject
- **Chapters 1-3**: Full content with MCQ questions and detailed explanations
- **Chapters 4-12**: Placeholder structure ready for content
- **Table Structures**: Markdown tables in explanations where needed (using backticks in answers)

**Example Chapter Structure:**
```javascript
{
  number: 1,
  title: 'Chapter Title',
  description: 'Brief description',
  content: [
    {
      type: 'mcq',
      question: 'Question text?',
      options: ['A', 'B', 'C', 'D'],
      answer: 0,              // Index of correct answer
      reason: 'Explanation'   // Can include markdown tables
    }
  ]
}
```

### 3. seedDatabase.js
Main execution script that:
- Connects to MongoDB
- Clears old data
- Creates boards → grades → subjects → chapters in order
- Provides progress logs and summary

## Directory Structure Benefits

✅ **Modular**: Each subject in separate file (no merge conflicts)
✅ **Scalable**: Easy to add Grade 11, 12, or other boards
✅ **Maintainable**: Easy to find and edit specific chapters
✅ **Organized**: Clear hierarchy and naming conventions
✅ **Flexible**: Add tables and markdown formatting where needed

## Usage

### Prerequisites
- MongoDB running
- `.env` file with `MONGO_URI` configured
- All model files imported correctly

### Run the Seed Script
```bash
# From the backend root directory
node seed/seedDatabase.js
```

### Output Example
```
✅ MongoDB connected successfully

🧹 Clearing old data...
   ✓ Database cleared

📚 Creating Board: CBSE
   📖 Creating Grade: 10
      🔬 Creating Subject: Biology
         ✓ Created 12 chapters for Biology
      🔬 Creating Subject: Chemistry
         ✓ Created 12 chapters for Chemistry
      ...

============================================================
✅ SEEDING COMPLETE
============================================================
📊 Summary:
   • Boards created: 1
   • Grades created: 1
   • Subjects created: 4
   • Chapters created: 48 (12 per subject)
============================================================
```

## Content Structure

### Full Chapter (with content)
```javascript
{
  number: 1,
  title: 'Cell Structure and Functions',
  description: 'Basic structural unit of all living organisms',
  content: [
    {
      type: 'mcq',
      question: 'Who discovered the cell?',
      options: ['Gregor Mendel', 'Robert Hooke', 'Charles Darwin', 'Louis Pasteur'],
      answer: 1,
      reason: 'Robert Hooke discovered the cell in 1665...'
    },
    // ... more questions
  ]
}
```

### Placeholder Chapter (ready for content)
```javascript
{
  number: 4,
  title: 'Transportation in Plants and Animals',
  description: 'Placeholder - Content to be added',
  content: [
    {
      type: 'mcq',
      question: '[Placeholder] Question here?',
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      answer: 0,
      reason: '[This chapter content is under development. Full explanations will be added soon.]'
    }
  ]
}
```

## Table Structures in Answers

Some answers include markdown table structures for better presentation:

```javascript
reason: `Electrons arrange in shells following Aufbau principle:

| Electron | Maximum |
|----------|---------|
| 1st shell| 2       |
| 2nd shell| 8       |
| 3rd shell| 18      |

Therefore, Oxygen has configuration 2,6.`
```

These tables will render properly when displayed in your frontend.

## Adding Content

### Add Questions to Existing Chapter
Edit the subject file (e.g., `data/Biology.js`) and add to the `content` array:

```javascript
{
  number: 1,
  title: 'Cell Structure and Functions',
  description: '...',
  content: [
    // ... existing questions
    {
      type: 'mcq',
      question: 'New question?',
      options: ['A', 'B', 'C', 'D'],
      answer: 0,
      reason: 'Explanation here'
    }
  ]
}
```

### Replace Placeholder with Real Content
Find the placeholder chapter and update it completely:

```javascript
// From:
{
  number: 4,
  title: 'Transportation in Plants and Animals',
  description: 'Placeholder - Content to be added',
  content: [...]
}

// To:
{
  number: 4,
  title: 'Transportation in Plants and Animals',
  description: 'How materials move in organisms',
  content: [
    {
      type: 'mcq',
      question: 'How does xylem transport water?',
      options: [...],
      answer: 0,
      reason: '...'
    },
    // ... more questions
  ]
}
```

### Add a New Subject
1. Create new file in `data/` folder (e.g., `data/Mathematics.js`)
2. Export as default an array of 12 chapters
3. Import in `config.js`:
```javascript
import Mathematics from './data/Mathematics.js';
```
4. Add to subjects array in config:
```javascript
{
  name: 'Mathematics',
  chapters: Mathematics
}
```

### Add a New Grade
1. Create subject data files for new grade
2. Update `config.js` to add new grade object:
```javascript
{
  grade: 11,  // or 12
  subjects: [
    { name: 'Biology', chapters: Biology11 },
    { name: 'Chemistry', chapters: Chemistry11 },
    // ... etc
  ]
}
```

## Database Schema

- **Board**: has many Grades
- **Grade**: has many Subjects
- **Subject**: has many Chapters  
- **Chapter**: contains `content[]` array with MCQ objects

See models in `../models/` for the complete schema definitions.

## Notes

- ⚠️ The seed script clears the database before seeding (can be disabled)
- 📌 Video URLs are placeholders - update them as needed
- 🎯 All content is for CBSE Grade 10 (easily extendable to other boards/grades)
- 💾 Uses Mongoose for data validation and storage

## Troubleshooting

**Connection Error:**
- Check `.env` file exists with correct `MONGO_URI`
- Ensure MongoDB service is running

**Model Import Error:**
- Verify all model paths are correct
- Check model files exist in `../models/`

**Data Not Appearing:**
- Verify no errors in console output
- Check MongoDB directly with MongoDB Compass or mongo shell
- Ensure models are created before chapters reference them
