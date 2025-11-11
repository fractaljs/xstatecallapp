import { ReactNode, useMemo } from 'react';
import { ZeroProvider as ZeroReactProvider } from '@rocicorp/zero/react';
import { schema } from '@/prisma/generated/zero/schema';
import { useAuth } from './AuthProvider';



interface ZeroProviderProps {
  children: ReactNode;
}

export function ZeroProvider({ children }: ZeroProviderProps) {
  const { user, token } = useAuth();

  const zeroOptions = useMemo(() => {
    if (!user || !token) {
      return null;
    }

    // // Decode JWT to get auth data for mutators
    // const authData = {
    //   sub: user.id,
    //   email: user.email,
    //   name: user.name,
    //   picture: user.picture,
    // };

    return {
      userID: user.id,
      auth: token, // Raw JWT token
      server: 'http://localhost:6001',
      schema,

      context: { userID: user.id }, // Context for syncedQueryWithContext
    };
  }, [user, token]);

  if (!zeroOptions) {
    return <>{children}</>;
  }

  return (
    <ZeroReactProvider {...zeroOptions}>
      {children}
    </ZeroReactProvider>
  );
}