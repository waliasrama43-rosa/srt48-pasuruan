const supabase = require('../config/database');

exports.semuaPengumuman = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('announcements')
      .select('*, users(name)')
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

exports.tambahPengumuman = async (req, res) => {
  try {
    const { title, content, target } = req.body;

    const { data, error } = await supabase
      .from('announcements')
      .insert({
        title, content,
        target: target || 'semua',
        created_by: req.user.id,
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;

    res.json({
      status: 'ok',
      pesan: 'Pengumuman berhasil dibuat',
      data
    });

  } catch (err) {
    res.status(500).json({
      status: 'error',
      pesan: err.message
    });
  }
};

exports.editPengumuman = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('announcements')
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
      pesan: 'Pengumuman berhasil diperbarui',
      data
    });

  } catch (err) {
    res.status(500).json({
      status: 'error',
      pesan: err.message
    });
  }
};

exports.hapusPengumuman = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('announcements')
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
      pesan: 'Pengumuman berhasil dihapus',
      data
    });

  } catch (err) {
    res.status(500).json({
      status: 'error',
      pesan: err.message
    });
  }
};

exports.kirimBroadcast = async (req, res) => {
  try {
    const { title, content, target } = req.body;

    const { data: pengumuman, error } = await supabase
      .from('announcements')
      .insert({
        title, content,
        target: target || 'semua',
        created_by: req.user.id,
        is_active: true,
        is_broadcast: true
      })
      .select()
      .single();

    if (error) throw error;

    const { data: orangTua } = await supabase
      .from('users')
      .select('telegram_chat_id, name')
      .eq('role_id', 10)
      .eq('is_active', true)
      .not('telegram_chat_id', 'is', null);

    let terkirim = 0;
    let gagal = 0;

    if (orangTua && orangTua.length > 0) {
      const { bot } = require('../services/telegram');

      for (const ortu of orangTua) {
        try {
          await bot.sendMessage(
            ortu.telegram_chat_id,
            `📢 *PENGUMUMAN SRT 48 PASURUAN*\n\n` +
            `*${title}*\n\n` +
            `${content}\n\n` +
            `_${new Date().toLocaleDateString('id-ID')}_`,
            { parse_mode: 'Markdown' }
          );
          terkirim++;
        } catch (err) {
          gagal++;
        }
      }
    }

    res.json({
      status: 'ok',
      pesan: `Broadcast terkirim ke ${terkirim} orang tua`,
      data: {
        pengumuman,
        statistik: { terkirim, gagal }
      }
    });

  } catch (err) {
    res.status(500).json({
      status: 'error',
      pesan: err.message
    });
  }
};
