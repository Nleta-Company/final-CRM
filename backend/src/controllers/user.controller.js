import bcrypt from "bcrypt";
import { z } from "zod";

import prisma from "../config/prisma.js";

const createUserSchema = z.object({
    firstName: z.string().trim().min(2, "First name is required"),
    lastName: z.string().trim().optional(),
    email: z.string().trim().email("Valid email is required"),
    mobile: z.string().trim().optional(),
    password: z.string().min(8, "Password must be at least 8 characters"),

    // Only Admin-created BDE/Sales accounts
    role: z.literal("BDE/Sales"),
});

export async function createUser(req, res) {
    try {
        const validation = createUserSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: "Invalid user data",
                errors: validation.error.flatten(),
            });
        }

        // Only Admin can create BDE/Sales accounts
        if (
            !req.user?.role ||
            req.user.role.trim().toUpperCase() !== "ADMIN"
        ) {
            return res.status(403).json({
                success: false,
                message: "Only Admin can create BDE/Sales accounts",
            });
        }

        const {
            firstName,
            lastName,
            email,
            mobile,
            password,
            role,
        } = validation.data;

        const normalizedEmail = email.toLowerCase();

        const existingUser = await prisma.user.findUnique({
            where: {
                email: normalizedEmail,
            },
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "A user with this email already exists",
            });
        }

        const roleRecord = await prisma.role.findUnique({
            where: {
                name: role,
            },
        });

        if (!roleRecord) {
            return res.status(400).json({
                success: false,
                message: "Invalid user role",
            });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const user = await prisma.user.create({
            data: {
                firstName,
                lastName: lastName || null,
                email: normalizedEmail,
                mobile: mobile || null,
                passwordHash,
                status: "ACTIVE",
                roleId: roleRecord.id,
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                mobile: true,
                status: true,
                createdAt: true,
                role: {
                    select: {
                        name: true,
                    },
                },
            },
        });

        return res.status(201).json({
            success: true,
            message: "User created successfully",
            data: {
                user,
            },
        });
    } catch (error) {
        console.error("CREATE USER ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to create user",
        });
    }
}

export async function getUsers(req, res) {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                mobile: true,
                status: true,
                lastLoginAt: true,
                createdAt: true,
                role: {
                    select: {
                        name: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        return res.status(200).json({
            success: true,
            message: "Users fetched successfully",
            data: {
                users,
                total: users.length,
            },
        });
    } catch (error) {
        console.error("GET USERS ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to fetch users",
        });
    }
}

const updateUserSchema = z.object({
    firstName: z.string().trim().min(2).optional(),
    lastName: z.string().trim().min(1).optional(),
    email: z.string().trim().email().optional(),
    mobile: z.string().trim().optional(),
    role: z.enum(["BDE/Sales", "Client"]).optional(),
});

export async function updateUser(req, res) {
    try {
        const userId = req.params.id;

        const validation = updateUserSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: "Invalid user data",
                errors: validation.error.flatten(),
            });
        }

        const existingUser = await prisma.user.findUnique({
            where: {
                id: userId,
            },
            include: {
                role: true,
            },
        });

        if (!existingUser) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        const data = validation.data;

        // Admin role cannot be changed through this API
        if (
            existingUser.role.name === "Admin" &&
            data.role
        ) {
            return res.status(400).json({
                success: false,
                message: "Admin role cannot be changed",
            });
        }

        // Prevent email duplication
        if (data.email) {
            const normalizedEmail = data.email.toLowerCase();

            const emailUser = await prisma.user.findFirst({
                where: {
                    email: normalizedEmail,
                    NOT: {
                        id: userId,
                    },
                },
            });

            if (emailUser) {
                return res.status(409).json({
                    success: false,
                    message: "A user with this email already exists",
                });
            }

            data.email = normalizedEmail;
        }

        // Convert role name to roleId
        let roleId;

        if (data.role) {
            const roleRecord = await prisma.role.findUnique({
                where: {
                    name: data.role,
                },
            });

            if (!roleRecord) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid user role",
                });
            }

            roleId = roleRecord.id;
        }

        const updateData = {
            ...(data.firstName !== undefined && {
                firstName: data.firstName,
            }),

            ...(data.lastName !== undefined && {
                lastName: data.lastName,
            }),

            ...(data.email !== undefined && {
                email: data.email,
            }),

            ...(data.mobile !== undefined && {
                mobile: data.mobile,
            }),

            ...(roleId && {
                roleId,
            }),
        };

        const user = await prisma.user.update({
            where: {
                id: userId,
            },
            data: updateData,
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                mobile: true,
                status: true,
                lastLoginAt: true,
                createdAt: true,
                role: {
                    select: {
                        name: true,
                    },
                },
            },
        });

        return res.status(200).json({
            success: true,
            message: "User updated successfully",
            data: {
                user,
            },
        });
    } catch (error) {
        console.error("UPDATE USER ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to update user",
        });
    }
}


const updateUserStatusSchema = z.object({
    status: z.enum([
        "ACTIVE",
        "INACTIVE",
        "SUSPENDED",
    ]),
});

export async function updateUserStatus(req, res) {
    try {
        const userId = req.params.id;

        // Admin cannot deactivate/suspend their own account
        if (userId === req.user.userId) {
            return res.status(400).json({
                success: false,
                message: "You cannot change your own account status",
            });
        }

        const validation = updateUserStatusSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: "Invalid status",
                errors: validation.error.flatten(),
            });
        }

        const existingUser = await prisma.user.findUnique({
            where: {
                id: userId,
            },
        });

        if (!existingUser) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        const user = await prisma.user.update({
            where: {
                id: userId,
            },
            data: {
                status: validation.data.status,
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                mobile: true,
                status: true,
                lastLoginAt: true,
                createdAt: true,
                role: {
                    select: {
                        name: true,
                    },
                },
            },
        });

        return res.status(200).json({
            success: true,
            message: "User status updated successfully",
            data: {
                user,
            },
        });
    } catch (error) {
        console.error("UPDATE USER STATUS ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to update user status",
        });
    }
}

const resetPasswordSchema = z.object({
    newPassword: z.string().min(8),
});

export async function resetUserPassword(req, res) {
    try {
        const userId = req.params.id;

        const validation = resetPasswordSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: "New password must be at least 8 characters",
            });
        }

        const existingUser = await prisma.user.findUnique({
            where: {
                id: userId,
            },
            include: {
                role: true,
            },
        });

        if (!existingUser) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        // Admin password cannot be reset through this API
        if (existingUser.role.name === "Admin") {
            return res.status(400).json({
                success: false,
                message: "Admin password cannot be reset through this API",
            });
        }

        const passwordHash = await bcrypt.hash(
            validation.data.newPassword,
            12
        );

        await prisma.user.update({
            where: {
                id: userId,
            },
            data: {
                passwordHash,
            },
        });

        return res.status(200).json({
            success: true,
            message: "User password reset successfully",
        });
    } catch (error) {
        console.error("RESET USER PASSWORD ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to reset user password",
        });
    }
}