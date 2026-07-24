import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase.js';

const JWT_SECRET = process.env.JWT_SECRET || 'bloodbridge_jwt_secret_key_prod_1002';

export const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this resource. Please log in.'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    // Real-time check in users table to ensure they are not suspended
    const { data: dbUser, error: dbErr } = await supabase
      .from('users')
      .select('role')
      .eq('id', decoded.id)
      .single();

    if (!dbErr && dbUser) {
      if (dbUser.role === 'suspended') {
        return res.status(403).json({
          success: false,
          message: 'Your account has been suspended by the Admin due to community policy violations.'
        });
      }
      decoded.role = dbUser.role; // Keep role in sync with database in real-time
    }

    req.user = decoded; // Contains id, email, role
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, token validation failed.'
    });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role (${req.user?.role || 'none'}) is not authorized to access this resource.`
      });
    }
    next();
  };
};
