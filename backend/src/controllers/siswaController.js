const supabase = require('../config/database');
const xlsx = require('xlsx');
const fs = require('fs');

// Semua Siswa
exports.semuaSiswa = async (req, res) => {
  try {
    const { kelas_id, asrama_id, status, cari } = req.query;

    let query = supabase
      .from('students')
      .select(`
        *,
        users (id, name, email, phone, photo),
        classrooms (id, name),
        dormitories (id, name)
      `)
      .order('created_at', { ascending: false });

    if (kelas_id) query = query.eq('classroom_id', kelas_id);
    if (asrama_id) query = query.eq('dormitory_id', asrama_id);
    if (status) query = query.eq('status', status);
    else query = query.eq('status', 'aktif');

    const { data, error } = await query;
    if (error) throw error;

    let hasil = data;
    if (cari) {
      hasil = data.filter(s =>
        s.users?.name?.toLowerCase()
          .includes(cari.toLowerCase()) ||
        s.nis?.includes(cari)
      );
    }

    res.json({
      status: 'ok',
      total: hasil.length,
      data: hasil
    });

  } catch (err) {
    res.status(500).json({
      status: 'error',
      pesan: err.message
    });
  }
};

// Detail Siswa
exports.detailSiswa = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('students')
      .select(`
        *,
        users (id, name, email, phone, photo, gender, birth_date),
        classrooms (id, name),
        dormitories (id, name),
        rooms (id, name),
        student_parents (
          id, relation, is_primary,
          users (id, name, phone, telegram_chat_id)
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    res.json({ status: 'ok', data });

  } catch (err) {
    res.status(500).json({
      status: 'error',
      pesan: err.message
    });
  }
};

// Scan Kartu
exports.scanKartu = async (req, res) => {
  try {
    const { kartu_id } = req.params;

    const { data, error } = await supabase
      .from('students')
      .select(`
        *,
        users (name, photo, gender),
        classrooms (name),
        dormitories (name),
        rooms (name)
      `)
      .or(`nfc_id.eq.${kartu_id},barcode_id.eq.${kartu_id},nis.eq.${kartu_id}`)
      .single();

    if (error || !data) {
      return res.status(404).json({
        status: 'error',
        pesan: 'Kartu tidak dikenali'
      });
    }

    await supabase.from('scan_logs').insert({
      student_id: data.id,
      scanned_by: req.user.id,
      scan_time: new Date(),
      purpose: 'cek_data'
    });

    res.json({ status: 'ok', data });

  } catch (err) {
    res.status(500).json({
      status: 'error',
      pesan: err.message
    });
  }
};

// Tambah Siswa
exports.tambahSiswa = async (req, res) => {
  try {
    const {
      name, email, phone, gender,
      birth_date, birth_place, address,
      nis, nisn, classroom_id,
      dormitory_id, room_id, blood_type,
      religion, entry_date
    } = req.body;

    const { data: userBaru, error: errorUser } =
      await supabase
        .from('users')
        .insert({
          name, email: email || null,
          phone: phone || null,
          gender: gender || null,
          birth_date: birth_date || null,
          birth_place: birth_place || null,
          address: address || null,
          role_id: 11,
          is_active: true
        })
        .select()
        .single();

    if (errorUser) throw errorUser;

    const { data: siswaBaru, error: errorSiswa } =
      await supabase
        .from('students')
        .insert({
          user_id: userBaru.id,
          nis, nisn: nisn || null,
          classroom_id: classroom_id || null,
          dormitory_id: dormitory_id || null,
          room_id: room_id || null,
          blood_type: blood_type || null,
          religion: religion || 'Islam',
          entry_date: entry_date || null,
          status: 'aktif',
          created_by: req.user.id
        })
        .select()
        .single();

    if (errorSiswa) throw errorSiswa;

    res.json({
      status: 'ok',
      pesan: `Siswa ${name} berhasil ditambahkan`,
      data: siswaBaru
    });

  } catch (err) {
    res.status(500).json({
      status: 'error',
      pesan: err.message
    });
  }
};

// Edit Siswa
exports.editSiswa = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const { data, error } = await supabase
      .from('students')
      .update({
        ...updateData,
        updated_at: new Date()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      status: 'ok',
      pesan: 'Data siswa berhasil diperbarui',
      data
    });

  } catch (err) {
    res.status(500).json({
      status: 'error',
      pesan: err.message
    });
  }
};

// Arsip Siswa
exports.arsipSiswa = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('students')
      .update({
        status: 'alumni',
        updated_at: new Date()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      status: 'ok',
      pesan: 'Siswa berhasil diarsipkan',
      data
    });

  } catch (err) {
    res.status(500).json({
      status: 'error',
      pesan: err.message
    });
  }
};

// Import Excel
exports.importExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        pesan: 'File Excel harus diupload'
      });
    }

    const workbook = xlsx.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const dataSiswa = xlsx.utils.sheet_to_json(sheet);

    const hasil = { berhasil: 0, gagal: 0, detail_gagal: [] };

    for (const baris of dataSiswa) {
      try {
        const { data: userBaru } = await supabase
          .from('users')
          .insert({
            name: baris.NAMA,
            gender: baris.JENIS_KELAMIN || null,
            role_id: 11,
            is_active: true
          })
          .select()
          .single();

        await supabase.from('students').insert({
          user_id: userBaru.id,
          nis: baris.NIS.toString(),
          status: 'aktif',
          created_by: req.user.id
        });

        hasil.berhasil++;
      } catch (err) {
        hasil.gagal++;
        hasil.detail_gagal.push({
          nis: baris.NIS,
          error: err.message
        });
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
