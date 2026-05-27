const supabase = require('../config/database');

/**
 * Tenant Model - For Multi-Tenant School/Pondok Management
 * 
 * This model manages tenant data (pondok/sekolah) in the SaaS system.
 * Each tenant represents a separate school/pondok institution.
 */
class Tenant {
  constructor() {}

  /**
   * Get all tenants
   * @returns {Promise<Object>} List of tenants
   */
  async getAll() {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get tenant by ID
   * @param {string} tenantId - Tenant UUID
   * @returns {Promise<Object>} Single tenant data
   */
  async getById(tenantId) {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get tenant by school name
   * @param {string} schoolName - Name of the school/pondok
   * @returns {Promise<Object>} Single tenant data
   */
  async getBySchoolName(schoolName) {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .ilike('school_name', `%${schoolName}%`)
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Create new tenant
   * @param {Object} tenantData - Tenant information
   * @returns {Promise<Object>} Created tenant data
   */
  async create(tenantData) {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .insert([tenantData])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Update tenant by ID
   * @param {string} tenantId - Tenant UUID
   * @param {Object} tenantData - Updated tenant information
   * @returns {Promise<Object>} Updated tenant data
   */
  async update(tenantId, tenantData) {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .update(tenantData)
        .eq('id', tenantId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete tenant by ID (soft delete with is_active)
   * @param {string} tenantId - Tenant UUID
   * @returns {Promise<Object>} Deletion status
   */
  async delete(tenantId) {
    try {
      const { error } = await supabase
        .from('tenants')
        .update({ is_active: false, deleted_at: new Date() })
        .eq('id', tenantId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Activate tenant
   * @param {string} tenantId - Tenant UUID
   * @returns {Promise<Object>} Activation status
   */
  async activate(tenantId) {
    try {
      const { error } = await supabase
        .from('tenants')
        .update({ is_active: true, deleted_at: null })
        .eq('id', tenantId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if tenant exists by ID
   * @param {string} tenantId - Tenant UUID
   * @returns {Promise<boolean>} Existence status
   */
  async exists(tenantId) {
    try {
      const { count, error } = await supabase
        .from('tenants')
        .select('id', { count: 'exact' })
        .eq('id', tenantId)
        .eq('is_active', true);

      if (error) throw error;
      return count > 0;
    } catch (error) {
      return false;
    }
  }
}

module.exports = new Tenant();
