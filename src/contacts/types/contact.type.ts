import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ContactType {
  @Field()
  id: string;

  @Field({ nullable: true })
  firstName?: string;

  @Field({ nullable: true })
  lastName?: string;

  @Field({ nullable: true })
  position?: string;

  @Field({ nullable: true })
  email?: string;

  @Field({ nullable: true })
  phone?: string;

  @Field(() => String, { nullable: true })
  socialLinks?: string;
}
