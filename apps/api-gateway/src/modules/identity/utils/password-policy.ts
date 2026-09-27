import { BadRequestException } from "@nestjs/common";

export function validatePasswordPolicy(password: string): void {
  if (!password || typeof password !== "string") {
    throw new BadRequestException("Password is required.");
  }
  if (password.length < 8) {
    throw new BadRequestException("Password must be at least 8 characters long.");
  }
  if (password.length > 64) {
    throw new BadRequestException("Password cannot exceed 64 characters.");
  }
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  if (!hasLetter || !hasNumber) {
    throw new BadRequestException("Password must contain at least one letter and one number.");
  }
}
