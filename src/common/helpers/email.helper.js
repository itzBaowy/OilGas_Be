import { BadRequestException } from "./exception.helper.js";


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
