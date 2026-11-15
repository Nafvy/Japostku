import type { Request, Response } from 'express';
import { createApiApp } from '../src/server/app';

const appPromise = createApiApp();

export default async function handler(req: Request, res: Response) {
  const app = await appPromise;
  return app(req, res);
}
