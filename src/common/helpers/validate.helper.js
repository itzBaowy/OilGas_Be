import { BadRequestException } from "./exception.helper.js";

export function validatePassword(password) {
  if (!password) {
    throw new BadRequestException("Password is required");
  }

  // kí tự yêu cầu phải ít nhất 8
  if (password.length < 8) {
    throw new BadRequestException(
      "Password must be at least 8 characters long",
    );
  }

  // Có ít nhất 1 kí tự in hoa
  if (!/[A-Z]/.test(password)) {
    throw new BadRequestException(
      "Password must include at least one uppercase letter",
    );
  }

  // Có ít nhất 1 kí tự ghi thường
  if (!/[a-z]/.test(password)) {
    throw new BadRequestException(
      "Password must include at least one lowercase letter",
    );
  }

  // Có ít nhất 1 số
  if (!/[0-9]/.test(password)) {
    throw new BadRequestException("Password must include at least one number");
  }

  return true;
}

export function validateEmail(email) {
  if (!email) {
    throw new BadRequestException("Email is required");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  // validate email theo form ...@...
  if (!emailRegex.test(email)) {
    throw new BadRequestException(
      "Invalid email format. Email must be in format: example@domain.com",
    );
  }

  return true;
}

//Equipment validation helpers

// Valid equipment types - Predefined dropdown values
const EQUIPMENT_TYPES = ["Pump", "Valve", "Compressor", "Sensor", "Oil Pump"];

// Valid equipment statuses
const EQUIPMENT_STATUSES = ["Active", "Inactive", "Maintenance"];

/**
 * Validate required fields for equipment creation
 */
export function validateEquipmentRequiredFields(data) {
  const { name, serialNumber, type, model, location, installDate, manufacturer } = data;

  if (!name) {
    throw new BadRequestException("Equipment name is required");
  }

  if (!serialNumber) {
    throw new BadRequestException("Serial number is required");
  }

  if (!type) {
    throw new BadRequestException("Equipment type is required");
  }

  if (!model) {
    throw new BadRequestException("Equipment model is required");
  }

  if (!manufacturer) {
    throw new BadRequestException("Manufacturer is required");
  }

  if (!location) {
    throw new BadRequestException("Location is required");
  }

  if (!installDate) {
    throw new BadRequestException("Install date is required");
  }

  return true;
}

/**
 * Validate and normalize equipment type
 * Returns one of: Pump, Valve, Compressor, Sensor, or Other
 */
export function validateEquipmentType(type) {
  if (!type) {
    throw new BadRequestException("Equipment type is required");
  }
  if (typeof type !== "string" || type.trim().length === 0) {
    throw new BadRequestException("Equipment type must be a non-empty string");
  }
  
  // Normalize type - check if it matches predefined types (case-insensitive)
  const normalizedType = type.trim();
  const matchedType = EQUIPMENT_TYPES.find(
    (t) => t.toLowerCase() === normalizedType.toLowerCase()
  );
  
  // Return matched type or "Other" if not found
  return matchedType || "Other";
}

export function validateEquipmentModel(model) {
  if (!model) {
    throw new BadRequestException("Equipment model is required");
  }
  if (typeof model !== "string" || model.trim().length === 0) {
    throw new BadRequestException("Equipment model must be a non-empty string");
  }
  return true;
}

// Validate equipment status
export function validateEquipmentStatus(status) {
  if (!status) {
    return true; // Status is optional
  }

  if (!EQUIPMENT_STATUSES.includes(status)) {
    throw new BadRequestException(
      `Invalid status. Must be one of: ${EQUIPMENT_STATUSES.join(", ")}`,
    );
  }

  return true;
}

//Validate install date format
export function validateInstallDate(installDate) {
  if (!installDate) {
    throw new BadRequestException("Install date is required");
  }

  const parsedDate = new Date(installDate);

  if (isNaN(parsedDate.getTime())) {
    throw new BadRequestException(
      "Invalid install date format. Please provide a valid date.",
    );
  }

  if (parsedDate > new Date()) {
    throw new BadRequestException(
      "Install date cannot be in the future",
    );
  }

  return parsedDate;
}

/**
 * Validate all equipment data for creation
 */
export function validateEquipmentData(data) {
  const { name, serialNumber, type, model, status, location, installDate } =
    data;

  // Validate required fields
  validateEquipmentRequiredFields(data);

  // Validate and normalize equipment type
  const normalizedType = validateEquipmentType(type);

  // Validate equipment model
  validateEquipmentModel(model);

  // Validate status if provided
  if (status) {
    validateEquipmentStatus(status);
  }

  // Validate and parse install date
  const parsedDate = validateInstallDate(installDate);

  return {
    isValid: true,
    parsedInstallDate: parsedDate,
    normalizedType: normalizedType,
  };
}

/**
 * Validate equipment data for update (optional fields)
 */
export function validateEquipmentUpdateData(data) {
  const { type, model, status, installDate } = data;

  let parsedDate = null;
  let normalizedType = null;

  // Validate and normalize type if provided
  if (type) {
    normalizedType = validateEquipmentType(type);
  }

  // Validate status if provided
  if (status) {
    validateEquipmentStatus(status);
  }

  if (model) {
    validateEquipmentModel(model);
  }

  // Validate and parse installDate if provided
  if (installDate) {
    const parsed = new Date(installDate);
    if (isNaN(parsed.getTime())) {
      throw new BadRequestException(
        "Invalid install date format. Please provide a valid date.",
      );
    }
    parsedDate = parsed;
  }

  return {
    isValid: true,
    parsedInstallDate: parsedDate,
    normalizedType: normalizedType,
  };
}

// ==================== INSTRUMENT VALIDATION ====================

// Valid instrument types
const INSTRUMENT_TYPES = [
  "Offshore Platform",
  "Onshore Rig",
  "FPSO",
  "Jack-up Rig",
  "Semi-submersible",
];

// Valid instrument statuses
const INSTRUMENT_STATUSES = ["Active", "Inactive", "Maintenance", "Decommissioned"];

/**
 * Get instrument types array with id, value, label format for dropdown
 */
export function getInstrumentTypes() {
  return INSTRUMENT_TYPES.map((type, index) => ({
    id: `type-${index + 1}`,
    value: type,
    label: type,
  }));
}

/**
 * Get instrument statuses array with id, value, label format for dropdown
 */
export function getInstrumentStatuses() {
  return INSTRUMENT_STATUSES.map((status, index) => ({
    id: `status-${index + 1}`,
    value: status,
    label: status,
  }));
}

/**
 * Validate instrument type
 */
export function validateInstrumentType(type) {
  if (!type) {
    throw new BadRequestException("Instrument type is required");
  }

  if (!INSTRUMENT_TYPES.includes(type)) {
    throw new BadRequestException(
      `Invalid type. Must be one of: ${INSTRUMENT_TYPES.join(", ")}`
    );
  }

  return true;
}

/**
 * Validate instrument status
 */
export function validateInstrumentStatus(status) {
  if (!status) {
    return true; // Status is optional, defaults to "Active"
  }

  if (!INSTRUMENT_STATUSES.includes(status)) {
    throw new BadRequestException(
      `Invalid status. Must be one of: ${INSTRUMENT_STATUSES.join(", ")}`
    );
  }

  return true;
}

/**
 * Validate required fields for instrument creation
 */
export function validateInstrumentRequiredFields(data) {
  const { name, type, location } = data;

  if (!name) {
    throw new BadRequestException("Instrument name is required");
  }

  if (!type) {
    throw new BadRequestException("Instrument type is required");
  }

  if (!location) {
    throw new BadRequestException("Location is required");
  }

  return true;
}

/**
 * Validate all instrument data for creation
 */
export function validateInstrumentData(data) {
  const { status, installDate } = data;

  // Validate required fields
  validateInstrumentRequiredFields(data);

  // Validate type
  validateInstrumentType(data.type);

  // Validate status if provided
  if (status) {
    validateInstrumentStatus(status);
  }

  // Parse install date if provided
  let parsedInstallDate = null;
  if (installDate) {
    parsedInstallDate = new Date(installDate);
    if (isNaN(parsedInstallDate.getTime())) {
      throw new BadRequestException(
        "Invalid install date format. Please provide a valid date."
      );
    }
  }

  return {
    isValid: true,
    parsedInstallDate,
  };
}

/**
 * Validate instrument data for update (optional fields)
 */
export function validateInstrumentUpdateData(data) {
  const { type, status, installDate, lastMaintenanceDate, nextMaintenanceDate } = data;

  // Validate type if provided
  if (type) {
    validateInstrumentType(type);
  }

  // Validate status if provided
  if (status) {
    validateInstrumentStatus(status);
  }

  // Parse dates if provided
  let parsedInstallDate = null;
  let parsedLastMaintenanceDate = null;
  let parsedNextMaintenanceDate = null;

  if (installDate) {
    parsedInstallDate = new Date(installDate);
    if (isNaN(parsedInstallDate.getTime())) {
      throw new BadRequestException("Invalid install date format.");
    }
  }

  if (lastMaintenanceDate) {
    parsedLastMaintenanceDate = new Date(lastMaintenanceDate);
    if (isNaN(parsedLastMaintenanceDate.getTime())) {
      throw new BadRequestException("Invalid last maintenance date format.");
    }
  }

  if (nextMaintenanceDate) {
    parsedNextMaintenanceDate = new Date(nextMaintenanceDate);
    if (isNaN(parsedNextMaintenanceDate.getTime())) {
      throw new BadRequestException("Invalid next maintenance date format.");
    }
  }

  return {
    isValid: true,
    parsedInstallDate,
    parsedLastMaintenanceDate,
    parsedNextMaintenanceDate,
  };
}
