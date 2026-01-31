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

  if (password.length < 12) {
    console.warn('Password length is less than 12 characters. Consider using a longer password for better security.');
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
