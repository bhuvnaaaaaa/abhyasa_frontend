// save as createAdmin.js and run `node createAdmin.js`
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import Admin from './models/adminModel.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const password = 'Anubhuva#28';
  const hash = await bcrypt.hash(password, 10);
  const a = await Admin.create({ email: 'bhuvanamallesh08@gmail.com', password: hash });
  console.log('Created admin:', a);
  process.exit();
}
run().catch(e => { console.error(e); process.exit(1); });