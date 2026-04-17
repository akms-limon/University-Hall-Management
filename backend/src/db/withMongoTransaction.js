import mongoose from "mongoose";

function isTransactionUnsupported(error) {
  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("transaction numbers are only allowed") ||
    message.includes("replica set") ||
    message.includes("mongos")
  );
}

export async function withMongoTransaction(existingSession, work) {
  if (existingSession) {
    return work(existingSession);
  }

  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } catch (error) {
    if (isTransactionUnsupported(error)) {
      return work(null);
    }
    throw error;
  } finally {
    await session.endSession();
  }
}

