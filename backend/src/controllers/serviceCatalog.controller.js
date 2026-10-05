import { z } from "zod";

import prisma from "../config/prisma.js";

const createServiceSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2)
    .max(50)
    .transform((value) => value.toUpperCase()),

  name: z
    .string()
    .trim()
    .min(2)
    .max(150),

  description: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .nullable(),

  isActive: z.boolean().optional(),
});

const updateServiceSchema = createServiceSchema.partial();

function isAdmin(req) {
  return String(req.user?.role || "").trim().toUpperCase() === "ADMIN";
}

/**
 * GET /api/services
 *
 * Admin: all services
 * BDE/other authenticated users: active services only
 */
export async function getServices(req, res) {
  try {
    const where =
      req.user?.role === "ADMIN"
        ? {}
        : {
            isActive: true,
          };

    const services = await prisma.serviceCatalog.findMany({
      where,
      include: {
        pricingRules: {
          where: {
            isActive: true,
          },
          orderBy: [
            { pricingBasis: "asc" },
            { assetCategory: "asc" },
            { minQuantity: "asc" },
          ],
        },
      },
      orderBy: [
        { isActive: "desc" },
        { name: "asc" },
      ],
    });

    return res.status(200).json({
      success: true,
      message: "Services fetched successfully",
      data: {
        services,
        count: services.length,
      },
    });
  } catch (error) {
    console.error("GET SERVICES ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch services",
    });
  }
}

/**
 * GET /api/services/:id
 */
export async function getServiceById(req, res) {
  try {
    const { id } = req.params;

    const service = await prisma.serviceCatalog.findUnique({
      where: {
        id,
      },
      include: {
        pricingRules: {
          orderBy: [
            { isActive: "desc" },
            { pricingBasis: "asc" },
            { assetCategory: "asc" },
            { minQuantity: "asc" },
          ],
        },
      },
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    if (!isAdmin(req) && !service.isActive) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Service fetched successfully",
      data: {
        service,
      },
    });
  } catch (error) {
    console.error("GET SERVICE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch service",
    });
  }
}

/**
 * POST /api/services
 *
 * Admin only
 */
export async function createService(req, res) {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: "Only Admin can create services",
      });
    }

    const validation = createServiceSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid service data",
        errors: validation.error.flatten(),
      });
    }

    const data = validation.data;

    const existingService = await prisma.serviceCatalog.findUnique({
      where: {
        code: data.code,
      },
    });

    if (existingService) {
      return res.status(409).json({
        success: false,
        message: "A service with this code already exists",
      });
    }

    const service = await prisma.serviceCatalog.create({
      data: {
        code: data.code,
        name: data.name,
        description: data.description || null,
        isActive: data.isActive ?? true,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Service created successfully",
      data: {
        service,
      },
    });
  } catch (error) {
    console.error("CREATE SERVICE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create service",
    });
  }
}

/**
 * PUT /api/services/:id
 *
 * Admin only
 */
export async function updateService(req, res) {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: "Only Admin can update services",
      });
    }

    const { id } = req.params;

    const validation = updateServiceSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid service data",
        errors: validation.error.flatten(),
      });
    }

    const data = validation.data;

    const existingService = await prisma.serviceCatalog.findUnique({
      where: {
        id,
      },
    });

    if (!existingService) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    if (data.code && data.code !== existingService.code) {
      const duplicateCode = await prisma.serviceCatalog.findUnique({
        where: {
          code: data.code,
        },
      });

      if (duplicateCode) {
        return res.status(409).json({
          success: false,
          message: "A service with this code already exists",
        });
      }
    }

    const service = await prisma.serviceCatalog.update({
      where: {
        id,
      },
      data,
    });

    return res.status(200).json({
      success: true,
      message: "Service updated successfully",
      data: {
        service,
      },
    });
  } catch (error) {
    console.error("UPDATE SERVICE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update service",
    });
  }
}

/**
 * PATCH /api/services/:id/status
 *
 * Admin only
 */
export async function updateServiceStatus(req, res) {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: "Only Admin can change service status",
      });
    }

    const { id } = req.params;

    const schema = z.object({
      isActive: z.boolean(),
    });

    const validation = schema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "isActive must be true or false",
      });
    }

    const existingService = await prisma.serviceCatalog.findUnique({
      where: {
        id,
      },
    });

    if (!existingService) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    const service = await prisma.serviceCatalog.update({
      where: {
        id,
      },
      data: {
        isActive: validation.data.isActive,
      },
    });

    return res.status(200).json({
      success: true,
      message: validation.data.isActive
        ? "Service activated successfully"
        : "Service deactivated successfully",
      data: {
        service,
      },
    });
  } catch (error) {
    console.error("UPDATE SERVICE STATUS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update service status",
    });
  }
}