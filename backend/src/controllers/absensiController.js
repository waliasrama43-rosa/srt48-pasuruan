const {
  supabase,
  withTenantFilter,
  getTenantId
} = require('../config/database');

// ─── Helper: pastikan tenant_id tersedia ──────────────────────────────────────
function requireTenantId(res) {
  const tenantId = getTenantId();
  if (!tenantId) {
    res.status(400).json({
      status: 'error',
      pesan: 'tenant_id tidak ditemukan. Pastikan Anda sudah login.'
    });
    return null;
  }
  return tenantId;
}

// ─── Semua Kegiatan (filtered by tenant) ─────────────────────────────────────
exports.semuaKegiatan = async (req, res) => {
  try {
    const tenantId = requireTenantId(res);
    if (!tenantId) return;

    const { data, error } = await withTenantFilter(
      supabase
        .from('activities')
        .select('*, activity_categories (name, icon, color)')
        .eq('is_active', true)
        .order('default_time_start', { ascending: true })
    );

    if (error) throw error;
    res.json({ status: 'ok', data });

  } catch (err) {
    res.status(500).json({ status: 'error', pesan: err.message });
  }
};

// ─── Tambah Kegiatan ──────────────────────────────────────────────────────────
exports.tambahKegiatan = async (req, res) => {
  try {
    const tenantId = requireTenantId(res);
    if (!tenantId) return;

    const {
      category_id, name, code,
      default_time_start, late_tolerance,
      schedule_days, description
    } = req.body;

    const { data, error } = await supabase
      .from('activities')
      .insert({
        tenant_id: tenantId,
        category_id,
        name,
        code: code || null,
        default_time_start,
        late_tolerance: late_tolerance || 0,
        schedule_days: schedule_days || null,
        description: description || null,
        created_by: req.user.id
      })
      .select()
      .single();

    if (error) throw error;

    res.json({
      status: 'ok',
      pesan: `Kegiatan ${name} berhasil ditambahkan`,
      data
    });

  } catch (err) {
    res.status(500).json({ status: 'error', pesan: err.message });
  }
};

// ─── Edit Kegiatan ────────────────────────────────────────────────────────────
exports.editKegiatan = async (req, res) => {
  try {
    const tenantId = requireTenantId(res);
    if (!tenantId) return;

    const { id } = req.params;

    // Pastikan kegiatan milik tenant ini
    const { data: existing } = await supabase
      .from('activities')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (!existing) {
      return res.status(404).json({
        status: 'error',
        pesan: 'Kegiatan tidak ditemukan atau bukan milik sekolah ini'
      });
    }

    const { data, error } = await supabase
      .from('activities')
      .update({ ...req.body, updated_at: new Date() })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) throw error;

    res.json({ status: 'ok', pesan: 'Kegiatan berhasil diperbarui', data });

  } catch (err) {
    res.status(500).json({ status: 'error', pesan: err.message });
  }
};

// ─── Hapus Kegiatan (soft delete) ────────────────────────────────────────────
exports.hapusKegiatan = async (req, res) => {
  try {
    const tenantId = requireTenantId(res);
    if (!tenantId) return;

    const { id } = req.params;

    const { data, error } = await supabase
      .from('activities')
      .update({ is_active: false })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({
        status: 'error',
        pesan: 'Kegiatan tidak ditemukan atau bukan milik sekolah ini'
      });
    }

    res.json({ status: 'ok', pesan: 'Kegiatan berhasil dinonaktifkan', data });

  } catch (err) {
    res.status(500).json({ status: 'error', pesan: err.message });
  }
};

// ─── Buat Sesi Absensi ────────────────────────────────────────────────────────
exports.buatSesi = async (req, res) => {
  try {
    const tenantId = requireTenantId(res);
    if (!tenantId) return;

    const { activity_id, date, time_start, location } = req.body;

    // Validasi kegiatan milik tenant ini
    const { data: kegiatan, error: errKeg } = await supabase
      .from('activities')
      .select('name, late_tolerance')
      .eq('id', activity_id)
      .eq('tenant_id', tenantId)
      .single();

    if (errKeg || !kegiatan) {
      return res.status(404).json({
        status: 'error',
        pesan: 'Kegiatan tidak ditemukan atau bukan milik sekolah ini'
      });
    }

    const { data, error } = await supabase
      .from('activity_sessions')
      .insert({
        tenant_id: tenantId,
        activity_id,
        date: date || new Date().toISOString().split('T')[0],
        time_start,
        location: location || null,
        officer_id: req.user.id,
        status: 'berlangsung'
      })
      .select(`
        *,
        activities (name, code, late_tolerance,
          activity_categories (name, icon))
      `)
      .single();

    if (error) throw error;

    res.json({
      status: 'ok',
      pesan: `Sesi ${kegiatan.name} dimulai`,
      data
    });

  } catch (err) {
    res.status(500).json({ status: 'error', pesan: err.message });
  }
};

