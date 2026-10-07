import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

/** Hash a plaintext password using bcrypt. */
export const hashPassword = (plain) => bcrypt.hash(plain, SALT_ROUNDS);

/** Compare a plaintext password against a stored bcrypt hash. */
export const verifyPassword = (plain, hash) => bcrypt.compare(plain, hash);
