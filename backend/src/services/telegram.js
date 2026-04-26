// Telegram Bot - Diaktifkan setelah deploy ke server
// Sementara dinonaktifkan untuk development lokal

const kirimPesan = async (chatId, pesan) => {
  // Akan aktif setelah deploy
  console.log(`📱 Pesan ke ${chatId}: ${pesan}`);
};

module.exports = { bot: null, kirimPesan };
