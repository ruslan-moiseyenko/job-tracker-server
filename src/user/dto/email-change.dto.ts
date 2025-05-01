import { Field, InputType } from '@nestjs/graphql';
import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';
import { ValidationConstants } from 'src/common/constants/validation.constants';

@InputType({ description: 'Input for requesting an email change' })
export class RequestEmailChangeInput {
  @Field({ description: 'New email address to change to' })
  @IsEmail()
  @IsString()
  newEmail: string;
}

@InputType({ description: 'Input for verifying an email change request' })
export class VerifyEmailChangeInput {
  @Field({
    description: 'Verification code sent to the new email address (6 digits)',
  })
  @IsString()
  @IsNotEmpty()
  @Length(
    ValidationConstants.VERIFICATION_CODE_LENGTH,
    ValidationConstants.VERIFICATION_CODE_LENGTH,
  )
  verificationCode: string;
}
