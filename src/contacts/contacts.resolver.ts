import { Args, Query, Resolver } from '@nestjs/graphql';
import { ContactsService } from './contacts.service';
import { ContactType } from './types/contact.type';

@Resolver(() => ContactType)
export class ContactsResolver {
  constructor(private contactsService: ContactsService) {}

  @Query(() => [ContactType], { name: 'contacts' })
  async getContacts() {
    return this.contactsService.findAll();
  }

  @Query(() => ContactType, { name: 'contact', nullable: true })
  async getContact(@Args('id') id: string) {
    return this.contactsService.findOne(id);
  }
}
