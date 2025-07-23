import pkg from 'jsonwebtoken';
const { verify } = pkg;
function authMiddleware(req, res, next) {
  console.log('Authorization Header:', req.headers.authorization);

  const token = req.headers.authorization?.split(' ')[1];
  console.log('Extracted Token:', token);

  if (!token) {
    console.log('No token found in Authorization header');
    return res.status(401).json({ message: 'Access denied' });
  }

  try {
    const decoded = verify(token, process.env.JWT_SECRET);
    console.log('Decoded Token:', decoded);
    console.log('User ID from token:', decoded.userId);
    req.user = decoded;
    console.log('User object set in request:', req.user);
    
    next();
  } catch (err) {
    console.log('Token verification failed:', err.message);
    return res.status(401).json({ message: 'Invalid token' });
  }
}

export default authMiddleware;
