export function sanitizeUser(userDocument) {
  const user = userDocument.toObject ? userDocument.toObject() : userDocument;
  return {
    id: user._id?.toString?.() || user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    profilePhoto: user.profilePhoto || "",
    role: user.role,
    isEmailVerified: Boolean(user.isEmailVerified),
    isActive: user.isActive,
    lastLogin: user.lastLogin,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
