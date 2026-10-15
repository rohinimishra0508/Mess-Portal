import cloudinary from 'cloudinary';
import mongoose from 'mongoose';
import userModel from '../Models/userModel.js';
import studentProfileModel from '../Models/studentProfileModel.js';
import bankAccountModel, { toBankAccountView } from '../Models/bankAccountModel.js';
import feedbackModel from '../Models/feedbackSuggestion.js';
import complaintModel from '../Models/complaintModel.js';
import announcementModel from '../Models/announcementModel.js';
import menuModel from '../Models/menuModel.js';
import messInfoModel from '../Models/messInfoModel.js';
import { hashPassword } from '../Utils/createToken.js';
import ApiError from '../Utils/ApiError.js';

/** Streams a file buffer to Cloudinary and resolves with the upload result. */
const uploadToCloudinary = (buffer, folder) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.v2.uploader.upload_stream(
      { folder, width: folder === 'avatars' ? 250 : 200, crop: 'scale' },
      (error, result) => (error ? reject(error) : resolve(result)),
    );
    stream.end(buffer);
  });

/**
 * Flattens the split identity (`User`) + `StudentProfile` (+ optional
 * `BankAccount`) into the single object the client/controllers expect. Keeps
 * `_id` as the User id (the principal), never the profile id.
 */
