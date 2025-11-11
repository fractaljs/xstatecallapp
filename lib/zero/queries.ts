import { syncedQueryWithContext, createBuilder } from '@rocicorp/zero';
import { z } from 'zod';



export type QueryContext = {
  userID: string;
};