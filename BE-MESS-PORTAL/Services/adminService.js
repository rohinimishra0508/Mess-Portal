import mongoose from 'mongoose';
import userModel from '../Models/userModel.js';
import adminProfileModel from '../Models/adminProfileModel.js';
import studentProfileModel from '../Models/studentProfileModel.js';
import bankAccountModel, { toBankAccountView } from '../Models/bankAccountModel.js';
import announcementModel from '../Models/announcementModel.js';
import LeaveModel from '../Models/leaveApplicationModel.js';
import menuModel from '../Models/menuModel.js';
import feedbackModel from '../Models/feedbackSuggestion.js';
import complaintModel from '../Models/complaintModel.js';
import messInfoModel from '../Models/messInfoModel.js';
import ApiError from '../Utils/ApiError.js';
import { buildPaginationMeta, escapeRegex } from '../Utils/pagination.js';

/**
 * Runs a single aggregation that returns one page of `data` plus the total
 * matched `count` via `$facet` — avoiding a second round-trip to the DB.
 */
const paginate = async (model, { match = {}, sort, skip, limit, page, project }) => {
  const dataPipeline = [{ $sort: sort }, { $skip: skip }, { $limit: limit }];
  if (project) dataPipeline.push({ $project: project });

  const [result] = await model.aggregate([
    { $match: match },
    {
      $facet: {
        data: dataPipeline,
        meta: [{ $count: 'total' }],
      },
    },
  ]);

  const total = result?.meta?.[0]?.total ?? 0;
  return { data: result?.data ?? [], pagination: buildPaginationMeta({ total, page, limit }) };
};

/* ───────────────────────────── Admin auth ───────────────────────────── */

/** Shape returned for an admin to the controller/client (never the hash). */
const toAdminView = (user, adminType) => ({
  _id: user._id,
  emailId: user.emailId,
  firstName: user.firstName,
  lastName: user.lastName,
  phoneNumber: user.phoneNumber,
  userRole: user.userRole,
  adminType,
});

/**
 * Creates an admin as a `User` (identity + auth) plus an `AdminProfile`
 * (adminType) atomically. Rolls both back if either insert fails.
 */
const createAdminWithProfile = async (registerData, conflictMsg) => {
  const { emailId, firstName, lastName, phoneNumber, password, adminType } = registerData;

  if (await userModel.exists({ emailId })) throw ApiError.conflict(conflictMsg);

  const session = await mongoose.startSession();
  try {
    let user;
    await session.withTransaction(async () => {
      const [createdUser] = await userModel.create(
        [{ emailId, firstName, lastName, phoneNumber, password, userRole: 'Admin' }],
        { session },
      );
      await adminProfileModel.create([{ userId: createdUser._id, adminType }], { session });
      user = createdUser;
    });
    return toAdminView(user, adminType);
  } catch (err) {
    if (err?.code === 11000) throw ApiError.conflict(conflictMsg);
    throw err;
  } finally {
    await session.endSession();
  }
};

const registerAdminService = (registerData) =>
  createAdminWithProfile(registerData, 'Admin Already Exists, Please Login');

const addAdminService = (registerData) =>
  createAdminWithProfile(registerData, 'Admin Already Exists');

const loginAdminService = async ({ emailId, password }) => {
  const user = await userModel.findOne({ emailId, userRole: 'Admin' }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Invalid Credentials!, Please Recheck or Register');
  }
  const profile = await adminProfileModel.findOne({ userId: user._id }).lean();
  return toAdminView(user, profile?.adminType);
};

/* ──────────────────────────── Mess info ─────────────────────────────── */

const addMessInfoService = async (messInfo) => {
  return messInfoModel.create(messInfo);
};

const getMessInfoService = async () => {
  const latest = await messInfoModel.findOne().sort({ createdAt: -1 }).lean();
  return latest || {};
};

const updateMessInfoService = async (messInfo, id) => {
  const info = await messInfoModel
    .findByIdAndUpdate(id, messInfo, { new: true, runValidators: true })
    .lean();
  if (!info) throw ApiError.notFound('Mess information not found');
  return info;
};

const addMessinfoContact = async (newContact, id) => {
  const messInfo = await messInfoModel.findByIdAndUpdate(
    id,
    { $push: { contacts: newContact } },
    { new: true, runValidators: true },
  ).lean();
  if (!messInfo) throw ApiError.notFound('No Information Exists Associated with this');
  return messInfo;
};

