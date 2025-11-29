import { AuditLog } from "../models/auditLog.js";

/**
 * Create audit log entry
 */
export const createAuditLog = async (adminId, adminName, action, entityType, entityId, options = {}) => {
  try {
    const auditLog = await AuditLog.create({
      adminId,
      adminName,
      action,
      entityType,
      entityId: entityId || null,
      entityName: options.entityName || null,
      details: options.details || {},
      ipAddress: options.ipAddress || null,
      userAgent: options.userAgent || null
    });
    return auditLog;
  } catch (error) {
    console.error("Failed to create audit log:", error);
    // Don't throw error - audit logging should not break main functionality
    return null;
  }
};

/**
 * Get audit logs with filters
 */
export const getAuditLogs = async (options = {}) => {
  try {
    const { adminId, action, entityType, entityId, startDate, endDate, page = 1, limit = 50 } = options;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = {};
    if (adminId) filter.adminId = adminId;
    if (action) filter.action = action;
    if (entityType) filter.entityType = entityType;
    if (entityId) filter.entityId = entityId;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const logs = await AuditLog.find(filter)
      .populate("adminId", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await AuditLog.countDocuments(filter);

    return {
      logs,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    };
  } catch (error) {
    console.error("Failed to get audit logs:", error);
    throw error;
  }
};

