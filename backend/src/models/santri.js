const supabase = require('../config/database');

/**
 * Santri Model - For Multi-Tenant Student Management
 * 
 * This model manages santri/student data across tenants.
 * Each santri is associated with a specific tenant via tenant_id.
 */
class Santri {
  constructor() {}

  /**
   * Get all santri for a specific tenant
   * @param {string} tenantId - Tenant UUID
   * @returns {Promise<Object>} List of santri
   */
  async getByTenant(tenantId) {
    try {
      const { data, error } = await supabase
        .from('santri')
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
   * Get santri by ID
   * @param {string} santriId - Santri UUID
   * @returns {Promise<Object>} Single santri data
   */
  async getById(santriId) {
    try {
      const { data, error } = await supabase
        .from('santri')
        .select('*')
        .eq('id', santriId)
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get santri by NIS/NISN
   * @param {string} nis - Student ID number (NIS/NISN)
   * @returns {Promise<Object>} Single santri data
   */
  async getByNIS(nis) {
    try {
      const { data, error } = await supabase
        .from('santri')
        .select('*')
        .eq('nis', nis)
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get santri by registration number
   * @param {string} noPendaftaran - Registration number
   * @returns {Promise<Object>} Single santri data
   */
  async getByNoPendaftaran(noPendaftaran) {
    try {
      const { data, error } = await supabase
        .from('santri')
        .select('*')
        .eq('no_pendaftaran', noPendaftaran)
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Create new santri
   * @param {Object} santriData - Santri information
   * @returns {Promise<Object>} Created santri data
   */
  async create(santriData) {
    try {
      const { data, error } = await supabase
        .from('santri')
        .insert([santriData])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Update santri by ID
   * @param {string} santriId - Santri UUID
   * @param {Object} santriData - Updated santri information
   * @returns {Promise<Object>} Updated santri data
   */
  async update(santriId, santriData) {
    try {
      const { data, error } = await supabase
        .from('santri')
        .update(santriData)
        .eq('id', santriId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete santri by ID (soft delete)
   * @param {string} santriId - Santri UUID
   * @returns {Promise<Object>} Deletion status
   */
  async delete(santriId) {
    try {
      const { error } = await supabase
        .from('santri')
        .update({ is_active: false, deleted_at: new Date() })
        .eq('id', santriId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Activate santri
   * @param {string} santriId - Santri UUID
   * @returns {Promise<Object>} Activation status
   */
  async activate(santriId) {
    try {
      const { error } = await supabase
        .from('santri')
        .update({ is_active: true, deleted_at: null })
        .eq('id', santriId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get santri by asrama (dormitory)
   * @param {string} tenantId - Tenant UUID
   * @param {string} asramaId - Asrama UUID
   * @returns {Promise<Object>} List of santri in specific asrama
   */
  async getByAsrama(tenantId, asramaId) {
    try {
      const { data, error } = await supabase
        .from('santri')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('asrama_id', asramaId)
        .eq('is_active', true)
        .order('nama', { ascending: true });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Count total santri within a tenant
   * @param {string} tenantId - Tenant UUID
   * @returns {Promise<Object>} Santri count
   */
  async count(tenantId) {
    try {
      const { count, error } = await supabase
        .from('santri')
        .select('id', { count: 'exact' })
        .eq('tenant_id', tenantId)
        .eq('is_active', true);

      if (error) throw error;
      return { success: true, count };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Search santri by name (fuzzy search)
   * @param {string} tenantId - Tenant UUID
   * @param {string} nama - Name to search
   * @returns {Promise<Object>} List of matching santri
   */
  async searchByName(tenantId, nama) {
    try {
      const { data, error } = await supabase
        .from('santri')
        .select('*')
        .eq('tenant_id', tenantId)
        .ilike('nama', `%${nama}%`)
        .order('nama', { ascending: true });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = new Santri();
