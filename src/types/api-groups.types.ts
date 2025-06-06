export interface APIGroup {
  id: string;
  name: string;
  emoji: string;
  description: string;
}

export const API_GROUPS: APIGroup[] = [
  {
    id: 'authentication',
    name: 'Authentication',
    emoji: '🔐',
    description: 'User authentication and authorization operations',
  },
  {
    id: 'user_profile',
    name: 'User Profile',
    emoji: '👤',
    description: 'User profile management operations',
  },
  {
    id: 'job_applications',
    name: 'Job Applications',
    emoji: '🔍',
    description: 'Job application tracking and management',
  },
  {
    id: 'job_searches',
    name: 'Job Searches',
    emoji: '🔎',
    description: 'Job search management and organization',
  },
  {
    id: 'application_stages',
    name: 'Application Stages',
    emoji: '📊',
    description: 'Application stage workflow management',
  },
  {
    id: 'companies',
    name: 'Companies',
    emoji: '🏢',
    description: 'Company information management',
  },
  {
    id: 'contacts',
    name: 'Contacts',
    emoji: '👥',
    description: 'Professional contacts management',
  },
];
