import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { CompanyInput } from '../dto/company-input.dto';

/**
 * Custom validator to ensure CompanyInput has either existingCompanyId or newCompany, but not both
 */
export function IsValidCompanyInput(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidCompanyInput',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments): boolean {
          const companyInput = args.object as CompanyInput;

          const hasExistingId = Boolean(
            companyInput.existingCompanyId &&
              companyInput.existingCompanyId.trim().length > 0,
          );
          const hasNewCompany = Boolean(
            companyInput.newCompany &&
              companyInput.newCompany.name &&
              companyInput.newCompany.name.trim().length > 0,
          );

          // Exactly one should be provided
          return (
            (hasExistingId && !hasNewCompany) ||
            (!hasExistingId && hasNewCompany)
          );
        },
        defaultMessage(_args: ValidationArguments): string {
          return 'Either existingCompanyId or newCompany must be provided, but not both';
        },
      },
    });
  };
}
