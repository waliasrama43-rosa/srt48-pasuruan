const { supabase, getTenantId } = require('../config/database');
const xlsx = require('xlsx');
const fs = require('fs');

exports.nilaiSiswa = async (req, res) => {
  try {
    const tenantId = getTenantId();
    const { id } = req.params;
    const { semester, year } = req.query;

    let query = supabase
      .from('grades')
      .select('*, subjects(name, code)')
      .eq('student_id', id)
      .eq('tenant_id', tenantId)
      .eq('is_archived', false)
      .order('created_at', { ascending: false });

    if (semester) query = query.eq('semester', semester);
    if (year)     query = query.eq('year', year);

    const { data, error } = await query;
    if (error) throw error;

    const rataRata = data?.length > 0
      ? Math.round(
          data.reduce((sum, n) =>
            sum + (n.final_grade || 0), 0
          ) / data.length
        )
      : 0;

    res.json({
      status: 'ok',
      rata_rata: rataRata,
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

exports.inputNilai = async (req, res) => {
  try {
    const tenantId = getTenantId();
    const { student_id, subject_id, semester, year, daily_score, mid_score, final_score, catatan } = req.body;

    const finalGrade = Math.round(
      (daily_score * 0.3) +
      (mid_score * 0.3) +
      (final_score * 0.4)
    );

    let gradeLetter = 'D';
    if (finalGrade >= 90) gradeLetter = 'A';
    else if (finalGrade >= 80) gradeLetter = 'B';
    else if (finalGrade >= 70) gradeLetter = 'C';

    const { data: sudahAda } = await supabase
      .from('grades')
      .select('id')
      .eq('student_id', student_id)
      .eq('subject_id', subject_id)
      .eq('semester', semester)
      .eq('year', year)
      .eq('tenant_id', tenantId)
      .single();

    let data, error;

    if (sudahAda) {
      ({ data, error } = await supabase
        .from('grades')
        .update({
          daily_score, mid_score,
          final_score, final_grade: finalGrade,
          grade_letter: gradeLetter,
          catatan: catatan || null,
          updated_at: new Date()
        })
        .eq('id', sudahAda.id)
        .select()
        .single());
    } else {
      ({ data, error } = await supabase
        .from('grades')
        .insert({
          tenant_id: tenantId,
          student_id, subject_id,
          semester, year,
          daily_score, mid_score,
          final_score, final_grade: finalGrade,
          grade_letter: gradeLetter,
          catatan: catatan || null,
          created_by: req.user.id
        })
        .select()
        .single());
    }

    if (error) throw error;

    res.json({
      status: 'ok',
      pesan: 'Nilai berhasil disimpan',
      data: { ...data, final_grade: finalGrade, grade_letter: gradeLetter }
    });

  } catch (err) {
    res.status(500).json({
      status: 'error',
      pesan: err.message
    });
  }
};

// Edit Nilai
exports.editNilai = async (req, res) => {
  try {
    const { id } = req.params;
    const { daily_score, mid_score, final_score } = req.body;

    const finalGrade = Math.round(
      (daily_score * 0.3) +
      (mid_score * 0.3) +
      (final_score * 0.4)
    );

    let gradeLetter = 'D';
    if (finalGrade >= 90) gradeLetter = 'A';
    else if (finalGrade >= 80) gradeLetter = 'B';
    else if (finalGrade >= 70) gradeLetter = 'C';

    const { data, error } = await supabase
      .from('grades')
      .update({
        ...req.body,
        final_grade: finalGrade,
        grade_letter: gradeLetter,
        updated_at: new Date()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      status: 'ok',
      pesan: 'Nilai berhasil diperbarui',
      data
    });

  } catch (err) {
    res.status(500).json({
      status: 'error',
      pesan: err.message
    });
  }
};

// Hapus Nilai
exports.hapusNilai = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('grades')
      .update({
        is_archived: true,
        updated_at: new Date()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      status: 'ok',
      pesan: 'Nilai berhasil diarsipkan',
      data
    });

  } catch (err) {
    res.status(500).json({
      status: 'error',
      pesan: err.message
    });
  }
};

exports.raporSiswa = async (req, res) => {
  try {
    const tenantId = getTenantId();
    const { id } = req.params;
    const { semester, year } = req.query;

    const { data: siswa } = await supabase
      .from('siswa')
      .select('nis, nisn, nama')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    const { data: nilai } = await supabase
      .from('grades')
      .select('*, subjects(name, code)')
      .eq('student_id', id)
      .eq('tenant_id', tenantId)
      .eq('semester', semester)
      .eq('year', year)
      .eq('is_archived', false)
      .order('created_at', { ascending: true });

    const rataRata = nilai?.length > 0
      ? Math.round(
          nilai.reduce((sum, n) =>
            sum + (n.final_grade || 0), 0
          ) / nilai.length
        )
      : 0;

    let predikat = 'Kurang';
    if (rataRata >= 90) predikat = 'Sangat Baik';
    else if (rataRata >= 80) predikat = 'Baik';
    else if (rataRata >= 70) predikat = 'Cukup';

    res.json({
      status: 'ok',
      data: {
        siswa,
        semester,
        year,
        nilai,
        rata_rata: rataRata,
        predikat
      }
    });

  } catch (err) {
    res.status(500).json({
      status: 'error',
      pesan: err.message
    });
  }
};

exports.rankingKelas = async (req, res) => {
  try {
    const tenantId = getTenantId();
    const { kelas_id } = req.params;
    const { semester, year } = req.query;

    const { data: siswaKelas } = await supabase
      .from('siswa')
      .select('id, nis, nama')
      .eq('asrama_id', kelas_id)
      .eq('tenant_id', tenantId)
      .eq('status_siswa', 'aktif');

    const ranking = [];

    for (const siswa of siswaKelas || []) {
      const { data: nilai } = await supabase
        .from('grades')
        .select('final_grade')
        .eq('student_id', siswa.id)
        .eq('semester', semester)
        .eq('year', year)
        .eq('is_archived', false);

      const rataRata = nilai?.length > 0
        ? Math.round(
            nilai.reduce((sum, n) =>
              sum + (n.final_grade || 0), 0
            ) / nilai.length
          )
        : 0;

      ranking.push({
        siswa_id: siswa.id,
        nama:     siswa.nama,
        nis:      siswa.nis,
        rata_rata: rataRata,
        jumlah_mapel: nilai?.length || 0
      });
    }

    ranking.sort((a, b) => b.rata_rata - a.rata_rata);
    ranking.forEach((r, i) => r.ranking = i + 1);

    res.json({
      status: 'ok',
      total: ranking.length,
      data: ranking
    });

  } catch (err) {
    res.status(500).json({
      status: 'error',
      pesan: err.message
    });
  }
};

// Import Nilai dari Excel
exports.importNilai = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        pesan: 'File Excel harus diupload'
      });
    }

    const workbook = xlsx.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const dataNilai = xlsx.utils.sheet_to_json(sheet);

    const hasil = { berhasil: 0, gagal: 0 };

    for (const baris of dataNilai) {
      try {
        const { data: siswa } = await supabase
          .from('students')
          .select('id')
          .eq('nis', baris.NIS.toString())
          .single();

        if (!siswa) continue;

        const finalGrade = Math.round(
          (baris.HARIAN * 0.3) +
          (baris.UTS * 0.3) +
          (baris.UAS * 0.4)
        );

        await supabase.from('grades').insert({
          student_id: siswa.id,
          subject_id: baris.SUBJECT_ID,
          semester: baris.SEMESTER,
          year: baris.TAHUN,
          daily_score: baris.HARIAN,
          mid_score: baris.UTS,
          final_score: baris.UAS,
          final_grade: finalGrade,
          created_by: req.user.id
        });

        hasil.berhasil++;
      } catch (err) {
        hasil.gagal++;
      }
    }

    fs.unlinkSync(req.file.path);

    res.json({
      status: 'ok',
      pesan: `Import selesai. ${hasil.berhasil} berhasil, ${hasil.gagal} gagal.`,
      hasil
    });

  } catch (err) {
    res.status(500).json({
      status: 'error',
      pesan: err.message
    });
  }
};