const toStudentView = (user, profile = {}, bank = null) => ({
  _id: user._id,
  emailId: user.emailId,
  firstName: user.firstName,
  lastName: user.lastName,
  phoneNumber: user.phoneNumber,
  userRole: user.userRole,
  studentRoll: profile?.studentRoll,
  avatar: profile?.avatar,
  profileImage: profile?.profileImage,
  bankAccount: toBankAccountView(bank),
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

/**
 * Registers a student as two linked documents — an identity (`User`) and a
 * role-specific `StudentProfile` — created **atomically** in one transaction.
 * If either insert fails, the whole thing rolls back, so we never end up with
 * an orphan `User` that has no profile (or vice-versa).
 *
 * Requires a replica set (MongoDB Atlas provides one); transactions are not
 * available against a standalone `mongod`.
 */
const studentRegister = async (registrationData) => {
  const { emailId, firstName, lastName, phoneNumber, studentRoll, password } = registrationData;

  // Fail fast with friendly messages. The unique indexes on User.emailId and
  // StudentProfile.studentRoll are the real guarantee; this is just UX.
  const [emailTaken, rollTaken] = await Promise.all([
    userModel.exists({ emailId }),
    studentProfileModel.exists({ studentRoll }),
  ]);
  if (emailTaken) throw ApiError.conflict('An account with this email already exists, Please Login');
  if (rollTaken) throw ApiError.conflict('This roll number is already registered');

  const session = await mongoose.startSession();
  try {
    let user;
    // withTransaction commits on success, aborts on throw, and auto-retries
    // transient transaction errors for us.
    await session.withTransaction(async () => {
      // create() under a session needs the array form; the password-hashing
      // pre-save hook on User still runs.
      const [createdUser] = await userModel.create(
        [{ emailId, firstName, lastName, phoneNumber, password, userRole: 'Student' }],
        { session },
      );
      await studentProfileModel.create([{ userId: createdUser._id, studentRoll }], { session });
      user = createdUser;
    });

    user.password = undefined; // never leak the hash back to the caller
    return user;
  } catch (err) {
    // A duplicate slipping past the pre-check (race) surfaces as a dup-key error.
    if (err?.code === 11000) {
      throw ApiError.conflict('An account with these details already exists, Please Login');
    }
    throw err;
  } finally {
    await session.endSession();
  }
};

const studentLogin = async ({ emailId, password }) => {
  // Password is `select: false`, so it must be explicitly requested for the check.
  const user = await userModel.findOne({ emailId, userRole: 'Student' }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Invalid Credentials!, Please Recheck or Register');
  }
  const [profile, bank] = await Promise.all([
    studentProfileModel.findOne({ userId: user._id }).lean(),
    bankAccountModel.findOne({ userId: user._id }).lean(),
  ]);
  return toStudentView(user, profile, bank);
};

const getProfileService = async (userId) => {
  const user = await userModel.findById(userId).lean();
  if (!user) throw ApiError.notFound('User Not Found');
  const [profile, bank] = await Promise.all([
    studentProfileModel.findOne({ userId }).lean(),
    bankAccountModel.findOne({ userId }).lean(),
  ]);
  return toStudentView(user, profile, bank);
};

// Which incoming fields belong to which document. Anything else is ignored.
const USER_EDITABLE = ['firstName', 'lastName', 'phoneNumber', 'emailId'];
const PROFILE_EDITABLE = ['studentRoll', 'profileImage'];
const BANK_EDITABLE = ['accountHolderName', 'accountNumber', 'ifscCode', 'bankName'];

/**
 * Creates or patches the student's bank account. Loads-merges-saves rather than
 * using findOneAndUpdate so the schema's `required` and IFSC-format validators
 * run against the *whole* document — update validators only see the paths being
 * written, which would let a partial upsert create an account with no number.
 * Returns the (possibly untouched) account so callers can echo it back.
 */
const upsertBankAccount = async (userId, profileData) => {
  const bankUpdate = {};
  for (const key of BANK_EDITABLE) {
    if (profileData[key] !== undefined) bankUpdate[key] = profileData[key];
  }

  const existing = await bankAccountModel.findOne({ userId });
  if (!Object.keys(bankUpdate).length) return existing;

  const bank = existing ?? new bankAccountModel({ userId });
  bank.set(bankUpdate);
  await bank.save();
  return bank;
};

const updateProfileService = async (userId, profileData, avatarFile) => {
  const userUpdate = {};
  const profileUpdate = {};

  for (const key of USER_EDITABLE) {
    if (profileData[key] !== undefined) userUpdate[key] = profileData[key];
  }
  for (const key of PROFILE_EDITABLE) {
    if (profileData[key] !== undefined) profileUpdate[key] = profileData[key];
  }

  // Password is hashed here because findByIdAndUpdate skips the pre('save') hook.
  if (profileData.password) {
    userUpdate.password = await hashPassword(profileData.password);
  }

  // Bank details go first: they carry the strictest validators, so an invalid
  // IFSC / account number rejects the request before anything else is written —
  // in particular before the avatar swap below, which is not undoable.
  const bank = await upsertBankAccount(userId, profileData);

  if (avatarFile) {
    const existing = await studentProfileModel.findOne({ userId }).select('avatar').lean();
    if (existing?.avatar?.public_id) {
      await cloudinary.v2.uploader.destroy(existing.avatar.public_id);
    }
    const uploadResult = await uploadToCloudinary(avatarFile.data, 'avatars');
    profileUpdate.avatar = { public_id: uploadResult.public_id, url: uploadResult.secure_url };
  }

  if (Object.keys(userUpdate).length) {
    await userModel.findByIdAndUpdate(userId, userUpdate, { runValidators: true });
  }
  if (Object.keys(profileUpdate).length) {
    await studentProfileModel.findOneAndUpdate({ userId }, profileUpdate, { runValidators: true });
  }

  const [user, profile] = await Promise.all([
    userModel.findById(userId).lean(),
    studentProfileModel.findOne({ userId }).lean(),
  ]);
  if (!user) throw ApiError.notFound('User not found');
  return toStudentView(user, profile, bank);
};

const getMessInfoService = async () => {
  const latest = await messInfoModel.findOne().sort({ createdAt: -1 }).lean();
  return latest || {};
};

// `student` is the authenticated `req.user` (already carries name + roll from the
// auth middleware), so no extra lookup is needed here.
const displayName = (student) => `${student.firstName ?? ''} ${student.lastName ?? ''}`.trim();

const feedbackAndSuggestion = async (feedbackData, student, feedbackImage) => {
  if (!student) throw ApiError.notFound('Student not found');

  if (feedbackImage) {
    const uploadResult = await uploadToCloudinary(feedbackImage.data, 'feedbacks');
    feedbackData.feedbackImage = { public_id: uploadResult.public_id, url: uploadResult.secure_url };
  }

  return feedbackModel.create({
    ...feedbackData,
    student: displayName(student),
    studentRoll: student.studentRoll,
  });
};

const complaintService = async (complaint, student, complaintImage) => {
  if (!student) throw ApiError.notFound('Student not found');

  if (complaintImage) {
    const uploadResult = await uploadToCloudinary(complaintImage.data, 'complaints');
    complaint.attachment = { public_id: uploadResult.public_id, url: uploadResult.secure_url };
  }

  return complaintModel.create({
    ...complaint,
    student: displayName(student),
    roll: student.studentRoll,
  });
};

const getAnnouncementsService = async () => {
  return announcementModel.find().sort({ createdAt: -1 }).lean();
};

const getMenuService = async () => {
  return menuModel.findOne().sort({ createdAt: -1 }).lean();
};

export {
  studentRegister,
  studentLogin,
  feedbackAndSuggestion,
  complaintService,
  getAnnouncementsService,
  getMenuService,
  updateProfileService,
  getProfileService,
  getMessInfoService,
};
