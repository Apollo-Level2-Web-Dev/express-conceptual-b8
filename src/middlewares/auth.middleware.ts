import { RequestHandler, Request, Response, NextFunction } from "express";
import { jwtHelpers } from "../utils/jwtHelpers";
import { JwtPayload } from "jsonwebtoken";

const verifyToken: RequestHandler = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    throw new Error("Access Denied! Token not found!");
  }

  try {
    const decoded = jwtHelpers.verifyToken(authHeader);
    console.log({ decoded });
    req.user = decoded as JwtPayload;
    next();
  } catch {
    throw new Error("Invalid or expired token.");
  }
};

const authorizedRoles = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      const error = new Error("Forbidden: You don't have access!");
      error.statusCode = 403;
      throw error;
    }
    next();
  };
};

export const authMiddleware = { verifyToken, authorizedRoles };
