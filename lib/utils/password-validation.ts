export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  requirements: {
    minLength: boolean;
    hasUppercase: boolean;
    hasNumber: boolean;
    hasAlphabet: boolean;
  };
}

export interface PasswordValidationRules {
  minLength: number;
  requireUppercase: boolean;
  requireNumber: boolean;
  requireAlphabet: boolean;
}

const DEFAULT_RULES: PasswordValidationRules = {
  minLength: 8,
  requireUppercase: true,
  requireNumber: true,
  requireAlphabet: true,
};

export function validatePassword(
  password: string,
  rules: PasswordValidationRules = DEFAULT_RULES
): PasswordValidationResult {
  const errors: string[] = [];

  if (!password) {
    return {
      isValid: false,
      errors: ['Password is required'],
      requirements: {
        minLength: false,
        hasUppercase: false,
        hasNumber: false,
        hasAlphabet: false,
      },
    };
  }

  const minLengthValid = password.length >= rules.minLength;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasAlphabet = /[a-zA-Z]/.test(password);

  if (!minLengthValid) {
    errors.push(`Password must be at least ${rules.minLength} characters`);
  }

  if (rules.requireUppercase && !hasUppercase) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (rules.requireNumber && !hasNumber) {
    errors.push('Password must contain at least one number');
  }

  if (rules.requireAlphabet && !hasAlphabet) {
    errors.push('Password must contain at least one letter');
  }

  return {
    isValid: errors.length === 0,
    errors,
    requirements: {
      minLength: minLengthValid,
      hasUppercase: rules.requireUppercase ? hasUppercase : true,
      hasNumber: rules.requireNumber ? hasNumber : true,
      hasAlphabet: rules.requireAlphabet ? hasAlphabet : true,
    },
  };
}

export function getPasswordErrorMessage(errors: string[]): string {
  if (errors.length === 0) return '';
  return errors[0];
}
