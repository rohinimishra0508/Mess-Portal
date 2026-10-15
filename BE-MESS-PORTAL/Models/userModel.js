import mongoose, { Schema } from "mongoose";
import bcrypt from "bcryptjs";
import { SALT_ROUNDS } from "../Utils/createToken.js";

const userSchema = new Schema(
  {
    emailId: {
      type: String,
      required: [true, "User email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: function (v) {
          // Students must use their institute email; everyone else a basic email.
          if (this.userRole === "Student") {
            return /^[a-zA-Z]+_[0-9]{4}(cb|cs|me|ce|ph|ee|mc|mm)[0-9]{2}@iitp\.ac\.in$/.test(v);
          }
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: (props) => `${props.value} is not a valid email!`,
      },
    },
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: [true, "Please add your phone number"],
      validate: {
        validator: function (v) {
          return /^\d{10}$/.test(v);
        },
        message: (props) => `${props.value} is not a valid phone number!`,
      },
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    userRole: {
      type: String,
      required: true,
      enum: ["Student", "Admin", "Other"],
    },
  },
  {
    timestamps: true,
  },
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

const userModel = mongoose.model("User", userSchema, "User");

export default userModel;
