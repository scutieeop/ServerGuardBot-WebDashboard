const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userID: {
    type: String,
    required: true
  },
  guildID: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true
  },
  nickname: {
    type: String,
    default: null
  },
  originalName: {
    type: String,
    default: null
  },
  age: {
    type: Number,
    default: null
  },
  gender: {
    type: String,
    enum: ['erkek', 'kadin', 'belirtilmemis'],
    default: 'belirtilmemis'
  },
  device: {
    type: String,
    default: 'bilinmiyor'
  },
  registrarID: {
    type: String,
    default: null
  },
  registrationDate: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Bileşik indeks, kullanıcı ID ve sunucu ID'sine göre hızlı arama yapmak için
userSchema.index({ userID: 1, guildID: 1 }, { unique: true });

module.exports = mongoose.model('User', userSchema); 