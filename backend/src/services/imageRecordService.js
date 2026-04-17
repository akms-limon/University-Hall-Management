import { StatusCodes } from "http-status-codes";
import { ImageRecord } from "../models/ImageRecord.js";
import { ApiError } from "../utils/ApiError.js";
import { deleteCloudinaryAsset, uploadBufferToCloudinary } from "../utils/cloudinaryUpload.js";
import { removeLocalImageFile } from "../utils/localImageFile.js";

function normalizeString(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function normalizeSortStage(sortBy = "createdAt", sortOrder = "desc") {
  const direction = sortOrder === "asc" ? 1 : -1;
  const mappedPath = {
    createdAt: "createdAt",
    updatedAt: "updatedAt",
    title: "title",
  };

  const field = mappedPath[sortBy] || "createdAt";
  return { [field]: direction, _id: 1 };
}

async function uploadImage(file) {
  if (!file?.buffer) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Image file is required");
  }

  const uploaded = await uploadBufferToCloudinary(file.buffer, {
    resourceType: "image",
  });

  return {
    imagePath: uploaded.secure_url || uploaded.url || "",
    imagePublicId: uploaded.public_id || "",
  };
}

async function removeStoredImage(imagePath, imagePublicId) {
  if (imagePublicId) {
    await deleteCloudinaryAsset(imagePublicId, "image");
    return;
  }

  if (typeof imagePath === "string" && imagePath.startsWith("/uploads/")) {
    await removeLocalImageFile(imagePath);
  }
}

function sanitizeImageRecord(record) {
  const value = record?.toObject ? record.toObject() : record;
  return {
    id: value?._id?.toString?.() || value?.id,
    title: value?.title || "",
    description: value?.description || "",
    imagePath: value?.imagePath || "",
    createdBy: value?.createdBy?.toString?.() || value?.createdBy || null,
    createdAt: value?.createdAt || null,
    updatedAt: value?.updatedAt || null,
  };
}

async function loadImageRecordById(imageId) {
  const item = await ImageRecord.findById(imageId);
  if (!item) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Image record not found");
  }

  return item;
}

export const imageRecordService = {
  async createImageRecord(payload, file, actor) {
    const image = await uploadImage(file);

    const item = await ImageRecord.create({
      title: normalizeString(payload.title),
      description: normalizeString(payload.description),
      imagePath: image.imagePath,
      imagePublicId: image.imagePublicId,
      createdBy: actor?.id || null,
    });

    return sanitizeImageRecord(item);
  },

  async listImageRecords(query) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const skip = (page - 1) * limit;
    const sort = normalizeSortStage(query.sortBy, query.sortOrder);
    const filters = {};

    if (query.search) {
      const search = normalizeString(query.search);
      filters.title = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    }

    const [items, total] = await Promise.all([
      ImageRecord.find(filters).sort(sort).skip(skip).limit(limit).lean(),
      ImageRecord.countDocuments(filters),
    ]);

    return {
      items: items.map((entry) => sanitizeImageRecord(entry)),
      meta: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
        sortBy: query.sortBy || "createdAt",
        sortOrder: query.sortOrder || "desc",
      },
    };
  },

  async getImageRecordById(imageId) {
    const item = await loadImageRecordById(imageId);
    return sanitizeImageRecord(item);
  },

  async updateImageRecordById(imageId, payload, file) {
    const item = await loadImageRecordById(imageId);
    const previousImagePath = item.imagePath;
    const previousImagePublicId = item.imagePublicId;
    const hasTitle = payload.title !== undefined;
    const hasDescription = payload.description !== undefined;
    const hasFile = Boolean(file?.buffer);

    if (!hasTitle && !hasDescription && !hasFile) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "Provide at least one field or image file to update");
    }

    if (hasTitle) {
      item.title = normalizeString(payload.title);
    }

    if (hasDescription) {
      item.description = normalizeString(payload.description);
    }

    if (hasFile) {
      const image = await uploadImage(file);
      item.imagePath = image.imagePath;
      item.imagePublicId = image.imagePublicId;
    }

    await item.save();

    if (hasFile && previousImagePath && previousImagePath !== item.imagePath) {
      await removeStoredImage(previousImagePath, previousImagePublicId);
    }

    return sanitizeImageRecord(item);
  },

  async deleteImageRecordById(imageId) {
    const item = await loadImageRecordById(imageId);
    const imagePath = item.imagePath;
    const imagePublicId = item.imagePublicId;
    await ImageRecord.deleteOne({ _id: item._id });
    await removeStoredImage(imagePath, imagePublicId);
    return sanitizeImageRecord(item);
  },
};
