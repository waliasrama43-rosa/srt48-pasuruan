const supabase = require('../config/database');

exports.semuaBakat = async (req, res) => {
  try {
    const { siswa_id } = req.params;

    const { data, error } = await supabase
      .from('student_talents')
      .select(`
        *,
        talent_categories (name, icon),
        users (name)
      `)
      .eq('student_id', siswa_id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ status: 'ok', data });

  } catch (err) {
    res.status(500).json({
      status: 'error',
      pesan: err.message
    });
  }
};

exports.tambahBakat = async (req, res) => {
  try {
    const {
      student_id, category_id,
      talent_name, level, description
    } = req.body;

    const { data, error } = await supabase
      .from('student_talents')
      .insert({
        student_id, category_id,
        talent_name,
        level: level || 'Pemula',
        description: description || null,
        discovered_by: req.user.id,
        discovered_date: new Date()
      })
      .select()
      .single();

    if (error) throw error;

    res.json({
      status: 'ok',
      pesan: 'Bakat berhasil ditambahkan',
      data
    });

  } catch (err) {
    res.status(500).json({
      status: 'error',
      pesan: err.message
    });
  }
};

exports.editBakat = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('student_talents')
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
      pesan: 'Bakat berhasil diperbarui',
      data
    });

  } catch (err) {
    res.status(500).json({
      status: 'error',
      pesan: err.message
    });
  }
};

exports.hapusBakat = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('student_talents')
      .update({
        is_active: false,
        updated_at: new Date()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      status: 'ok',
      pesan: 'Bakat diarsipkan',
      data
    });

  } catch (err) {
    res.status(500).json({
      status: 'error',
      pesan: err.message
    });
  }
};

exports.penjurusanSiswa = async (req, res) => {
  try {
    const { siswa_id } = req.params;

    const { data, error } = await supabase
      .from('student_majors')
      .select(`
        *,
        academic_years (year, semester),
        users (name)
      `)
      .eq('student_id', siswa_id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ status: 'ok', data });

  } catch (err) {
    res.status(500).json({
      status: 'error',
      pesan: err.message
    });
  }
};

exports.tambahPenjurusan = async (req, res) => {
  try {
    const {
      student_id, academic_year_id,
      major_name, reason,
      recommendation, test_score
    } = req.body;

    const { data, error } = await supabase
      .from('student_majors')
      .insert({
        student_id, academic_year_id,
        major_name,
        reason: reason || null,
        recommendation: recommendation || null,
        test_score: test_score || null,
        approved_by: req.user.id,
        approved_at: new Date()
      })
      .select()
      .single();

    if (error) throw error;

    res.json({
      status: 'ok',
      pesan: `Siswa dijuruskan ke ${major_name}`,
      data
    });

  } catch (err) {
    res.status(500).json({
      status: 'error',
      pesan: err.message
    });
  }
};

exports.rekomendasiJurusan = async (req, res) => {
  try {
    const { siswa_id } = req.params;

    const { data: nilai } = await supabase
      .from('grades')
      .select('final_grade, subjects(name)')
      .eq('student_id', siswa_id)
      .eq('is_archived', false);

    const { data: bakat } = await supabase
      .from('student_talents')
      .select('talent_name, level, talent_categories(name)')
      .eq('student_id', siswa_id)
      .eq('is_active', true);

    const rataRata = nilai?.length > 0
      ? nilai.reduce(
          (sum, n) => sum + (n.final_grade || 0), 0
        ) / nilai.length
      : 0;

    const kategori = bakat?.map(
      b => b.talent_categories?.name?.toLowerCase()
    ) || [];

    const rekomendasi = [];

    if (rataRata >= 80) {
      rekomendasi.push({
        jurusan: 'Akademik Unggulan',
        alasan: `Rata-rata nilai tinggi: ${Math.round(rataRata)}`,
        prioritas: 1
      });
    }

    if (kategori.includes('olahraga')) {
      rekomendasi.push({
        jurusan: 'Olahraga & Kesehatan',
        alasan: 'Memiliki bakat olahraga',
        prioritas: 2
      });
    }

    if (kategori.includes('seni')) {
      rekomendasi.push({
        jurusan: 'Seni & Budaya',
        alasan: 'Memiliki bakat seni',
        prioritas: 2
      });
    }

    if (kategori.includes('agama')) {
      rekomendasi.push({
        jurusan: 'Keagamaan',
        alasan: 'Memiliki bakat agama',
        prioritas: 1
      });
    }

    if (rekomendasi.length === 0) {
      rekomendasi.push({
        jurusan: 'Umum',
        alasan: 'Perlu eksplorasi lebih lanjut',
        prioritas: 3
      });
    }

    rekomendasi.sort((a, b) => a.prioritas - b.prioritas);

    res.json({
      status: 'ok',
      data: {
        rata_rata_nilai: Math.round(rataRata),
        total_bakat: bakat?.length || 0,
        bakat_dimiliki: bakat,
        rekomendasi_jurusan: rekomendasi
      }
    });

  } catch (err) {
    res.status(500).json({
      status: 'error',
      pesan: err.message
    });
  }
};

exports.prestasiSiswa = async (req, res) => {
  try {
    const { siswa_id } = req.params;

    const { data, error } = await supabase
      .from('achievements')
      .select('*, users(name)')
      .eq('student_id', siswa_id)
      .order('event_date', { ascending: false });

    if (error) throw error;

    res.json({
      status: 'ok',
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

exports.tambahPrestasi = async (req, res) => {
  try {
    const {
      student_id, title, category,
      level, rank, event_name,
      event_date, organizer, notes
    } = req.body;

    const { data, error } = await supabase
      .from('achievements')
      .insert({
        student_id, title,
        category: category || 'Umum',
        level: level || 'Sekolah',
        rank: rank || null,
        event_name: event_name || null,
        event_date: event_date || null,
        organizer: organizer || null,
        notes: notes || null,
        verified_by: req.user.id
      })
      .select()
      .single();

    if (error) throw error;

    res.json({
      status: 'ok',
      pesan: 'Prestasi berhasil ditambahkan',
      data
    });

  } catch (err) {
    res.status(500).json({
      status: 'error',
      pesan: err.message
    });
  }
};

exports.konselingSiswa = async (req, res) => {
  try {
    const { siswa_id } = req.params;

    const { data, error } = await supabase
      .from('counseling_records')
      .select('*, users(name)')
      .eq('student_id', siswa_id)
      .order('session_date', { ascending: false });

    if (error) throw error;

    res.json({
      status: 'ok',
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

exports.tambahKonseling = async (req, res) => {
  try {
    const {
      student_id, topic, type,
      notes, follow_up, next_session
    } = req.body;

    const { data, error } = await supabase
      .from('counseling_records')
      .insert({
        student_id,
        counselor_id: req.user.id,
        topic, type: type || 'Umum',
        notes: notes || null,
        follow_up: follow_up || null,
        next_session: next_session || null,
        session_date: new Date(),
        is_confidential: true
      })
      .select()
      .single();

    if (error) throw error;

    res.json({
      status: 'ok',
      pesan: 'Sesi konseling berhasil dicatat',
      data
    });

  } catch (err) {
    res.status(500).json({
      status: 'error',
      pesan: err.message
    });
  }
};
