import mongoose, { Schema } from 'mongoose';

const adminProfileSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    adminType: {
      type: String,
      required: true,
      enum: ['Warden', 'Mess Secretary', 'Mess Owner', 'Other'],
    },
  },
  {
    timestamps: true,
  },
);

const adminProfileModel = mongoose.model('AdminProfile', adminProfileSchema, 'AdminProfiles');

export default adminProfileModel;