/* ─────────────────────── Dashboard statistics ───────────────────────── */

const getDashboardStatsService = async () => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  // All counts run in parallel; each is a cheap index-backed `countDocuments`
  // instead of streaming entire collections to the client just to size them.
  const [totalStudents, totalLeaves, totalFeedbacks, totalComplaints, leavesToday, feedbacksToday] =
    await Promise.all([
      studentProfileModel.estimatedDocumentCount(),
      LeaveModel.estimatedDocumentCount(),
      feedbackModel.estimatedDocumentCount(),
      complaintModel.estimatedDocumentCount(),
      LeaveModel.countDocuments({ appliedDate: { $gte: startOfToday } }),
      feedbackModel.countDocuments({ submissionDate: { $gte: startOfToday } }),
    ]);

  return { totalStudents, totalLeaves, totalFeedbacks, totalComplaints, leavesToday, feedbacksToday };
};

/* ─────────────────────────── Students list ──────────────────────────── */

/**
 * Joins each student's bank account and reshapes it into the same `bankAccount`
 * view the single-student endpoint returns (`null` when they have none).
 * Opt-in via `includeBank` — the paginated table does not need these, so only
 * the "download all details" export asks for them.
 */
const BANK_LOOKUP_STAGES = [
  {
    $lookup: {
      from: 'BankAccounts',
      localField: '_id',
      foreignField: 'userId',
      as: 'bank',
    },
  },
  { $unwind: { path: '$bank', preserveNullAndEmptyArrays: true } },
  {
    $addFields: {
      bankAccount: {
        $cond: [
          { $ifNull: ['$bank', false] },
          {
            accountHolderName: { $ifNull: ['$bank.accountHolderName', ''] },
            accountNumber: '$bank.accountNumber',
            ifscCode: '$bank.ifscCode',
            bankName: { $ifNull: ['$bank.bankName', ''] },
          },
          null,
        ],
      },
    },
  },
];

const getStudentsService = async (listParams, { includeBank = false } = {}) => {
  const { search, sort, skip, limit, page } = listParams;

  // Students span two collections now (User identity + StudentProfile). Start
  // from users (role-filtered on an index), join the profile, and lift
  // `studentRoll`/`avatar` to the top level so search & sort work uniformly.
  const pipeline = [
    { $match: { userRole: 'Student' } },
    {
      $lookup: {
        from: 'StudentProfiles',
        localField: '_id',
        foreignField: 'userId',
        as: 'profile',
      },
    },
    { $unwind: { path: '$profile', preserveNullAndEmptyArrays: true } },
    { $addFields: { studentRoll: '$profile.studentRoll', avatar: '$profile.avatar' } },
  ];

  if (includeBank) pipeline.push(...BANK_LOOKUP_STAGES);

  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    pipeline.push({
      $match: {
        $or: [
          { firstName: rx },
          { lastName: rx },
          { emailId: rx },
          { phoneNumber: rx },
          { studentRoll: rx },
        ],
      },
    });
  }

  pipeline.push({
    $facet: {
      data: [
        { $sort: sort },
        { $skip: skip },
        { $limit: limit },
        { $project: { password: 0, profile: 0, bank: 0, __v: 0 } },
      ],
      meta: [{ $count: 'total' }],
    },
  });

  const [result] = await userModel.aggregate(pipeline);
  const total = result?.meta?.[0]?.total ?? 0;
  return { data: result?.data ?? [], pagination: buildPaginationMeta({ total, page, limit }) };
};

/**
 * Bank details for one student, fetched on demand when an admin opens a
 * profile. Deliberately *not* joined into `getStudentsService`: that would put
 * every student's account number into every list response and into the CSV
 * export, instead of releasing one student's at a time on an explicit click.
 *
 * Resolves to `null` when the student has not added their details yet.
 */
const getStudentBankDetailsService = async (studentId) => {
  const student = await userModel
    .findOne({ _id: studentId, userRole: 'Student' })
    .select('_id')
    .lean();
  if (!student) throw ApiError.notFound('Student not found');

  const bank = await bankAccountModel.findOne({ userId: student._id }).lean();
  return toBankAccountView(bank);
};

