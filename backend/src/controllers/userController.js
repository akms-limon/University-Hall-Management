import { StatusCodes } from "http-status-codes";
import { User } from "../models/User.js";
import { apiResponse } from "../utils/ApiResponse.js";
import { USER_ROLES } from "../constants/roles.js";
import { ApiError } from "../utils/ApiError.js";
import { sanitizeUser } from "../utils/sanitizeUser.js";

export const userController = {
  async getMyProfile(req, res) {
    const user = await User.findById(req.user.id);
    if (!user || !user.isActive) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, "Authentication required");
    }

    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Profile fetched",
        data: { user: sanitizeUser(user) },
      })
    );
  },

  async updateMyProfile(req, res) {
    if (req.body.email !== undefined || req.body.role !== undefined) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "Email and role cannot be updated");
    }

    const user = await User.findById(req.user.id);
    if (!user || !user.isActive) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, "Authentication required");
    }

    if (req.body.name !== undefined) user.name = req.body.name;
    if (req.body.phone !== undefined) user.phone = req.body.phone;
    if (req.body.profilePhoto !== undefined) user.profilePhoto = req.body.profilePhoto;

    await user.save();

    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Profile updated successfully",
        data: { user: sanitizeUser(user) },
      })
    );
  },

  async listUsers(req, res) {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      User.find({}, { password: 0 }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      User.countDocuments(),
    ]);

    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Users fetched",
        data: {
          items: items.map((user) => ({
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            isActive: user.isActive,
            lastLogin: user.lastLogin,
          })),
        },
        meta: {
          page,
          limit,
          total,
        },
      })
    );
  },

  async roleSummary(_req, res) {
    const summary = await User.aggregate([
      {
        $group: {
          _id: "$role",
          count: { $sum: 1 },
        },
      },
    ]);

    const byRole = {
      [USER_ROLES.STUDENT]: 0,
      [USER_ROLES.STAFF]: 0,
      [USER_ROLES.PROVOST]: 0,
    };

    summary.forEach((entry) => {
      byRole[entry._id] = entry.count;
    });

    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Role summary fetched",
        data: byRole,
      })
    );
  },
};
