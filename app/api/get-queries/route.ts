import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, createAuthResponse } from '@/lib/auth'
import { Pool } from 'pg';
import { PushProcessor, handleGetQueriesRequest } from '@rocicorp/zero/server';
import { zeroNodePg } from '@rocicorp/zero/server/adapters/pg';
import { schema } from '../../../prisma/generated/zero/schema'
import { withValidation, ReadonlyJSONValue } from '@rocicorp/zero';
import * as queries from '../../../lib/zero/queries';
export type AuthData  = {
  sub: string;
  email: string;
}


// Build a map of queries with validation by name
const validated = Object.fromEntries(
  Object.values(queries).map((q: any) => [q.queryName, withValidation(q)])
);

function getQuery(
  authData: AuthData | undefined,
  name: string,
  args: readonly ReadonlyJSONValue[]
) {
  const q = validated[name];
  if (!q) {
    throw new Error(`No such query: ${name}`);
  }
  
  // For queries with context, pass authData as context
  const contextualQueries = ['channelConversations', 'conversationMessages'];
  
  if (contextualQueries.includes(name)) {
    if (!authData) {
      throw new Error('Authentication required for this query');
    }
    // Pass authData as context (first parameter)
    const context = { userID: authData.sub };
    return {
      query: q(context, ...args),
    };
  } else {
    return {
      query: q(null as any, ...args),
    };
  }
}

export function createPushProcessor() {
  const pool = new Pool({
    connectionString: process.env['ZERO_UPSTREAM_DB'] as string,
  });

  return new PushProcessor(
    zeroNodePg(schema, pool)
  );
}

const handleGetQueriesController = async (request: Request, authData: AuthData) => {
try {
    const result = await handleGetQueriesRequest(
      (name: string, args: readonly ReadonlyJSONValue[]) => getQuery(authData, name, args),
      schema,
      request
    );
    return result;
  } catch (error) {
    console.error('Get queries request failed:', error);
    throw error;
  }

}


export async function POST(request: NextRequest) {
  
  const payload = await authenticateRequest(request)
  try {
        
    const url = request.url
    const headers = new Headers()
    
    request.headers.forEach((value, key) => {
      headers.set(key, value)
    })

    const body = await request.text()

    const webRequest = new Request(url, {
      method: 'POST',
      headers,
      body: body,
    })


    const authData = {
      sub: payload.sub,
      email: payload.email
    }
    const result = await handleGetQueriesController(webRequest, authData)

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication failed') {
      return createAuthResponse('Authentication required')
    }
    
    console.error('Get queries error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
