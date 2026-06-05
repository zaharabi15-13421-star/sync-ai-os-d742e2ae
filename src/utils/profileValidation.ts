import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";

export interface ValidationErrors {
  [field: string]: string;
}

const POSTAL_PATTERNS: Record<string, RegExp> = {
  BD: /^\d{4}$/,
  US: /^\d{5}(-\d{4})?$/,
  GB: /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i,
  CA: /^[A-Z]\d[A-Z] ?\d[A-Z]\d$/i,
  AU: /^\d{4}$/,
  IN: /^\d{6}$/,
  DE: /^\d{5}$/,
  FR: /^\d{5}$/,
  JP: /^\d{3}-?\d{4}$/,
};

export function validateProfile(data: any): ValidationErrors {
  const errors: ValidationErrors = {};

  if (!data.company_name || String(data.company_name).trim().length < 2) {
    errors.company_name = "Company name must be at least 2 characters.";
  }

  if (data.website_url && !/^https?:\/\/.+\..+/.test(data.website_url)) {
    errors.website_url = "Please enter a valid URL starting with http:// or https://";
  }

  if (data.website_url && data.website_url.length > 500) {
    errors.website_url = "URL is too long.";
  }

  if (data.phone_number) {
    try {
      const parsed = parsePhoneNumberFromString(
        (data.phone_country_dial || "") + data.phone_number,
        data.phone_country_code as CountryCode,
      );
      if (!parsed || !parsed.isValid()) {
        errors.phone_number = `Invalid phone number for ${data.phone_country_code || "selected country"}.`;
      }
    } catch {
      errors.phone_number = "Invalid phone number format.";
    }
  }

  if (data.business_goal && data.business_goal.length > 300) {
    errors.business_goal = "Business goal must be 300 characters or fewer.";
  }

  if (data.slogan && data.slogan.length > 160) {
    errors.slogan = "Slogan must be 160 characters or fewer.";
  }

  if (data.postal_code && data.country_code) {
    const pattern = POSTAL_PATTERNS[data.country_code];
    if (pattern && !pattern.test(data.postal_code)) {
      errors.postal_code = `Invalid postal code format for ${data.country}.`;
    }
  }

  return errors;
}
