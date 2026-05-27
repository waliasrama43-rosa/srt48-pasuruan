const { supabase } = require('../config/database');

/**
 * User Model - For Multi-Tenant User Management
 * 
 * This model manages users (admin, ustadz, security, parents) across tenants.
 * Each user is associated with a specific tenant via tenant_id.
 */
class User {
  constructor() {}

  /**
   * Get all users for a specific tenant
   * @param {string} tenantId - Tenant UUID
   * @returns {Promise<Object>} List of users
   */
  async getByTenant(tenantId) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user by ID
   * @param {string} userId - User UUID
   * @returns {Promise<Object>} Single user data
   */
  async getById(userId) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user by email
   * @param {string} email - User email
   * @returns {Promise<Object>} Single user data
   */
  async getByEmail(email) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user by phone (for OTP login)
   * @param {string} phone - User phone number
   * @returns {Promise<Object>} Single user data
   */
  async getByPhone(phone) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('phone', phone)
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Create new user
   * @param {Object} userData - User information
   * @returns {Promise<Object>} Created user data
   */
  async create(userData) {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert([userData])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Update user by ID
   * @param {string} userId - User UUID
   * @param {Object} userData - Updated user information
   * @returns {Promise<Object>} Updated user data
   */
  async update(userId, userData) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update(userData)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete user by ID (soft delete)
   * @param {string} userId - User UUID
   * @returns {Promise<Object>} Deletion status
   */
  async delete(userId) {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: false, deleted_at: new Date() })
        .eq('id', userId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Activate user
   * @param {string} userId - User UUID
   * @returns {Promise<Object>} Activation status
   */
  async activate(userId) {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: true, deleted_at: null })
        .eq('id', userId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get users by role within a tenant
   * @param {string} tenantId - Tenant UUID
   * @param {string} roleId - Role UUID
   * @returns {Promise<Object>} List of users with specific role
   */
  async getByRole(tenantId, roleId) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('role_id', roleId)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Count users by role within a tenant
   * @param {string} tenantId - Tenant UUID
   * @param {string} roleId - Role UUID
   * @returns {Promise<Object>} User count
   */
  async countByRole(tenantId, roleId) {
    try {
      const { count, error } = await supabase
        .from('users')
        .select('id', { count: 'exact' })
        .eq('tenant_id', tenantId)
        .eq('role_id', roleId)
        .eq('is_active', true);

      if (error) throw error;
      return { success: true, count };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = new User();
