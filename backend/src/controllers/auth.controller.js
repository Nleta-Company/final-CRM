import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";

import prisma from "../config/prisma.js";

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

function getCookieOptions() {
  const isProduction =
    process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 24 * 60 * 60 * 1000,
  };
}

export async function login(req, res) {
  try {
    const validation = loginSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Valid email and password are required",
      });
    }

    const { email, password } = validation.data;

    const user = await prisma.user.findUnique({
      where: {
        email: email.toLowerCase(),
      },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (user.status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message: "Your account is not active",
      });
    }

    const passwordValid = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!passwordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const permissions = user.role.permissions.map(
      (rolePermission) =>
        rolePermission.permission.name
    );

    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      console.error("JWT_SECRET is not configured");

      return res.status(500).json({
        success: false,
        message: "Authentication configuration error",
      });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        roleId: user.roleId,
        role: user.role.name,
        permissions,
      },
      jwtSecret,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "1d",
        algorithm: "HS256",
      }
    );

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        lastLoginAt: new Date(),
      },
    });

    /*
     * --------------------------------------------------
     * HTTP-ONLY AUTH COOKIE
     * --------------------------------------------------
     *
     * The JWT is also returned in the response because
     * the existing frontend API services currently use
     * localStorage.
     *
     * The cookie is additionally used by Next.js
     * middleware for direct URL protection.
     */
    res.cookie(
      "nleta_token",
      token,
      getCookieOptions()
    );

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        token,
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          mobile: user.mobile,
          role: user.role.name,
          permissions,
        },
      },
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to process login",
    });
  }
}

export async function getCurrentUser(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: req.user.userId,
      },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User account not found",
      });
    }

    if (user.status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message: "User account is not active",
      });
    }

    const permissions = user.role.permissions.map(
      (rolePermission) =>
        rolePermission.permission.name
    );

    return res.status(200).json({
      success: true,
      message: "Authenticated user",
      data: {
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          mobile: user.mobile,
          role: user.role.name,
          permissions,
        },
      },
    });
  } catch (error) {
    console.error(
      "GET CURRENT USER ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to fetch authenticated user",
    });
  }
}

export async function logout(req, res) {
  try {
    /*
     * Clear the HTTP-only authentication cookie.
     */
    res.clearCookie(
      "nleta_token",
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      }
    );

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("LOGOUT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to process logout",
    });
  }
}