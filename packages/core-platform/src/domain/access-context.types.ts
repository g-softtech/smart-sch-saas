export interface AccessContext {
  user?: any;
  tenant?: any;
  session?: {
    id: string;
    isRevoked: boolean;
    [key: string]: any;
  };
  credential?: {
    trustScore: number;
    isExpired?: boolean;
    [key: string]: any;
  };
  device?: {
    id: string;
    isManaged?: boolean;
    isRevoked?: boolean;
    [key: string]: any;
  };
  ip?: string;
  geo?: {
    country?: string;
    region?: string;
    city?: string;
  };
  resource?: any;
  capability?: any;
  requestTime?: string;
}

export interface AccessDecision {
  authenticated: boolean;
  authorized: boolean;
  boundaryAllowed: boolean;
  decision: 'ALLOW' | 'DENY' | 'STEP_UP_AUTH';
  trustScore: number;
  riskScore: number;
  policyVersion?: string;
  capabilityVersion?: string;
  correlationId?: string;
  explanation: string[];
  requiredActions: string[];
}
