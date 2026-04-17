export const exampleService = {
  async getProtectedSummary(user) {
    return {
      authenticated: true,
      actor: {
        id: user.id,
        name: user.name,
        role: user.role,
      },
      note: "This route demonstrates the protected route pattern for future modules.",
    };
  },

  async getProvostOnlySummary(user) {
    return {
      actor: {
        id: user.id,
        role: user.role,
      },
      note: "Provost-only route works. Use this pattern for super-admin controls.",
    };
  },

  async getUploadSummary(files) {
    return {
      uploadedCount: files.length,
      files: files.map((file) => ({
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      })),
      note: "This placeholder endpoint demonstrates upload middleware integration for future modules.",
    };
  },
};
