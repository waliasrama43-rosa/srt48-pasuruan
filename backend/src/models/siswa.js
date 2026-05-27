const { supabase } = require('../config/database');

/**
 * Siswa Model - For Multi-Tenant Student Management
 *
 * This model manages siswa/student data across tenants.
 * Each siswa is associated with a specific tenant via tenant_id.
 */
class Siswa {
  constructor() {}

  /**
   * Get all siswa for a specific tenant
   * @param {string} tenantId - Tenant UUID
   * @returns {Promise<Object>} List of siswa
   */
  async getByTenant(tenantId) {
    try {
      const { data, error } = await supabase
        .from('siswa')
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
   * Get siswa by ID
   * @param {string} siswaId - Siswa UUID
   * @returns {Promise<Object>} Single siswa data
   */
  async getById(siswaId) {
    try {
      const { data, error } = await supabase
        .from('siswa')
        .select('*')
        .eq('id', siswaId)
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get siswa by NIS/NISN
   * @param {string} nis - Student ID number (NIS/NISN)
   * @returns {Promise<Object>} Single siswa data
   */
  async getByNIS(nis) {
    try {
      const { data, error } = await supabase
        .from('siswa')
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
   * Get siswa by registration number
   * @param {string} noPendaftaran - Registration number
   * @returns {Promise<Object>} Single siswa data
   */
  async getByNoPendaftaran(noPendaftaran) {
    try {
      const { data, error } = await supabase
        .from('siswa')
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
   * Create new siswa
   * @param {Object} siswaData - Siswa information
   * @returns {Promise<Object>} Created siswa data
   */
  async create(siswaData) {
    try {
      const { data, error } = await supabase
        .from('siswa')
        .insert([siswaData])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Update siswa by ID
   * @param {string} siswaId - Siswa UUID
   * @param {Object} siswaData - Updated siswa information
   * @returns {Promise<Object>} Updated siswa data
   */
  async update(siswaId, siswaData) {
    try {
      const { data, error } = await supabase
        .from('siswa')
        .update(siswaData)
        .eq('id', siswaId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete siswa by ID (soft delete)
   * @param {string} siswaId - Siswa UUID
   * @returns {Promise<Object>} Deletion status
   */
  async delete(siswaId) {
    try {
      const { error } = await supabase
        .from('siswa')
        .update({ is_active: false, deleted_at: new Date() })
        .eq('id', siswaId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Activate siswa
   * @param {string} siswaId - Siswa UUID
   * @returns {Promise<Object>} Activation status
   */
  async activate(siswaId) {
    try {
      const { error } = await supabase
        .from('siswa')
        .update({ is_active: true, deleted_at: null })
        .eq('id', siswaId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get siswa by asrama (dormitory)
   * @param {string} tenantId - Tenant UUID
   * @param {string} asramaId - Asrama UUID
   * @returns {Promise<Object>} List of siswa in specific asrama
   */
  async getByAsrama(tenantId, asramaId) {
    try {
      const { data, error } = await supabase
        .from('siswa')
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
   * Count total siswa within a tenant
   * @param {string} tenantId - Tenant UUID
   * @returns {Promise<Object>} Siswa count
   */
  async count(tenantId) {
    try {
      const { count, error } = await supabase
        .from('siswa')
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
   * Search siswa by name (fuzzy search)
   * @param {string} tenantId - Tenant UUID
   * @param {string} nama - Name to search
   * @returns {Promise<Object>} List of matching siswa
   */
  async searchByName(tenantId, nama) {
    try {
      const { data, error } = await supabase
        .from('siswa')
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

module.exports = new Siswa();
