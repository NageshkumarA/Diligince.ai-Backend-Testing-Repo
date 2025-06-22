import express from 'express';
import VendorUser from '../models/VendorUsermodel.js';
import { hashPassword } from '../utils/auth.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const users = await VendorUser.find();
  res.json(users);
});

router.get('/:id', async (req, res) => {
  const user = await VendorUser.findById(req.params.id);
  user ? res.json(user) : res.status(404).send('Not found');
});

router.post('/register', async (req, res) => {
  const { businessname, email, phonenumber, vendorcategory, specialization, password } = req.body;

  const existing = await VendorUser.findOne({ email });
  if (existing) return res.status(400).json({ error: 'User already exists' });

  const hashed = await hashPassword(password);
  const user = await VendorUser.create({ businessname, email, phonenumber, vendorcategory, specialization, password: hashed });
  res.status(201).json(user);
});

router.put('/:id', async (req, res) => {
  const updated = await VendorUser.findByIdAndUpdate(req.params.id, req.body, { new: true });
  updated ? res.json(updated) : res.status(404).send('Not found');
});

router.delete('/:id', async (req, res) => {
  const deleted = await VendorUser.findByIdAndDelete(req.params.id);
  deleted ? res.send(`Deleted user id=${req.params.id}`) : res.status(404).send('Not found');
});

export default router;
