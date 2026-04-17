import bcrypt from "bcryptjs";

export async function hashPassword(rawPassword, saltRounds = 12) {
  return bcrypt.hash(rawPassword, saltRounds);
}

export async function comparePassword(rawPassword, hashedPassword) {
  return bcrypt.compare(rawPassword, hashedPassword);
}

