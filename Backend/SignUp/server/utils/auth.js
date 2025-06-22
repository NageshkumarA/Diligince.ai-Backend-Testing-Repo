import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';


export const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const verifyPassword = async (plain, hashed) => {
  return bcrypt.compare(plain, hashed);
};

export const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email, type: user.type },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};
