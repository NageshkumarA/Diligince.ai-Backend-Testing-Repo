import express from 'express';
import IndustryUser from '../models/IndustryUsermodel.js';
import ProfessionalUser from '../models/ProfessionalUsermodel.js';
import VendorUser from '../models/VendorUsermodel.js';
import { verifyPassword, generateToken } from '../utils/auth.js';

const router = express.Router();

const userModels = {
  industry: IndustryUser,
  professional: ProfessionalUser,
  vendor: VendorUser
};

router.post('/', async (req, res) => {
  const { email, password, type } = req.body;

  const Model = userModels[type];
  if (!Model) return res.status(400).json({ error: 'Invalid user type' });

  const user = await Model.findOne({ email });
  if (!user) return res.status(401).json({ error: 'User not found' });

  const isValid = await verifyPassword(password, user.password);
  if (!isValid) return res.status(401).json({ error: 'Incorrect password' });

  const token = generateToken(user);
  res.json({ success : true, token, user: { id: user._id, email: user.email, type: user.type } });
});

export default router;
