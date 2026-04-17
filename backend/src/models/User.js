import mongoose from "mongoose";
import { roleList, USER_ROLES } from "../constants/roles.js";
import { comparePassword as verifyPassword, hashPassword as createPasswordHash } from "../utils/password.js";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      match: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/,
      select: false,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20,
      match: /^[0-9+\-()\s]+$/,
    },
    profilePhoto: {
      type: String,
      default: "",
      trim: true,
    },
    role: {
      type: String,
      enum: roleList,
      default: USER_ROLES.STUDENT,
      index: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

userSchema.pre("save", async function passwordHashHook(next) {
  if (!this.isModified("password")) {
    return next();
  }

  const hashedPassword = await createPasswordHash(this.password);
  this.password = hashedPassword;
  return next();
});

userSchema.methods.comparePassword = async function comparePassword(plainPassword) {
  return verifyPassword(plainPassword, this.password);
};

export const User = mongoose.model("User", userSchema);
