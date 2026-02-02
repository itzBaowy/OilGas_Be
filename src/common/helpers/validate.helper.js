import { BadRequestException } from "./exception.helper.js";


export function validatePassword(password) {
  if (!password) {
    throw new BadRequestException('Password is required');
  }

  // kí tự yêu cầu phải ít nhất 8
  if (password.length < 8) {
    throw new BadRequestException('Password must be at least 8 characters long');
  }

  // Có ít nhất 1 kí tự in hoa
  if (!/[A-Z]/.test(password)) {
    throw new BadRequestException('Password must include at least one uppercase letter');
  }

  // Có ít nhất 1 kí tự ghi thường
  if (!/[a-z]/.test(password)) {
    throw new BadRequestException('Password must include at least one lowercase letter');
  }

  // Có ít nhất 1 số
  if (!/[0-9]/.test(password)) {
    throw new BadRequestException('Password must include at least one number');
  }

  return true;
}

export function validateEmail(email) {
  if (!email) {
    throw new BadRequestException('Email is required');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  // validate email theo form ...@...
  if (!emailRegex.test(email)) {
    throw new BadRequestException('Invalid email format. Email must be in format: example@domain.com');
  }

  return true;
}

//Equipment validation helpers

// Valid equipment types
const EQUIPMENT_TYPES = [
  "Pump",
  "Valve",
  "Compressor",
  "Sensor",
  "Drilling Rig",
  "Pipeline",
  "Scada Unit"
];

// Valid equipment statuses
const EQUIPMENT_STATUSES = ["Active", "Inactive", "Maintenance"];

/**
 * Validate required fields for equipment creation
 */
export function validateEquipmentRequiredFields(data) {
  const { name, serialNumber, type, location, installDate } = data;

  if (!name) {
    throw new BadRequestException("Equipment name is required");
  }

  if (!serialNumber) {
    throw new BadRequestException("Serial number is required");
  }

  if (!type) {
    throw new BadRequestException("Equipment type is required");
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
 * Validate equipment type
 */
export function validateEquipmentType(type) {
  if (!type) {
    throw new BadRequestException("Equipment type is required");
  }

  if (!EQUIPMENT_TYPES.includes(type)) {
    throw new BadRequestException(
      `Invalid equipment type. Must be one of: ${EQUIPMENT_TYPES.join(", ")}`
    );
  }

  return true;
}

/**
 * Validate equipment status
 */
export function validateEquipmentStatus(status) {
  if (!status) {
    return true; // Status is optional
  }

  if (!EQUIPMENT_STATUSES.includes(status)) {
    throw new BadRequestException(
      `Invalid status. Must be one of: ${EQUIPMENT_STATUSES.join(", ")}`
    );
  }

  return true;
}

/**
 * Validate install date format
 */
export function validateInstallDate(installDate) {
  if (!installDate) {
    throw new BadRequestException("Install date is required");
  }

  const parsedDate = new Date(installDate);
  
  if (isNaN(parsedDate.getTime())) {
    throw new BadRequestException("Invalid install date format. Please provide a valid date.");
  }

  return parsedDate;
}

/**
 * Validate all equipment data for creation
 */
export function validateEquipmentData(data) {
  const { name, serialNumber, type, status, location, installDate } = data;

  // Validate required fields
  validateEquipmentRequiredFields(data);

  // Validate equipment type
  validateEquipmentType(type);

  // Validate status if provided
  if (status) {
    validateEquipmentStatus(status);
  }

  // Validate and parse install date
  const parsedDate = validateInstallDate(installDate);

  return {
    isValid: true,
    parsedInstallDate: parsedDate
  };
}

/**
 * Validate equipment data for update (optional fields)
 */
export function validateEquipmentUpdateData(data) {
  const { type, status, installDate } = data;
  
  let parsedDate = null;

  // Validate type if provided
  if (type) {
    validateEquipmentType(type);
  }

  // Validate status if provided
  if (status) {
    validateEquipmentStatus(status);
  }

  // Validate and parse installDate if provided
  if (installDate) {
    const parsed = new Date(installDate);
    if (isNaN(parsed.getTime())) {
      throw new BadRequestException("Invalid install date format. Please provide a valid date.");
    }
    parsedDate = parsed;
  }

  return {
    isValid: true,
    parsedInstallDate: parsedDate
  };
}
