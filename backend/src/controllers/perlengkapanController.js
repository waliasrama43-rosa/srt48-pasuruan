const { supabase, getTenantId } = require('../config/database');

// Semua Barang
exports.semuaBarang = async (req, res) => {
  try {
    const tenantId = getTenantId();
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('name', { ascending: true });

    if (error) throw error;
    res.json({ status: 'ok', total: data?.length || 0, data });

  } catch (err) {
    res.status(500).json({ status: 'error', pesan: err.message });
  }
};

// Tambah Barang
exports.tambahBarang = async (req, res) => {
  try {
    const { name, code, category, unit, description } = req.body;

    const tenantId = getTenantId();
    const { data, error } = await supabase
      .from('items')
      .insert({
        tenant_id: tenantId,
        name, code: code || null,
        category: category || null,
        unit: unit || 'pcs',
        description: description || null,
        stock: 0,
        created_by: req.user.id
      })
      .select()
      .single();

    if (error) throw error;

    res.json({
      status: 'ok',
      pesan: `Barang ${name} berhasil ditambahkan`,
      data
    });

  } catch (err) {
    res.status(500).json({ status: 'error', pesan: err.message });
  }
};

// Edit Barang
exports.editBarang = async (req, res) => {
  try {
    const { id } = req.params;

    const tenantId = getTenantId();
    const { data, error } = await supabase
      .from('items')
      .update({ ...req.body, updated_at: new Date() })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) throw error;

    res.json({
      status: 'ok',
      pesan: 'Barang berhasil diperbarui',
      data
    });

  } catch (err) {
    res.status(500).json({ status: 'error', pesan: err.message });
  }
};

// Stok Masuk
exports.stokMasuk = async (req, res) => {
  try {
    const { item_id, jumlah, keterangan } = req.body;

    const tenantId = getTenantId();
    const { data: stok, error: errorStok } = await supabase
      .from('item_stocks')
      .insert({
        tenant_id: tenantId,
        item_id, type: 'masuk',
        jumlah, keterangan: keterangan || null,
        tanggal: new Date(),
        created_by: req.user.id
      })
      .select()
      .single();

    if (errorStok) throw errorStok;

    const { data: barang } = await supabase
      .from('items')
      .select('stock')
      .eq('id', item_id)
      .single();

    const stokBaru = (barang?.stock || 0) + jumlah;

    await supabase
      .from('items')
      .update({ stock: stokBaru, updated_at: new Date() })
      .eq('id', item_id);

    res.json({
      status: 'ok',
      pesan: `Stok berhasil ditambahkan. Total: ${stokBaru}`,
      data: stok
    });

  } catch (err) {
    res.status(500).json({ status: 'error', pesan: err.message });
  }
};

// Distribusi ke Siswa
exports.distribusiKesSiswa = async (req, res) => {
  try {
    const { student_id, item_id, jumlah, ukuran, keterangan } = req.body;

    const tenantId = getTenantId();
    const { data: barang } = await supabase
      .from('items')
      .select('stock, name')
      .eq('id', item_id)
      .eq('tenant_id', tenantId)
      .single();

    if (!barang || barang.stock < jumlah) {
      return res.status(400).json({
        status: 'error',
        pesan: `Stok tidak mencukupi. Tersedia: ${barang?.stock || 0}`
      });
    }

    const { data, error } = await supabase
      .from('item_distributions')
      .insert({
        tenant_id: tenantId,
        student_id, item_id, jumlah,
        ukuran: ukuran || null,
        keterangan: keterangan || null,
        tanggal: new Date(),
        status: 'diterima',
        distributed_by: req.user.id
      })
      .select(`
        *,
        students (nis, users(name)),
        items (name, unit, category)
      `)
      .single();

    if (error) throw error;

    await supabase
      .from('items')
      .update({
        stock: barang.stock - jumlah,
        updated_at: new Date()
      })
      .eq('id', item_id);

    res.json({
      status: 'ok',
      pesan: `${barang.name} berhasil didistribusikan`,
      data
    });

  } catch (err) {
    res.status(500).json({ status: 'error', pesan: err.message });
  }
};

// Riwayat Siswa
exports.riwayatSiswa = async (req, res) => {
  try {
    const { siswa_id } = req.params;

    const tenantId = getTenantId();
    const { data, error } = await supabase
      .from('item_distributions')
      .select(`*, items(id, name, code, category, unit)`)
      .eq('student_id', siswa_id)
      .eq('tenant_id', tenantId)
      .order('tanggal', { ascending: false });

    if (error) throw error;
    res.json({ status: 'ok', total: data?.length || 0, data });

  } catch (err) {
    res.status(500).json({ status: 'error', pesan: err.message });
  }
};

// Laporan Distribusi
exports.laporanDistribusi = async (req, res) => {
  try {
    const tenantId = getTenantId();
    const { data, error } = await supabase
      .from('item_distributions')
      .select(`*, students (nis, users(name), classrooms(name)), items (name, category, unit)`)
      .eq('tenant_id', tenantId)
      .order('tanggal', { ascending: false });

    if (error) throw error;

    res.json({
      status: 'ok',
      total: data?.length || 0,
      data
    });

  } catch (err) {
    res.status(500).json({ status: 'error', pesan: err.message });
  }
};
