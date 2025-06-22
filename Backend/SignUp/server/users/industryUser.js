import express from 'express';
import IndustryUser from '../models/IndustryUsermodel.js';
import { hashPassword } from '../utils/auth.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const users = await IndustryUser.find();
  res.json(users);
});

router.get('/:id', async (req, res) => {
  const user = await IndustryUser.findById(req.params.id);
  user ? res.json(user) : res.status(404).send('Not found');
});

router.post('/register', async (req, res) => {
  const { companyname, email, phonenumber, industrytype, password } = req.body;

  const existing = await IndustryUser.findOne({ email });
  if (existing) return res.status(400).json({ error: 'User already exists' });

  const hashed = await hashPassword(password);
  const user = await IndustryUser.create({ companyname, email, phonenumber, industrytype, password: hashed });
  res.status(201).json(user);
});

router.put('/:id', async (req, res) => {
  const updated = await IndustryUser.findByIdAndUpdate(req.params.id, req.body, { new: true });
  updated ? res.json(updated) : res.status(404).send('Not found');
});

router.delete('/:id', async (req, res) => {
  const deleted = await IndustryUser.findByIdAndDelete(req.params.id);
  deleted ? res.send(`Deleted user id=${req.params.id}`) : res.status(404).send('Not found');
});

export default router;
