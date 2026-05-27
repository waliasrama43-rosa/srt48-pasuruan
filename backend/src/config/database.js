const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Create Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Tenant Context Management
// Stores tenant_id for current request/session
const tenantContext = {
  _tenantId: null,

  set(tenantId) {
    this._tenantId = tenantId;
  },

  get() {
    return this._tenantId;
  },

  clear() {
    this._tenantId = null;
  }
};

/**
 * Middleware to extract tenant_id from request
 * Usage: Call this middleware before any database operations
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
function setTenantContext(req, res, next) {
  try {
    // Extract tenant_id from:
    // 1. Query parameter: ?tenant_id=xxx
    // 2. Request body: { tenant_id: 'xxx' }
    // 3. JWT payload (if authenticated)
    
    let tenantId = req.query.tenant_id || 
                   req.body.tenant_id || 
                   (req.user && req.user.tenant_id);

    if (!tenantId) {
      // For now, use default from env or first tenant
      tenantId = process.env.DEFAULT_TENANT_ID;
    }

    tenantContext.set(tenantId);
    next();
  } catch (error) {
    res.status(400).json({
      status: 'error',
      pesan: 'Invalid tenant context',
      error: error.message
    });
  }
}

/**
 * Get current tenant_id from context
 * @returns {string|null} Current tenant ID
 */
function getTenantId() {
  return tenantContext.get();
}

/**
 * Execute query with automatic tenant filtering
 * Adds tenant_id filter if not already present
 * 
 * @param {Object} queryBuilder - Supabase query builder
 * @returns {Object} Modified query builder with tenant filter
 */
function withTenantFilter(queryBuilder) {
  const tenantId = getTenantId();
  
  if (tenantId && queryBuilder) {
    // Add tenant_id filter
    return queryBuilder.eq('tenant_id', tenantId);
  }
  
  return queryBuilder;
}

module.exports = {
  supabase,
  tenantContext,
  setTenantContext,
  getTenantId,
  withTenantFilter
};
