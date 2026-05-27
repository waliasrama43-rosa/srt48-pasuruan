const { supabase, getTenantId } = require('../config/database');

// Riwayat Kesehatan Siswa
exports.riwayatKesehatan = async (req, res) => {
  try {
    const tenantId = getTenantId();
    const { id } = req.params;

    const { data, error } = await supabase
      .from('health_records')
      .select(`*, users(name)`)
      .eq('student_id', id)
      .eq('tenant_id', tenantId)
      .order('visit_date', { ascending: false });

    if (error) throw error;
    res.json({ status: 'ok', total: data?.length || 0, data });

  } catch (err) {
    res.status(500).json({ status: 'error', pesan: err.message });
  }
};

// Tambah Catatan Kesehatan
exports.tambahCatatanKesehatan = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      keluhan, suhu_tubuh, tindakan,
      obat_diberikan, need_rest,
      is_referred, referred_to, notes
    } = req.body;

    const tenantId = getTenantId();
    const { data, error } = await supabase
      .from('health_records')
      .insert({
        tenant_id: tenantId,
        student_id: id,
        keluhan, suhu_tubuh: suhu_tubuh || null,
        tindakan, obat_diberikan: obat_diberikan || null,
        need_rest: need_rest || false,
        is_referred: is_referred || false,
        referred_to: referred_to || null,
        notes: notes || null,
        officer_id: req.user.id,
        visit_date: new Date().toISOString().split('T')[0],
        visit_time: new Date().toLocaleTimeString('id-ID')
      })
      .select()
      .single();

    if (error) throw error;

    res.json({
      status: 'ok',
      pesan: 'Catatan kesehatan berhasil disimpan',
      data
    });

  } catch (err) {
    res.status(500).json({ status: 'error', pesan: err.message });
  }
};

// Edit Catatan Kesehatan
exports.editCatatanKesehatan = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('health_records')
      .update({ ...req.body, updated_at: new Date() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      status: 'ok',
      pesan: 'Catatan kesehatan berhasil diperbarui',
      data
    });

  } catch (err) {
    res.status(500).json({ status: 'error', pesan: err.message });
  }
};

// Kunjungan UKS Hari Ini
exports.kunjunganUKS = async (req, res) => {
  try {
    const tenantId = getTenantId();
    const { tanggal } = req.query;
    const hariIni = tanggal || new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('health_records')
      .select(`*, students (nis, users(name), classrooms(name)), users (name)`)
      .eq('tenant_id', tenantId)
      .eq('visit_date', hariIni)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      status: 'ok',
      tanggal: hariIni,
      total: data?.length || 0,
      data
    });

  } catch (err) {
    res.status(500).json({ status: 'error', pesan: err.message });
  }
};

// Tambah Kunjungan UKS
exports.tambahKunjungan = async (req, res) => {
  try {
    const {
      student_id, keluhan, suhu_tubuh,
      tindakan, obat_diberikan,
      need_rest, is_referred, referred_to
    } = req.body;

    const tenantId = getTenantId();
    const { data, error } = await supabase
      .from('health_records')
      .insert({
        tenant_id: tenantId,
        student_id, keluhan,
        suhu_tubuh: suhu_tubuh || null,
        tindakan,
        obat_diberikan: obat_diberikan || null,
        need_rest: need_rest || false,
        is_referred: is_referred || false,
        referred_to: referred_to || null,
        officer_id: req.user.id,
        visit_date: new Date().toISOString().split('T')[0],
        visit_time: new Date().toLocaleTimeString('id-ID')
      })
      .select(`
        *,
        students (nis, users(name))
      `)
      .single();

    if (error) throw error;

    res.json({
      status: 'ok',
      pesan: 'Kunjungan UKS berhasil dicatat',
      data
    });

  } catch (err) {
    res.status(500).json({ status: 'error', pesan: err.message });
  }
};

// Update Kunjungan UKS
exports.updateKunjungan = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('health_records')
      .update({ ...req.body, updated_at: new Date() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      status: 'ok',
      pesan: 'Data kunjungan berhasil diperbarui',
      data
    });

  } catch (err) {
    res.status(500).json({ status: 'error', pesan: err.message });
  }
};
