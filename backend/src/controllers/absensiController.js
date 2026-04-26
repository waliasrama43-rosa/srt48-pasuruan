const supabase = require('../config/database');

// Semua Kegiatan
exports.semuaKegiatan = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('activities')
      .select(`
        *,
        activity_categories (name, icon, color)
      `)
      .eq('is_active', true)
      .order('default_time_start', { ascending: true });

    if (error) throw error;
    res.json({ status: 'ok', data });

  } catch (err) {
    res.status(500).json({
      status: 'error',
      pesan: err.message
    });
  }
};

// Tambah Kegiatan
exports.tambahKegiatan = async (req, res) => {
  try {
    const {
      category_id, name, code,
      default_time_start, late_tolerance,
      schedule_days, description
    } = req.body;

    const { data, error } = await supabase
      .from('activities')
      .insert({
        category_id,
        name, code: code || null,
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
    res.status(500).json({
      status: 'error',
      pesan: err.message
    });
  }
};

// Edit Kegiatan
exports.editKegiatan = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('activities')
      .update({
        ...req.body,
        updated_at: new Date()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      status: 'ok',
      pesan: 'Kegiatan berhasil diperbarui',
      data
    });

  } catch (err) {
    res.status(500).json({
      status: 'error',
      pesan: err.message
    });
  }
};

// Hapus Kegiatan
exports.hapusKegiatan = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('activities')
      .update({ is_active: false })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      status: 'ok',
      pesan: 'Kegiatan berhasil dinonaktifkan',
      data
    });

  } catch (err) {
    res.status(500).json({
      status: 'error',
      pesan: err.message
    });
  }
};

// Buat Sesi Kegiatan
exports.buatSesi = async (req, res) => {
  try {
    const {
      activity_id, date,
      time_start, location
    } = req.body;

    const { data: kegiatan } = await supabase
      .from('activities')
      .select('name, late_tolerance')
      .eq('id', activity_id)
      .single();

    const { data, error } = await supabase
      .from('activity_sessions')
      .insert({
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
      pesan: `Sesi ${kegiatan?.name} dimulai`,
      data
    });

  } catch (err) {
    res.status(500).json({
      status: 'error',
      pesan: err.message
    });
  }
};

// Scan Absensi
exports.scanAbsensi = async (req, res) => {
  try {
    const { session_id, kartu_id, scan_method } = req.body;

    const { data: sesi } = await supabase
      .from('activity_sessions')
      .select(`
        *,
        activities (name, late_tolerance)
      `)
      .eq('id', session_id)
      .single();

    if (!sesi) {
      return res.status(404).json({
        status: 'error',
        pesan: 'Sesi tidak ditemukan'
      });
    }

    const { data: siswa } = await supabase
      .from('students')
      .select('id, nis, users(name), status')
      .or(
        `nfc_id.eq.${kartu_id},` +
        `barcode_id.eq.${kartu_id},` +
        `nis.eq.${kartu_id}`
      )
      .single();

    if (!siswa) {
      return res.status(404).json({
        status: 'error',
        pesan: 'Kartu tidak dikenali'
      });
    }

    const { data: sudahAbsen } = await supabase
      .from('attendances')
      .select('id, status')
      .eq('session_id', session_id)
      .eq('student_id', siswa.id)
      .single();

    if (sudahAbsen) {
      return res.status(400).json({
        status: 'error',
        pesan: `${siswa.users?.name} sudah absen: ${sudahAbsen.status}`
      });
    }

    const waktuScan = new Date();
    const [jamSesi, menitSesi] = sesi.time_start
      .split(':').map(Number);
    const waktuMulai = new Date();
    waktuMulai.setHours(jamSesi, menitSesi, 0);

    const selisihMenit = Math.floor(
      (waktuScan - waktuMulai) / 60000
    );

    const toleransi = sesi.activities?.late_tolerance || 0;
    let statusAbsen = 'hadir';
    let terlambatMenit = 0;

    if (selisihMenit > toleransi) {
      statusAbsen = 'terlambat';
      terlambatMenit = selisihMenit - toleransi;
    }

    const { data: absensi, error } = await supabase
      .from('attendances')
      .insert({
        session_id,
        student_id: siswa.id,
        scan_time: waktuScan,
        scan_method: scan_method || 'nfc',
        status: statusAbsen,
        late_minutes: terlambatMenit,
        recorded_by: req.user.id,
        recorded_at: waktuScan
      })
      .select()
      .single();

    if (error) throw error;

    res.json({
      status: 'ok',
      pesan: `${siswa.users?.name} - ${statusAbsen.toUpperCase()}`,
      data: {
        nama: siswa.users?.name,
        nis: siswa.nis,
        status: statusAbsen,
        terlambat: terlambatMenit,
        waktu: waktuScan.toLocaleTimeString('id-ID')
      }
    });

  } catch (err) {
    res.status(500).json({
      status: 'error',
      pesan: err.message
    });
  }
};

