export interface PolicyContext {
  tenantId: string;
  userId: string;
  resource?: any;
  [key: string]: any;
}

export interface ResourceOwnershipPolicy {
  canAccess(context: PolicyContext, resource: any): boolean;
}
