import { Request, Response } from 'express';

export interface GqlContext {
  req: Request;
  res: Response;
}
export interface GqlContextWithUser extends GqlContext {
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
}