// Input Manual
exports.inputManual = async (req, res) => {
  try {
    const {
      session_id, student_id,
      status, notes
    } = req.body;

    const { data: sudahAbsen } = await supabase
      .from('attendances')
      .select('id')
      .eq('session_id', session_id)
      .eq('student_id', student_id)
      .single();

    if (sudahAbsen) {
      await supabase
        .from('attendances')
        .update({ status, notes, recorded_at: new Date() })
        .eq('id', sudahAbsen.id);
    } else {
      await supabase.from('attendances').insert({
        session_id, student_id,
        status, notes: notes || null,
        scan_method: 'manual',
        recorded_by: req.user.id,
        recorded_at: new Date()
      });
    }

    res.json({
      status: 'ok',
      pesan: 'Absensi manual berhasil dicatat'
    });

  } catch (err) {
    res.status(500).json({
      status: 'error',
      pesan: err.message
    });
  }
};

// Rekap Harian
exports.rekapHarian = async (req, res) => {
  try {
    const { tanggal } = req.query;
    const hariIni = tanggal ||
      new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('attendances')
      .select(`
        *,
        students (nis, users(name)),
        activity_sessions (
          date, time_start,
          activities (name, code)
        )
      `)
      .gte('recorded_at', hariIni)
      .order('recorded_at', { ascending: false });

    if (error) throw error;

    const statistik = {
      hadir: data?.filter(a => a.status === 'hadir').length || 0,
      terlambat: data?.filter(a => a.status === 'terlambat').length || 0,
      alpha: data?.filter(a => a.status === 'alpha').length || 0,
      sakit: data?.filter(a => a.status === 'sakit').length || 0,
      izin: data?.filter(a => a.status === 'izin').length || 0
    };

    res.json({
      status: 'ok',
      tanggal: hariIni,
      statistik,
      data
    });

  } catch (err) {
    res.status(500).json({
      status: 'error',
      pesan: err.message
    });
  }
};

// Rekap Per Siswa
exports.rekapSiswa = async (req, res) => {
  try {
    const { id } = req.params;
    const { bulan, tahun } = req.query;

    const bln = bulan || new Date().getMonth() + 1;
    const thn = tahun || new Date().getFullYear();

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
      .eq('student_id', id)
      .gte('recorded_at', `${thn}-${bln}-01`)
      .order('recorded_at', { ascending: false });

    if (error) throw error;

    const statistik = {
      hadir: data?.filter(a => a.status === 'hadir').length || 0,
      terlambat: data?.filter(a => a.status === 'terlambat').length || 0,
      alpha: data?.filter(a => a.status === 'alpha').length || 0,
      sakit: data?.filter(a => a.status === 'sakit').length || 0,
      izin: data?.filter(a => a.status === 'izin').length || 0,
      total: data?.length || 0
    };

    const persentase = statistik.total > 0
      ? Math.round(
          (statistik.hadir + statistik.terlambat) /
          statistik.total * 100
        )
      : 0;

    res.json({
      status: 'ok',
      bulan: bln,
      tahun: thn,
      statistik,
      persentase_hadir: `${persentase}%`,
      data
    });

  } catch (err) {
    res.status(500).json({
      status: 'error',
      pesan: err.message
    });
  }
};
