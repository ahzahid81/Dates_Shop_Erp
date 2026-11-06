const User = require('../models/User');
const { signToken } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { writeAudit } = require('../utils/audit');

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }
  if (!user.isActive) {
    return res.status(403).json({ message: 'Your account has been deactivated. Contact the administrator.' });
  }

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  req.user = user;
  await writeAudit(req, {
    action: 'LOGIN',
    entity: 'Auth',
    entityId: user._id,
    description: `${user.name} signed in`,
  });

  res.json({ token: signToken(user), user: user.toSafeJSON() });
});

const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user.toSafeJSON() });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(currentPassword))) {
    return res.status(400).json({ message: 'Current password is incorrect' });
  }
  user.password = newPassword;
  await user.save();
  await writeAudit(req, {
    action: 'PASSWORD_CHANGE',
    entity: 'User',
    entityId: user._id,
    description: 'Changed own password',
  });
  res.json({ message: 'Password updated successfully' });
});

const listUsers = asyncHandler(async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json({ users: users.map((u) => u.toSafeJSON()) });
});

const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, phone } = req.body;
  const exists = await User.findOne({ email: String(email).toLowerCase().trim() });
  if (exists) return res.status(409).json({ message: 'An account with this email already exists' });

  const user = await User.create({ name, email, password, role, phone });
  await writeAudit(req, {
    action: 'CREATE',
    entity: 'User',
    entityId: user._id,
    description: `Created ${role} account for ${name}`,
  });
  res.status(201).json({ user: user.toSafeJSON() });
});

const updateUser = asyncHandler(async (req, res) => {
  const { name, email, role, phone, isActive, password } = req.body;
  const user = await User.findById(req.params.id).select('+password');
  if (!user) return res.status(404).json({ message: 'User not found' });

  if (email && String(email).toLowerCase().trim() !== user.email) {
    const exists = await User.findOne({ email: String(email).toLowerCase().trim(), _id: { $ne: user._id } });
    if (exists) return res.status(409).json({ message: 'Email is already in use' });
    user.email = email;
  }
  if (name !== undefined) user.name = name;
  if (role !== undefined) user.role = role;
  if (phone !== undefined) user.phone = phone;
  if (isActive !== undefined) user.isActive = Boolean(isActive);
  if (password) user.password = password;

  if (String(user._id) === String(req.user._id) && (user.role !== 'admin' || user.isActive === false)) {
    return res.status(400).json({ message: 'You cannot remove your own admin access' });
  }

  await user.save();
  await writeAudit(req, {
    action: 'UPDATE',
    entity: 'User',
    entityId: user._id,
    description: `Updated account for ${user.name}`,
    meta: { role: user.role, isActive: user.isActive },
  });
  res.json({ user: user.toSafeJSON() });
});

module.exports = { login, me, changePassword, listUsers, createUser, updateUser };