// ─── Scan Absensi (QR / NFC / Barcode) ───────────────────────────────────────
exports.scanAbsensi = async (req, res) => {
  try {
    const tenantId = requireTenantId(res);
    if (!tenantId) return;

    const { session_id, kartu_id, scan_method } = req.body;

    // 1. Ambil sesi — pastikan milik tenant ini
    const { data: sesi, error: errSesi } = await supabase
      .from('activity_sessions')
      .select('*, activities (name, late_tolerance)')
      .eq('id', session_id)
      .eq('tenant_id', tenantId)
      .single();

    if (errSesi || !sesi) {
      return res.status(404).json({
        status: 'error',
        pesan: 'Sesi tidak ditemukan atau bukan milik sekolah ini'
      });
    }

    if (sesi.status !== 'berlangsung') {
      return res.status(400).json({
        status: 'error',
        pesan: `Sesi sudah ${sesi.status}. Tidak dapat melakukan absensi.`
      });
    }

    // 2. Cari siswa di tenant ini berdasarkan kartu_id / NIS
    const { data: siswa, error: errSiswa } = await supabase
      .from('siswa')
      .select('id, nis, nama, nama_wali, no_wali')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .or(`nis.eq.${kartu_id},nisn.eq.${kartu_id},no_pendaftaran.eq.${kartu_id}`)
      .single();

    if (errSiswa || !siswa) {
      return res.status(404).json({
        status: 'error',
        pesan: 'Kartu/NIS tidak dikenali atau siswa tidak aktif di sekolah ini'
      });
    }

    // 3. Cek apakah sudah absen di sesi ini
    const { data: sudahAbsen } = await supabase
      .from('attendances')
      .select('id, status')
      .eq('session_id', session_id)
      .eq('siswa_id', siswa.id)
      .single();

    if (sudahAbsen) {
      return res.status(400).json({
        status: 'error',
        pesan: `${siswa.nama} sudah absen: ${sudahAbsen.status}`
      });
    }

    // 4. Hitung status: hadir / terlambat
    const waktuScan = new Date();
    const [jamSesi, menitSesi] = sesi.time_start.split(':').map(Number);
    const waktuMulai = new Date();
    waktuMulai.setHours(jamSesi, menitSesi, 0, 0);

    const selisihMenit = Math.floor((waktuScan - waktuMulai) / 60000);
    const toleransi = sesi.activities?.late_tolerance || 0;

    let statusAbsen = 'hadir';
    let terlambatMenit = 0;

    if (selisihMenit > toleransi) {
      statusAbsen = 'terlambat';
      terlambatMenit = selisihMenit - toleransi;
    }

    // 5. Simpan record absensi dengan tenant_id
    const { data: absensi, error: errAbsen } = await supabase
      .from('attendances')
      .insert({
        tenant_id: tenantId,
        session_id,
        siswa_id: siswa.id,
        scan_time: waktuScan,
        scan_method: scan_method || 'nfc',
        status: statusAbsen,
        late_minutes: terlambatMenit,
        recorded_by: req.user.id,
        recorded_at: waktuScan
      })
      .select()
      .single();

    if (errAbsen) throw errAbsen;

    // 6. Kirim notifikasi realtime via Socket.io (jika tersedia)
    const io = req.app.get('io');
    if (io) {
      io.to(`tenant_${tenantId}`).emit('absensi_baru', {
        nama: siswa.nama,
        nis: siswa.nis,
        status: statusAbsen,
        waktu: waktuScan.toLocaleTimeString('id-ID')
      });
    }

    res.json({
      status: 'ok',
      pesan: `${siswa.nama} — ${statusAbsen.toUpperCase()}`,
      data: {
        nama: siswa.nama,
        nis: siswa.nis,
        status: statusAbsen,
        terlambat_menit: terlambatMenit,
        waktu: waktuScan.toLocaleTimeString('id-ID')
      }
    });

  } catch (err) {
    res.status(500).json({ status: 'error', pesan: err.message });
  }
};

