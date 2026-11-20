require('dotenv').config();

const path = require('path');
const crypto = require('crypto');
const express = require('express');
const mongoose = require('mongoose');
const { Complaint, CATEGORIES, STATUSES, PRIORITIES } = require('./models/Complaint');

const app = express();
const port = Number(process.env.PORT) || 3000;
const publicDirectory = path.join(__dirname, 'public');

app.disable('x-powered-by');
app.use(express.json({ limit: '20kb' }));
app.use(express.static(publicDirectory));

async function connectToDatabase() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not configured.');
  }
  if (mongoose.connection.readyState === 1) return;
  if (!global.mongooseConnectionPromise) {
    global.mongooseConnectionPromise = mongoose.connect(process.env.MONGODB_URI).catch((error) => {
      global.mongooseConnectionPromise = null;
      throw error;
    });
  }
  await global.mongooseConnectionPromise;
}

function createComplaintId() {
  const date = new Date();
  const year = date.getFullYear();
  const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `SC-${year}-${suffix}`;
}

function sendError(res, status, message) {
  return res.status(status).json({ error: message });
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});

app.get('/api/complaints/stats', async (req, res, next) => {
  try {
    const [total, byStatus] = await Promise.all([
      Complaint.countDocuments(),
      Complaint.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }])
    ]);
    const counts = Object.fromEntries(byStatus.map((item) => [item._id, item.count]));
    res.json({
      total,
      pending: counts.Pending || 0,
      inProgress: counts['In Progress'] || 0,
      resolved: counts.Resolved || 0
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/complaints', async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.category) {
      if (!CATEGORIES.includes(req.query.category)) {
        return sendError(res, 400, 'Choose a valid complaint category.');
      }
      filter.category = req.query.category;
    }
    if (req.query.status) {
      if (!STATUSES.includes(req.query.status)) {
        return sendError(res, 400, 'Choose a valid complaint status.');
      }
      filter.status = req.query.status;
    }
    if (req.query.complaintId) {
      const complaintId = String(req.query.complaintId).trim().toUpperCase();
      if (!complaintId) return sendError(res, 400, 'Enter a complaint ID to search.');
      filter.complaintId = complaintId;
    }

    const complaints = await Complaint.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ complaints });
  } catch (error) {
    next(error);
  }
});

app.post('/api/complaints', async (req, res, next) => {
  try {
    const { studentName, department, category, description, priority } = req.body || {};
    if (![studentName, department, category, description].every((value) => typeof value === 'string')) {
      return sendError(res, 400, 'Name, department, category, and description are required.');
    }
    if (!studentName.trim() || !department.trim()) {
      return sendError(res, 400, 'Enter your name and department.');
    }
    if (!CATEGORIES.includes(category)) {
      return sendError(res, 400, 'Choose a valid complaint category.');
    }
    if (description.trim().length < 10 || description.trim().length > 2000) {
      return sendError(res, 400, 'Description must be between 10 and 2,000 characters.');
    }
    if (priority !== undefined && !PRIORITIES.includes(priority)) {
      return sendError(res, 400, 'Choose a valid priority.');
    }

    const complaint = await Complaint.create({
      complaintId: createComplaintId(),
      studentName,
      department,
      category,
      description,
      priority: priority || 'Medium'
    });
    res.status(201).json({ complaint });
  } catch (error) {
    next(error);
  }
});

app.patch('/api/complaints/:complaintId/status', async (req, res, next) => {
  try {
    const { status } = req.body || {};
    if (!STATUSES.includes(status)) {
      return sendError(res, 400, 'Choose a valid complaint status.');
    }
    const complaint = await Complaint.findOneAndUpdate(
      { complaintId: req.params.complaintId.toUpperCase() },
      { status },
      { new: true, runValidators: true }
    ).lean();
    if (!complaint) return sendError(res, 404, 'Complaint not found.');
    res.json({ complaint });
  } catch (error) {
    next(error);
  }
});

app.use('/api', (req, res) => sendError(res, 404, 'API endpoint not found.'));

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.name === 'ValidationError') {
    return sendError(res, 400, Object.values(error.errors).map((item) => item.message).join(' '));
  }
  if (error.code === 11000) {
    return sendError(res, 409, 'A complaint with this ID already exists. Please submit again.');
  }
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return sendError(res, 400, 'Request body must contain valid JSON.');
  }
  console.error('Request failed:', error);
  return sendError(res, 500, 'Something went wrong. Please try again.');
});

async function start() {
  await connectToDatabase();
  app.listen(port, () => {
    console.log(`Smart Campus is running at http://localhost:${port}`);
  });
}

app.connectToDatabase = connectToDatabase;

if (require.main === module) {
  start().catch((error) => {
    console.error('Unable to start Smart Campus:', error.message);
    process.exitCode = 1;
  });
}

module.exports = app;
