import { StatusCodes } from "http-status-codes";
import { USER_ROLES } from "../constants/roles.js";
import { Student } from "../models/Student.js";
import { User } from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import { sanitizeUser } from "../utils/sanitizeUser.js";
import { generateAccessToken } from "../utils/jwt.js";

function buildAuthPayload(user) {
  const safeUser = sanitizeUser(user);
  const token = generateAccessToken({ sub: safeUser.id, role: safeUser.role });
  return {
    user: safeUser,
    token,
  };
}

export const authService = {
  async registerStudent(payload) {
    const existingUser = await User.findOne({ email: payload.email });
    if (existingUser) {
      throw new ApiError(StatusCodes.CONFLICT, "Email already in use");
    }

    const user = await User.create({
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      password: payload.password,
      role: USER_ROLES.STUDENT,
    });

    await Student.create({
      userId: user._id,
      profilePhoto: user.profilePhoto || "",
    });

    return buildAuthPayload(user);
  },

  async login(payload) {
    const user = await User.findOne({ email: payload.email }).select("+password");
    if (!user || !user.isActive) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid credentials");
    }

    const isMatched = await user.comparePassword(payload.password);
    if (!isMatched) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid credentials");
    }

    user.lastLogin = new Date();
    await user.save();

    return buildAuthPayload(user);
  },
};
