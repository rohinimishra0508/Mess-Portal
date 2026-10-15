import mongoose, { Schema } from 'mongoose';

const studentProfileSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    studentRoll: {
      type: String,
      required: [true, 'Please Add Your Roll Number'],
      unique: true,
      uppercase: true,
      trim: true,
      validate: {
        validator: function (v) {
          // e.g. 2101CB61
          return /^[0-9]{4}(CB|CS|ME|CE|PH|EE|MC|MM|AI)[0-9]{2}$/.test(v);
        },
        message: (props) => `${props.value} Roll Number is Invalid!`,
      },
    },
    profileImage: {
      type: String,
    },
    avatar: {
      public_id: { type: String },
      url: { type: String },
    },
  },
  {
    timestamps: true,
  },
);

// A student's profile is looked up by their user identity.
studentProfileSchema.index({ createdAt: -1 });

const studentProfileModel = mongoose.model(
  'StudentProfile',
  studentProfileSchema,
  'StudentProfiles',
);

export default studentProfileModel;