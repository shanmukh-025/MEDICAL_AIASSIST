const User = require('../models/User');

module.exports = {
  requireRole: (role) => async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id).select('-password');
      if (!user) return res.status(401).json({ msg: 'User not found' });
      if (user.role !== role && user.role !== 'ADMIN') {
        return res.status(403).json({ msg: 'Access denied' });
      }
      req.currentUser = user;
      next();
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
};
