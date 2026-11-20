require('dotenv').config();

const mongoose = require('mongoose');
const crypto = require('crypto');
const { Complaint } = require('../models/Complaint');

const year = new Date().getFullYear();
const samples = [
  {
    studentName: 'Aarav Sharma',
    department: 'Computer Science',
    category: 'Wi-Fi',
    description: 'The Wi-Fi connection in the engineering block keeps disconnecting during lectures.',
    priority: 'High',
    status: 'In Progress'
  },
  {
    studentName: 'Maya Patel',
    department: 'Mechanical Engineering',
    category: 'Laboratory Equipment',
    description: 'The digital caliper in workshop lab 2 is not giving consistent readings.',
    priority: 'Medium',
    status: 'Pending'
  },
  {
    studentName: 'Rohan Das',
    department: 'Biotechnology',
    category: 'Drinking Water',
    description: 'The drinking water dispenser near the biology labs is empty and needs servicing.',
    priority: 'Low',
    status: 'Resolved'
  },
  {
    studentName: 'Ananya Rao',
    department: 'Civil Engineering',
    category: 'Classroom',
    description: 'The ceiling fan in room C-204 is making a loud noise and does not rotate properly.',
    priority: 'Medium',
    status: 'Pending'
  }
].map((sample) => ({
  ...sample,
  complaintId: `SC-${year}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`
}));

async function seed() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is missing. Copy .env.example to .env and configure it.');
  }
  await mongoose.connect(process.env.MONGODB_URI);
  if (await Complaint.exists()) {
    console.log('Complaints already exist; sample data was not added.');
    return;
  }
  await Complaint.insertMany(samples);
  console.log(`Added ${samples.length} sample complaints.`);
}

seed()
  .catch((error) => {
    console.error('Unable to seed sample complaints:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
