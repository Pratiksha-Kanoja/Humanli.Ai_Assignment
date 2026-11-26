import bcrypt from 'bcryptjs';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { User } from '../models/User';
import { signAccessToken } from '../utils/jwt';

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body as { name: string; email: string; password: string };

  const existing = await User.findOne({ email });
  if (existing) throw new ApiError(409, 'Email already in use');

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, passwordHash, role: 'user' });

  const token = signAccessToken(String(user._id), user.role);

  return res.status(201).json({
    token,
    user: { id: String(user._id), name: user.name, email: user.email, role: user.role },
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body as { email: string; password: string };

  const user = await User.findOne({ email });
  if (!user) throw new ApiError(401, 'Invalid credentials');

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new ApiError(401, 'Invalid credentials');

  const token = signAccessToken(String(user._id), user.role);

  return res.json({
    token,
    user: { id: String(user._id), name: user.name, email: user.email, role: user.role },
  });
});

export const me = asyncHandler(async (req, res) => {
  const auth = req.auth;
  if (!auth) throw new ApiError(401, 'Unauthorized');

  const user = await User.findById(auth.userId).select('name email role');
  if (!user) throw new ApiError(401, 'Unauthorized');

  return res.json({ user: { id: String(user._id), name: user.name, email: user.email, role: user.role } });
});

