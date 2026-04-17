import { sanitizeUser } from "./sanitizeUser.js";

function toNullableString(value) {
  if (value === null || value === undefined) {
    return null;
  }

  return String(value);
}

export function sanitizeStaff(staffDocument) {
  const staff = staffDocument.toObject ? staffDocument.toObject() : staffDocument;
  const user = staff.userId && typeof staff.userId === "object" ? sanitizeUser(staff.userId) : null;
  const userId = user ? user.id : toNullableString(staff.userId);

  return {
    id: staff._id?.toString?.() || staff.id,
    userId,
    user,
    staffId: staff.staffId,
    department: staff.department,
    designation: staff.designation,
    profilePhoto: staff.profilePhoto || "",
    joiningDate: staff.joiningDate,
    isActive: Boolean(staff.isActive),
    createdAt: staff.createdAt,
    updatedAt: staff.updatedAt,
  };
}
