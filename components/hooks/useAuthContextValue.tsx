
import { QueryContext } from '../../lib/zero/queries';
import { useAuth } from '../providers/AuthProvider';

export function useAuthContextValues(): QueryContext {
  const { user } = useAuth();
  
  if (!user) {
    throw new Error('User must be logged in to create query context');
  }
  
  return { userID: user.id };
}