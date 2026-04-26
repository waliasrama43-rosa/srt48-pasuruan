const supabase = require('../config/database');

// Dashboard Admin
exports.dashboardAdmin = async (req, res) => {
  try {
    const hariIni = new Date().toISOString().split('T')[0];

    const { count: totalSiswa } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'aktif');

    const { count: totalGuru } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .in('role_id', [2,3,4,5,6,7,8,9])
      .eq('is_active', true);

    const { data: absenHariIni } = await supabase
      .from('attendances')
      .select('status')
      .gte('recorded_at', hariIni);

    const statistikAbsen = {
      hadir: absenHariIni?.filter(a => a.status === 'hadir').length || 0,
      alpha: absenHariIni?.filter(a => a.status === 'alpha').length || 0,
      sakit: absenHariIni?.filter(a => a.status === 'sakit').length || 0,
      izin: absenHariIni?.filter(a => a.status === 'izin').length || 0,
      terlambat: absenHariIni?.filter(a => a.status === 'terlambat').length || 0
    };

    const { data: kegiatanHariIni } = await supabase
      .from('activity_sessions')
      .select('*, activities (name, code)')
      .eq('date', hariIni)
      .order('time_start', { ascending: true });

    const { count: kunjunganUKS } = await supabase
      .from('health_records')
      .select('*', { count: 'exact', head: true })
      .eq('visit_date', hariIni);

    const { data: stokMenurun } = await supabase
      .from('items')
      .select('name, stock, unit')
      .lt('stock', 10)
      .order('stock', { ascending: true });

    res.json({
      status: 'ok',
      tanggal: hariIni,
      data: {
        total_siswa: totalSiswa || 0,
        total_guru: totalGuru || 0,
        absensi_hari_ini: statistikAbsen,
        kegiatan_hari_ini: kegiatanHariIni || [],
        kunjungan_uks: kunjunganUKS || 0,
        stok_menipis: stokMenurun || []
      }
    });

  } catch (err) {
    res.status(500).json({
      status: 'error',
      pesan: err.message
    });
  }
};

