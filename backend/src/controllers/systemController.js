import { StatusCodes } from "http-status-codes";
import { env } from "../config/env.js";
import { getAllowedOrigins } from "../config/corsOptions.js";
import { uploadConfig } from "../config/upload.js";
import { uploadPublicPath } from "../config/storage.js";
import { API_PREFIX } from "../constants/app.js";
import { NOTICE_CATEGORY, NOTICE_TARGET_AUDIENCE, Notice } from "../models/Notice.js";
import { Room } from "../models/Room.js";
import { Staff } from "../models/Staff.js";
import { Student } from "../models/Student.js";
import { USER_ROLES } from "../constants/roles.js";
import { User } from "../models/User.js";
import { apiResponse } from "../utils/ApiResponse.js";

function buildAbsoluteUrl(req, pathOrUrl = "") {
  if (!pathOrUrl) return "";
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;

  const normalizedPath = pathOrUrl.startsWith(uploadPublicPath) ? pathOrUrl : `${uploadPublicPath}/${pathOrUrl}`;
  return `${req.protocol}://${req.get("host")}${normalizedPath}`;
}

function toPublicNoticeSummary(notice) {
  return {
    id: notice._id.toString(),
    title: notice.title,
    content: notice.content,
    category: notice.category,
    isUrgent: Boolean(notice.isUrgent),
    publishedDate: notice.publishedDate,
  };
}

export const systemController = {
  index(_req, res) {
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "University Hall Automation API",
        data: {
          version: "v1",
          prefix: API_PREFIX,
          docsHint: "See backend/docs/BACKEND_FOUNDATION.md for conventions and module patterns",
        },
      })
    );
  },

  health(_req, res) {
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Server is healthy",
        data: {
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
          environment: env.NODE_ENV,
          allowedOrigins: getAllowedOrigins(),
          upload: uploadConfig,
          paymentProvider: env.PAYMENT_PROVIDER,
        },
      })
    );
  },

  async homepage(req, res) {
    const now = new Date();
    const publicNoticeFilter = {
      isActive: true,
      targetAudience: NOTICE_TARGET_AUDIENCE.ALL,
      publishedDate: { $lte: now },
      $or: [{ expiryDate: null }, { expiryDate: { $gte: now } }],
    };

    const [provost, studentCount, staffCount, roomCount, noticeCount, recentNotices, recentActivities] = await Promise.all([
      User.findOne({ role: USER_ROLES.PROVOST, isActive: true }).sort({ updatedAt: -1 }).select("name email phone profilePhoto"),
      Student.countDocuments({ isActive: true }),
      Staff.countDocuments({ isActive: true }),
      Room.countDocuments({ isActive: true }),
      Notice.countDocuments(publicNoticeFilter),
      Notice.find(publicNoticeFilter).sort({ publishedDate: -1, _id: -1 }).limit(5).select("title content category isUrgent publishedDate"),
      Notice.find({ ...publicNoticeFilter, category: NOTICE_CATEGORY.EVENT })
        .sort({ publishedDate: -1, _id: -1 })
        .limit(4)
        .select("title content category isUrgent publishedDate"),
    ]);

    const activityNotices = recentActivities.length
      ? recentActivities
      : recentNotices.slice(0, 4);

    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Homepage data fetched successfully",
        data: {
          provost: provost
            ? {
                name: provost.name,
                email: provost.email,
                phone: provost.phone,
                photoUrl: buildAbsoluteUrl(req, provost.profilePhoto),
                designation: "Hall Provost",
              }
            : null,
          summary: {
            students: studentCount,
            staff: staffCount,
            rooms: roomCount,
            notices: noticeCount,
          },
          notices: recentNotices.map(toPublicNoticeSummary),
          activities: activityNotices.map(toPublicNoticeSummary),
        },
      })
    );
  },
};