const getStudentByEmailService = async (webmail) => {
  const user = await userModel.findOne({ emailId: webmail, userRole: 'Student' }).lean();
  if (!user) return null;
  const profile = await studentProfileModel.findOne({ userId: user._id }).lean();
  return { ...user, password: undefined, studentRoll: profile?.studentRoll, avatar: profile?.avatar };
};

/* ──────────────────────────── Leaves list ───────────────────────────── */

const getLeavesService = async (listParams, { status } = {}) => {
  const { search, sort, skip, limit, page } = listParams;
  const match = {};
  if (status) match.status = status;
  if (search) match.studentRoll = new RegExp(escapeRegex(search), 'i');
  return paginate(LeaveModel, { match, sort, skip, limit, page });
};

const getTodaysLeavesList = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return LeaveModel.find({ appliedDate: { $gte: today } }).sort({ appliedDate: -1 }).lean();
};

/* ──────────────────────────── Menu ──────────────────────────────────── */

const uploadMenuService = async (menuData) => {
  return menuModel.create(menuData);
};

const updateMenuService = async (updatedMenuData, id) => {
  const menu = await menuModel
    .findByIdAndUpdate(id, updatedMenuData, { new: true, runValidators: true })
    .lean();
  if (!menu) throw ApiError.notFound('Menu not found');
  return menu;
};

const getMenuService = async () => {
  return menuModel.findOne().sort({ createdAt: -1 }).lean();
};

/* ─────────────────────────── Announcements ──────────────────────────── */

const announcementService = async (announcementData) => {
  return announcementModel.create(announcementData);
};

const getAnnounceService = async () => {
  return announcementModel.find().sort({ createdAt: -1 }).lean();
};

const deleteAnnounceService = async (id) => {
  const deleted = await announcementModel.findByIdAndDelete(id).lean();
  if (!deleted) throw ApiError.notFound('Announcement not found');
  return deleted;
};

/* ───────────────────────────── Feedback ─────────────────────────────── */

const getFeedbackService = async (listParams, { mealOfDay } = {}) => {
  const { search, sort, skip, limit, page } = listParams;
  const match = {};
  if (mealOfDay) match.mealOfDay = mealOfDay;
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    match.$or = [{ studentRoll: rx }, { student: rx }, { feedbackDescription: rx }];
  }
  return paginate(feedbackModel, { match, sort, skip, limit, page });
};

const getTodaysFeedbackService = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return feedbackModel
    .find({ submissionDate: { $gte: today } })
    .sort({ submissionDate: -1 })
    .limit(5)
    .lean();
};

/* ───────────────────────────── Complaints ───────────────────────────── */

const complaintListService = async (listParams, { status } = {}) => {
  const { search, sort, skip, limit, page } = listParams;
  const match = {};
  if (status) match.status = status;
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    match.$or = [{ complaintAbout: rx }, { description: rx }, { roll: rx }, { student: rx }];
  }
  return paginate(complaintModel, { match, sort, skip, limit, page });
};

const complaintActionService = async (id, actionData, user) => {
  const updated = await complaintModel
    .findByIdAndUpdate(id, { ...actionData, actionBy: user }, { new: true, runValidators: true })
    .lean();
  if (!updated) throw ApiError.notFound('Complaint not found');
  return updated;
};

const deleteComplaintService = async (id) => {
  const deleted = await complaintModel.findByIdAndDelete(id).lean();
  if (!deleted) throw ApiError.notFound('Complaint not found');
  return deleted;
};

const getSingleComplaintService = async (id) => {
  const complaint = await complaintModel.findById(id).lean();
  if (!complaint) throw ApiError.notFound('Complaint not found');
  return complaint;
};

export {
  registerAdminService,
  loginAdminService,
  addAdminService,
  getDashboardStatsService,
  getStudentsService,
  getStudentBankDetailsService,
  getLeavesService,
  uploadMenuService,
  updateMenuService,
  announcementService,
  getStudentByEmailService,
  getFeedbackService,
  getAnnounceService,
  deleteAnnounceService,
  getMenuService,
  complaintListService,
  complaintActionService,
  getSingleComplaintService,
  addMessInfoService,
  getMessInfoService,
  addMessinfoContact,
  deleteComplaintService,
  getTodaysLeavesList,
  getTodaysFeedbackService,
  updateMessInfoService,
};
