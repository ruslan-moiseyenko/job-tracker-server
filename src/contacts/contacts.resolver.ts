import { Args, Query, Resolver } from '@nestjs/graphql';
import { ContactsService } from './contacts.service';
import { ContactType } from './types/contact.type';

@Resolver(() => ContactType)
export class ContactsResolver {
  constructor(private contactsService: ContactsService) {}

  @Query(() => [ContactType], {
    name: 'getAllContacts',
    description: '👥 Contacts: Get all contacts',
  })
  async getAllContacts() {
    return this.contactsService.findAll();
  }

  @Query(() => ContactType, {
    name: 'getContactById',
    nullable: true,
    description: '👥 Contacts: Get a specific contact by ID',
  })
  async getContactById(@Args('id') id: string) {
    return this.contactsService.findOne(id);
  }
}
