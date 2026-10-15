import userModel from '../Models/userModel.js';
import adminProfileModel from '../Models/adminProfileModel.js';
import ApiError from '../Utils/ApiError.js';
import asyncHandler from '../Utils/asyncHandler.js';
import { verifyAccessToken } from '../Utils/tokens.js';
import { ACCESS_COOKIE } from '../Utils/cookie.js';

/**
 * Authenticates an admin from the short-lived `accessToken` cookie.
 *
 * Loads the `User`, asserts the `Admin` role, and joins `AdminProfile` for the
 * `adminType` (Warden / Mess Secretary / ...). The minimal set of fields
 * (`_id`, `firstName`, `adminType`) needed downstream is attached to `req.user`.
 */
const authenticateUser = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.[ACCESS_COOKIE];
  if (!token) {
    throw ApiError.unauthorized('Please log in as an authorized user to access this resource');
  }

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch {
    throw ApiError.unauthorized('Authentication failed. Please login again.');
  }

  const user = await userModel.findById(decoded.id).select('_id firstName userRole').lean();

  if (!user || user.userRole !== 'Admin') {
    throw ApiError.unauthorized('User not found');
  }

  const profile = await adminProfileModel.findOne({ userId: user._id }).select('adminType').lean();

  req.user = { ...user, adminType: profile?.adminType };
  next();
});

/** Restricts a route to the given admin roles. */
const authorizeRoles = (roles) => (req, res, next) => {
  if (!roles.includes(req.user?.adminType)) {
    throw ApiError.forbidden(`${req.user?.adminType} is not allowed to access this resource`);
  }
  next();
};

export { authenticateUser, authorizeRoles };
