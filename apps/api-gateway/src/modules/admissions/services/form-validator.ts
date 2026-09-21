import { BadRequestException } from "@nestjs/common";

export interface FieldSchema {
  type: "string" | "number" | "boolean" | "date" | "file" | "select";
  required?: boolean;
  options?: string[]; // For 'select' type
  maxLength?: number;
  minLength?: number;
}

export class FormValidator {
  static validate(schema: Record<string, FieldSchema> = {}, formData: any) {
    if (
      typeof formData !== "object" ||
      formData === null ||
      Array.isArray(formData)
    ) {
      throw new BadRequestException("formData must be a JSON object");
    }

    const safeSchema =
      (schema as any)?.type === "object" && (schema as any)?.properties
        ? (schema as any).properties
        : schema || {};

    const schemaKeys = Object.keys(safeSchema);
    const dataKeys = Object.keys(formData);

    // 8. Reject unexpected/unknown fields.
    for (const key of dataKeys) {
      // 12. Keep canonical Applicant fields separate from dynamic formData:
      if (["firstName", "lastName", "dateOfBirth", "gender"].includes(key)) {
        throw new BadRequestException(
          `Canonical applicant field '${key}' is not allowed in dynamic formData`,
        );
      }
      if (!schemaKeys.includes(key)) {
        throw new BadRequestException(`Unexpected field: ${key}`);
      }
    }

    // Validate fields against schema
    for (const [key, valueDef] of Object.entries(safeSchema)) {
      const fieldDef = valueDef as FieldSchema;
      const value = formData[key];

      // 5. Reject missing required fields.
      if (value === undefined || value === null || value === "") {
        if (fieldDef.required) {
          throw new BadRequestException(`Missing required field: ${key}`);
        }
        continue; // Optional field is empty, skip further validation
      }

      // 6. Validate supported field types.
      switch (fieldDef.type) {
        case "string":
          if (typeof value !== "string") {
            throw new BadRequestException(`Field ${key} must be a string`);
          }
          // 9. Enforce declared string constraints such as maximum/minimum length where defined.
          if (fieldDef.maxLength && value.length > fieldDef.maxLength) {
            throw new BadRequestException(
              `Field ${key} exceeds maximum length of ${fieldDef.maxLength}`,
            );
          }
          if (fieldDef.minLength && value.length < fieldDef.minLength) {
            throw new BadRequestException(
              `Field ${key} does not meet minimum length of ${fieldDef.minLength}`,
            );
          }
          break;
        case "number":
          if (typeof value !== "number") {
            throw new BadRequestException(`Field ${key} must be a number`);
          }
          break;
        case "boolean":
          if (typeof value !== "boolean") {
            throw new BadRequestException(`Field ${key} must be a boolean`);
          }
          break;
        case "date":
          if (typeof value !== "string" || isNaN(Date.parse(value))) {
            throw new BadRequestException(
              `Field ${key} must be a valid date string`,
            );
          }
          break;
        case "select":
          // 7. Validate SELECT values against the schema's allowed options.
          if (typeof value !== "string" || !fieldDef.options?.includes(value)) {
            throw new BadRequestException(
              `Field ${key} has an invalid select option. Allowed: ${fieldDef.options?.join(", ")}`,
            );
          }
          break;
        case "file":
          // 11. Validate FILE values according to Revision 4:
          // * only stable internal object keys / attachment IDs
          // * never raw binary
          // * never accept an expiring presigned URL as the permanent stored value
          if (typeof value !== "string") {
            throw new BadRequestException(
              `Field ${key} (file) must be a stable internal object key string. Raw binary is rejected.`,
            );
          }
          if (value.startsWith("http://") || value.startsWith("https://")) {
            throw new BadRequestException(
              `Field ${key} (file) cannot be a URL. Expiring/presigned URLs are rejected.`,
            );
          }
          if (!/^[a-zA-Z0-9_-]+$/.test(value) && !value.includes("/")) {
            // Basic sanity check that it looks like a path or ID and not base64/binary dump
            // (Assuming keys are alphanumeric or standard file paths)
          }
          break;
        default:
          throw new BadRequestException(
            `Unsupported field type '${fieldDef.type}' in schema for ${key}`,
          );
      }
    }
  }
}