// ─── Input Manual ─────────────────────────────────────────────────────────────
exports.inputManual = async (req, res) => {
  try {
    const tenantId = requireTenantId(res);
    if (!tenantId) return;

    const { session_id, siswa_id, status, notes } = req.body;

    // Validasi sesi & siswa milik tenant ini
    const [{ data: sesi }, { data: siswa }] = await Promise.all([
      supabase
        .from('activity_sessions')
        .select('id')
        .eq('id', session_id)
        .eq('tenant_id', tenantId)
        .single(),
      supabase
        .from('siswa')
        .select('id, nama')
        .eq('id', siswa_id)
        .eq('tenant_id', tenantId)
        .single()
    ]);

    if (!sesi || !siswa) {
      return res.status(404).json({
        status: 'error',
        pesan: 'Sesi atau siswa tidak ditemukan / bukan milik sekolah ini'
      });
    }

    // Upsert: perbarui jika sudah ada, insert jika belum
    const { data: sudahAbsen } = await supabase
      .from('attendances')
      .select('id')
      .eq('session_id', session_id)
      .eq('siswa_id', siswa_id)
      .single();

    if (sudahAbsen) {
      await supabase
        .from('attendances')
        .update({ status, notes: notes || null, recorded_at: new Date() })
        .eq('id', sudahAbsen.id);
    } else {
      await supabase
        .from('attendances')
        .insert({
          tenant_id: tenantId,
          session_id,
          siswa_id,
          status,
          notes: notes || null,
          scan_method: 'manual',
          recorded_by: req.user.id,
          recorded_at: new Date()
        });
    }

    res.json({
      status: 'ok',
      pesan: `Absensi manual ${siswa.nama} berhasil dicatat: ${status}`
    });

  } catch (err) {
    res.status(500).json({ status: 'error', pesan: err.message });
  }
};

// ─── Rekap Harian (filtered by tenant) ───────────────────────────────────────
exports.rekapHarian = async (req, res) => {
  try {
    const tenantId = requireTenantId(res);
    if (!tenantId) return;

    const { tanggal } = req.query;
    const hariIni = tanggal || new Date().toISOString().split('T')[0];
    const besok = new Date(hariIni);
    besok.setDate(besok.getDate() + 1);

    const { data, error } = await supabase
      .from('attendances')
      .select(`
        *,
        siswa (nis, nama),
        activity_sessions (
          date, time_start,
          activities (name, code)
        )
      `)
      .eq('tenant_id', tenantId)
      .gte('recorded_at', `${hariIni}T00:00:00`)
      .lt('recorded_at', besok.toISOString().split('T')[0] + 'T00:00:00')
      .order('recorded_at', { ascending: false });

    if (error) throw error;

    const statistik = {
      hadir:     data?.filter(a => a.status === 'hadir').length     || 0,
      terlambat: data?.filter(a => a.status === 'terlambat').length || 0,
      alpha:     data?.filter(a => a.status === 'alpha').length     || 0,
      sakit:     data?.filter(a => a.status === 'sakit').length     || 0,
      izin:      data?.filter(a => a.status === 'izin').length      || 0
    };

    res.json({ status: 'ok', tanggal: hariIni, statistik, data });

  } catch (err) {
    res.status(500).json({ status: 'error', pesan: err.message });
  }
};

// ─── Rekap Per Siswa ──────────────────────────────────────────────────────────
exports.rekapSiswa = async (req, res) => {
  try {
    const tenantId = requireTenantId(res);
    if (!tenantId) return;

    const { id } = req.params;
    const { bulan, tahun } = req.query;

    const bln = String(bulan || new Date().getMonth() + 1).padStart(2, '0');
    const thn = tahun || new Date().getFullYear();

    // Validasi: siswa harus milik tenant ini
    const { data: siswa, error: errSiswa } = await supabase
      .from('siswa')
      .select('id, nis, nama')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (errSiswa || !siswa) {
      return res.status(404).json({
        status: 'error',
        pesan: 'Siswa tidak ditemukan atau bukan milik sekolah ini'
      });
    }

    const { data, error } = await supabase
      .from('attendances')
      .select(`
        *,
        activity_sessions (
          date, time_start,
          activities (name, code,
            activity_categories (name, icon))
        )
      `)
      .eq('tenant_id', tenantId)
      .eq('siswa_id', id)
      .gte('recorded_at', `${thn}-${bln}-01`)
      .lt('recorded_at',
          new Date(thn, Number(bln), 1).toISOString().split('T')[0])
      .order('recorded_at', { ascending: false });

    if (error) throw error;

    const statistik = {
      hadir:     data?.filter(a => a.status === 'hadir').length     || 0,
      terlambat: data?.filter(a => a.status === 'terlambat').length || 0,
      alpha:     data?.filter(a => a.status === 'alpha').length     || 0,
      sakit:     data?.filter(a => a.status === 'sakit').length     || 0,
      izin:      data?.filter(a => a.status === 'izin').length      || 0,
      total:     data?.length || 0
    };

    const persentase = statistik.total > 0
      ? Math.round(
          (statistik.hadir + statistik.terlambat) / statistik.total * 100
        )
      : 0;

    res.json({
      status: 'ok',
      siswa: { id: siswa.id, nis: siswa.nis, nama: siswa.nama },
      bulan: bln,
      tahun: thn,
      statistik,
      persentase_hadir: `${persentase}%`,
      data
    });

  } catch (err) {
    res.status(500).json({ status: 'error', pesan: err.message });
  }
};