// Laporan Absensi
exports.laporanAbsensi = async (req, res) => {
  try {
    const { tanggal_mulai, tanggal_selesai } = req.query;

    const mulai = tanggal_mulai ||
      new Date().toISOString().split('T')[0];
    const selesai = tanggal_selesai ||
      new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('attendances')
      .select(`
        *,
        students (nis, users(name), classrooms(name)),
        activity_sessions (
          date, time_start,
          activities (name, code)
        )
      `)
      .gte('recorded_at', mulai)
      .lte('recorded_at', selesai)
      .order('recorded_at', { ascending: false });

    if (error) throw error;

    const statistik = {
      total: data?.length || 0,
      hadir: data?.filter(a => a.status === 'hadir').length || 0,
      terlambat: data?.filter(a => a.status === 'terlambat').length || 0,
      alpha: data?.filter(a => a.status === 'alpha').length || 0,
      sakit: data?.filter(a => a.status === 'sakit').length || 0,
      izin: data?.filter(a => a.status === 'izin').length || 0
    };

    res.json({
      status: 'ok',
      periode: { mulai, selesai },
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

// Laporan Nilai
exports.laporanNilai = async (req, res) => {
  try {
    const { semester, year } = req.query;

    const { data, error } = await supabase
      .from('grades')
      .select(`
        *,
        students (nis, users(name), classrooms(name)),
        subjects (name, code)
      `)
      .eq('semester', semester)
      .eq('year', year)
      .order('final_grade', { ascending: false });

    if (error) throw error;

    const nilaiList = data?.map(n => n.final_grade || 0) || [];
    const statistik = {
      total: data?.length || 0,
      rata_rata: nilaiList.length > 0
        ? Math.round(nilaiList.reduce((a,b) => a+b, 0) / nilaiList.length)
        : 0,
      tertinggi: Math.max(...nilaiList, 0),
      terendah: Math.min(...nilaiList, 0),
      lulus: data?.filter(n => (n.final_grade || 0) >= 70).length || 0,
      tidak_lulus: data?.filter(n => (n.final_grade || 0) < 70).length || 0
    };

    res.json({ status: 'ok', statistik, data });

  } catch (err) {
    res.status(500).json({
      status: 'error',
      pesan: err.message
    });
  }
};

// Laporan Kesehatan
exports.laporanKesehatan = async (req, res) => {
  try {
    const { tanggal_mulai, tanggal_selesai } = req.query;

    const mulai = tanggal_mulai ||
      new Date().toISOString().split('T')[0];
    const selesai = tanggal_selesai ||
      new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('health_records')
      .select(`
        *,
        students (nis, users(name), classrooms(name)),
        users (name)
      `)
      .gte('visit_date', mulai)
      .lte('visit_date', selesai)
      .order('visit_date', { ascending: false });

    if (error) throw error;

    res.json({
      status: 'ok',
      periode: { mulai, selesai },
      total: data?.length || 0,
      data
    });

  } catch (err) {
    res.status(500).json({
      status: 'error',
      pesan: err.message
    });
  }
};

// Laporan Perlengkapan
exports.laporanPerlengkapan = async (req, res) => {
  try {
    const { data: barang } = await supabase
      .from('items')
      .select('*')
      .order('name', { ascending: true });

    const { data: distribusi } = await supabase
      .from('item_distributions')
      .select(`
        *,
        students (nis, users(name), classrooms(name)),
        items (name, category, unit)
      `)
      .order('tanggal', { ascending: false });

    res.json({
      status: 'ok',
      total_barang: barang?.length || 0,
      total_distribusi: distribusi?.length || 0,
      stok_barang: barang,
      riwayat_distribusi: distribusi
    });

  } catch (err) {
    res.status(500).json({
      status: 'error',
      pesan: err.message
    });
  }
};

// Laporan Disiplin
exports.laporanDisiplin = async (req, res) => {
  try {
    const { tanggal_mulai, tanggal_selesai } = req.query;

    const mulai = tanggal_mulai ||
      new Date().toISOString().split('T')[0];
    const selesai = tanggal_selesai ||
      new Date().toISOString().split('T')[0];

    const { data: pelanggaran } = await supabase
      .from('violations')
      .select(`
        *,
        students (nis, users(name), classrooms(name)),
        users (name)
      `)
      .gte('date', mulai)
      .lte('date', selesai)
      .order('date', { ascending: false });

    res.json({
      status: 'ok',
      periode: { mulai, selesai },
      total: pelanggaran?.length || 0,
      data: pelanggaran
    });

  } catch (err) {
    res.status(500).json({
      status: 'error',
      pesan: err.message
    });
  }
};

// Dashboard Orang Tua
exports.dashboardOrangTua = async (req, res) => {
  try {
    const { siswa_id } = req.params;
    const hariIni = new Date().toISOString().split('T')[0];
    const bulanIni = new Date().getMonth() + 1;
    const tahunIni = new Date().getFullYear();

    const { data: siswa } = await supabase
      .from('students')
      .select(`
        *, users(name, photo),
        classrooms(name),
        dormitories(name)
      `)
      .eq('id', siswa_id)
      .single();

    const { data: absenHariIni } = await supabase
      .from('attendances')
      .select(`
        status, scan_time,
        activity_sessions (
          time_start,
          activities (name, code)
        )
      `)
      .eq('student_id', siswa_id)
      .gte('recorded_at', hariIni)
      .order('recorded_at', { ascending: true });

    const { data: absenBulanIni } = await supabase
      .from('attendances')
      .select('status')
      .eq('student_id', siswa_id)
      .gte('recorded_at', `${tahunIni}-${bulanIni}-01`);

    const rekapBulan = {
      hadir: absenBulanIni?.filter(a => a.status === 'hadir').length || 0,
      terlambat: absenBulanIni?.filter(a => a.status === 'terlambat').length || 0,
      alpha: absenBulanIni?.filter(a => a.status === 'alpha').length || 0,
      sakit: absenBulanIni?.filter(a => a.status === 'sakit').length || 0,
      izin: absenBulanIni?.filter(a => a.status === 'izin').length || 0
    };

    const { data: nilaiTerbaru } = await supabase
      .from('grades')
      .select('final_grade, grade_letter, subjects(name)')
      .eq('student_id', siswa_id)
      .order('created_at', { ascending: false })
      .limit(5);

    const { data: perlengkapan } = await supabase
      .from('item_distributions')
      .select('jumlah, tanggal, ukuran, items(name, category)')
      .eq('student_id', siswa_id)
      .order('tanggal', { ascending: false })
      .limit(5);

    const { data: kesehatan } = await supabase
      .from('health_records')
      .select('keluhan, tindakan, visit_date')
      .eq('student_id', siswa_id)
      .order('visit_date', { ascending: false })
      .limit(3);

    const { data: pengumuman } = await supabase
      .from('announcements')
      .select('title, content, created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(3);

    res.json({
      status: 'ok',
      data: {
        siswa,
        absen_hari_ini: absenHariIni || [],
        rekap_bulan_ini: rekapBulan,
        nilai_terbaru: nilaiTerbaru || [],
        perlengkapan_terbaru: perlengkapan || [],
        kesehatan_terbaru: kesehatan || [],
        pengumuman_terbaru: pengumuman || []
      }
    });

  } catch (err) {
    res.status(500).json({
      status: 'error',
      pesan: err.message
    });
  }
};
