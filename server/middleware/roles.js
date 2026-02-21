const User = require('../models/User');

module.exports = {
  requireRole: (role) => async (req, res, next) => {
    try {
      console.log('🔐 requireRole check. req.user:', req.user);
      if (!req.user || !req.user.id) {
        console.log('❌ requireRole: No user ID in request');
        return res.status(401).json({ msg: 'No user ID in request' });
      }
      const user = await User.findById(req.user.id).select('-password');
      if (!user) {
        console.log('❌ requireRole: User not found in database');
        return res.status(401).json({ msg: 'User not found' });
      }

      const creatorEmails = ['shanmukhasai250@gmail.com', 'varunmeruga@gmail.com'];
      const isCreator = user.email && creatorEmails.includes(user.email.toLowerCase());

      console.log(`👤 User: ${user.email} | Role: ${user.role} | isCreator: ${isCreator}`);

      if (user.role !== role && user.role !== 'ADMIN' && !isCreator) {
        console.log('🚫 requireRole: Access denied');
        return res.status(403).json({ msg: 'Access denied' });
      }
      console.log('✅ requireRole: Access granted');
      req.currentUser = user;
      next();
    } catch (err) {
      console.error('🔥 requireRole Error:', err.message);
      res.status(500).json({ error: 'Server Error in requireRole', message: err.message });
    }
  }
};
