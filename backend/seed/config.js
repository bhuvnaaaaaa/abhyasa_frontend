/**
 * ABHYASA PLATFORM - SEED DATA CONFIGURATION
 * 
 * Main config file that imports all subject data
 */

import { Biology } from './data/Biology.js';
import { Chemistry } from './data/Chemistry.js';
import { Physics } from './data/Physics.js';
import { Geography } from './data/Geography.js';

export const seedConfig = {
  boards: [
    {
      name: 'CBSE',
      grades: [
        {
          grade: 10,
          subjects: [
            {
              name: 'Biology',
              chapters: Biology
            },
            {
              name: 'Chemistry',
              chapters: Chemistry
            },
            {
              name: 'Physics',
              chapters: Physics
            },
            {
              name: 'Geography',
              chapters: Geography
            }
          ]
        }
      ]
    }
  ]
};

export default seedConfig;
