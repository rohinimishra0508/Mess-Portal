import userModel from '../Models/userModel.js';
import studentProfileModel from '../Models/studentProfileModel.js';
import ApiError from './ApiError.js';
import asyncHandler from './asyncHandler.js';
import { verifyAccessToken } from './tokens.js';
import { ACCESS_COOKIE } from './cookie.js';

/**
 * Authenticates a student from the short-lived `accessToken` cookie.
 *
 * Identity now lives on `User` and the roll on `StudentProfile`, so we load the
 * user, assert the `Student` role, and join the profile for `studentRoll`. The
 * normalised shape attached to `req.user` is what feedback/complaint/leave
 * handlers downstream read directly (no re-query). An expired token returns 401,
 * which the client interceptor turns into a silent `/api/refresh` + retry.
 */
export const isAuthenticatedUser = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.[ACCESS_COOKIE];
  if (!token) {
    throw ApiError.unauthorized('No token provided. Please login first.');
  }

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch {
    throw ApiError.unauthorized('Invalid or expired token. Please login again.');
  }

  const user = await userModel
    .findById(decoded.id)
    .select('_id emailId firstName lastName userRole')
    .lean();

  if (!user || user.userRole !== 'Student') {
    throw ApiError.unauthorized('Invalid token. User not found.');
  }

  const profile = await studentProfileModel.findOne({ userId: user._id }).select('studentRoll').lean();

  req.user = { ...user, studentRoll: profile?.studentRoll };
  next();
});
