const { supabase, getTenantId } = require('../config/database');
const xlsx = require('xlsx');
const fs = require('fs');

exports.semuaSiswa = async (req, res) => {
  try {
    const tenantId = getTenantId();
    const { asrama_id, status, cari } = req.query;

    let query = supabase
      .from('siswa')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (asrama_id) query = query.eq('asrama_id', asrama_id);
    if (status)    query = query.eq('status_siswa', status);

    const { data, error } = await query;
    if (error) throw error;

    let hasil = data;
    if (cari) {
      hasil = data.filter(s =>
        s.nama?.toLowerCase().includes(cari.toLowerCase()) ||
        s.nis?.includes(cari)
      );
    }

    res.json({ status: 'ok', total: hasil.length, data: hasil });

  } catch (err) {
    res.status(500).json({ status: 'error', pesan: err.message });
  }
};

exports.detailSiswa = async (req, res) => {
  try {
    const tenantId = getTenantId();
    const { id } = req.params;

    const { data, error } = await supabase
      .from('siswa')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error) throw error;
    res.json({ status: 'ok', data });

  } catch (err) {
    res.status(500).json({ status: 'error', pesan: err.message });
  }
};

exports.scanKartu = async (req, res) => {
  try {
    const tenantId = getTenantId();
    const { kartu_id } = req.params;

    const { data, error } = await supabase
      .from('siswa')
      .select('*')
      .eq('tenant_id', tenantId)
      .or(`nis.eq.${kartu_id},nisn.eq.${kartu_id},no_pendaftaran.eq.${kartu_id}`)
      .single();

    if (error || !data) {
      return res.status(404).json({ status: 'error', pesan: 'Kartu tidak dikenali' });
    }

    res.json({ status: 'ok', data });

  } catch (err) {
    res.status(500).json({ status: 'error', pesan: err.message });
  }
};

exports.tambahSiswa = async (req, res) => {
  try {
    const tenantId = getTenantId();
    const {
      nama, nis, nisn, tempat_lahir, tanggal_lahir,
      jenis_kelamin, alamat, no_wali, nama_wali,
      asrama_id, no_pendaftaran
    } = req.body;

    const { data, error } = await supabase
      .from('siswa')
      .insert({
        tenant_id: tenantId,
        nama, nis, nisn: nisn || null,
        tempat_lahir: tempat_lahir || null,
        tanggal_lahir: tanggal_lahir || null,
        jenis_kelamin: jenis_kelamin || null,
        alamat: alamat || null,
        no_wali: no_wali || null,
        nama_wali: nama_wali || null,
        asrama_id: asrama_id || null,
        no_pendaftaran: no_pendaftaran || null,
        status_siswa: 'aktif',
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ status: 'ok', pesan: `Siswa ${nama} berhasil ditambahkan`, data });

  } catch (err) {
    res.status(500).json({ status: 'error', pesan: err.message });
  }
};

exports.editSiswa = async (req, res) => {
  try {
    const tenantId = getTenantId();
    const { id } = req.params;

    const { data, error } = await supabase
      .from('siswa')
      .update({ ...req.body, updated_at: new Date() })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) throw error;

    res.json({ status: 'ok', pesan: 'Data siswa berhasil diperbarui', data });

  } catch (err) {
    res.status(500).json({ status: 'error', pesan: err.message });
  }
};

exports.arsipSiswa = async (req, res) => {
  try {
    const tenantId = getTenantId();
    const { id } = req.params;

    const { data, error } = await supabase
      .from('siswa')
      .update({ status_siswa: 'lulus', is_active: false, updated_at: new Date() })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) throw error;

    res.json({ status: 'ok', pesan: 'Siswa berhasil diarsipkan', data });

  } catch (err) {
    res.status(500).json({ status: 'error', pesan: err.message });
  }
};

exports.importExcel = async (req, res) => {
  try {
    const tenantId = getTenantId();
    if (!req.file) return res.status(400).json({ status: 'error', pesan: 'File Excel harus diupload' });

    const workbook = xlsx.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const dataSiswa = xlsx.utils.sheet_to_json(sheet);
    const hasil = { berhasil: 0, gagal: 0, detail_gagal: [] };

    for (const baris of dataSiswa) {
      try {
        await supabase.from('siswa').insert({
          tenant_id: tenantId,
          nama: baris.NAMA,
          nis: baris.NIS?.toString(),
          jenis_kelamin: baris.JENIS_KELAMIN || null,
          status_siswa: 'aktif',
          is_active: true
        });
        hasil.berhasil++;
      } catch (err) {
        hasil.gagal++;
        hasil.detail_gagal.push({ nis: baris.NIS, error: err.message });
      }
    }

    fs.unlinkSync(req.file.path);
    res.json({ status: 'ok', pesan: `Import selesai. ${hasil.berhasil} berhasil, ${hasil.gagal} gagal.`, hasil });

  } catch (err) {
    res.status(500).json({ status: 'error', pesan: err.message });
  }
};

// Download Template
exports.downloadTemplate = async (req, res) => {
  try {
    const template = [
      {
        NIS: '2024001',
        NAMA: 'Ahmad Fauzi',
        JENIS_KELAMIN: 'L',
        TEMPAT_LAHIR: 'Pasuruan',
        TANGGAL_LAHIR: '2010-01-01',
        ALAMAT: 'Jl. Contoh No. 1'
      }
    ];

    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(template);
    xlsx.utils.book_append_sheet(wb, ws, 'Siswa');

    const buffer = xlsx.write(wb, {
      type: 'buffer',
      bookType: 'xlsx'
    });

    res.setHeader('Content-Disposition',
      'attachment; filename=template_siswa.xlsx');
    res.setHeader('Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);

  } catch (err) {
    res.status(500).json({
      status: 'error',
      pesan: err.message
    });
  }
};
