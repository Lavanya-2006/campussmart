const mongoose = require('mongoose');

const CATEGORIES = [
  'Classroom',
  'Wi-Fi',
  'Drinking Water',
  'Laboratory Equipment',
  'Washroom',
  'Hostel Maintenance',
  'Other'
];

const STATUSES = ['Pending', 'In Progress', 'Resolved'];
const PRIORITIES = ['Low', 'Medium', 'High'];

const complaintSchema = new mongoose.Schema(
  {
    complaintId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    studentName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    department: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    category: {
      type: String,
      required: true,
      enum: CATEGORIES
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 2000
    },
    priority: {
      type: String,
      required: true,
      enum: PRIORITIES,
      default: 'Medium'
    },
    status: {
      type: String,
      required: true,
      enum: STATUSES,
      default: 'Pending'
    }
  },
  { timestamps: true }
);

module.exports = {
  Complaint: mongoose.model('Complaint', complaintSchema),
  CATEGORIES,
  STATUSES,
  PRIORITIES
};
