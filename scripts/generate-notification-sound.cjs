#!/usr/bin/env node
/**
 * Generador de som de notificação MP3 usando Web Audio API
 * Executar: node scripts/generate-notification-sound.js
 *
 * Cria um som "ding-dong" curto (~150ms) com dois tons (880Hz -> 660Hz)
 * que é compactado como MP3 via ffmpeg (se disponível) ou WAV.
 */
const fs = require("fs");
const path = require("path");

// Cabeçalho WAV
function createWav(samples, sampleRate) {
  const buffer = Buffer.alloc(44 + samples.length * 2);
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + samples.length * 2, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(samples.length * 2, 40);

  for (let i = 0; i < samples.length; i++) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(sample < 0 ? sample * 0x7fff : sample * 0x7fff, 44 + i * 2);
  }

  return buffer;
}

// Gerar som "ding-dong": 880Hz por 80ms, depois 660Hz por 70ms
function generateSound() {
  const sampleRate = 44100;
  const samples = [];

  // Tom 1: 880Hz por 80ms
  for (let i = 0; i < (80 * sampleRate) / 1000; i++) {
    const t = i / sampleRate;
    let s = Math.sin(2 * Math.PI * 880 * t);
    const envelope = Math.exp(-t * 15);
    samples.push(s * envelope * 0.6);
  }

  // Pequena pausa
  for (let i = 0; i < (10 * sampleRate) / 1000; i++) {
    samples.push(0);
  }

  // Tom 2: 660Hz por 70ms
  for (let i = 0; i < (70 * sampleRate) / 1000; i++) {
    const t = i / sampleRate;
    let s = Math.sin(2 * Math.PI * 660 * t);
    const envelope = Math.exp(-t * 20);
    samples.push(s * envelope * 0.5);
  }

  return createWav(samples, sampleRate);
}

const outputDir = path.join(__dirname, "..", "public", "sounds");
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const wavBuffer = generateSound();
const wavPath = path.join(outputDir, "notification.wav");
const mp3Path = path.join(outputDir, "notification.mp3");

fs.writeFileSync(wavPath, wavBuffer);
console.log(`Criado: ${wavPath} (${wavBuffer.length} bytes)`);

// Tentar converter WAV -> MP3 se ffmpeg estiver disponível
const { execSync } = require("child_process");
try {
  execSync(`ffmpeg -y -i "${wavPath}" -codec:a libmp3lame -qscale:a 9 "${mp3Path}"`, {
    stdio: "pipe",
  });
  if (fs.existsSync(mp3Path)) {
    const size = fs.statSync(mp3Path).size;
    console.log(`Convertido para MP3: ${mp3Path} (${size} bytes)`);
    // Remove o WAV se o MP3 foi criado
    fs.unlinkSync(wavPath);
  }
} catch (e) {
  console.log("ffmpeg não disponível — mantendo como WAV (funciona no navegador também).");
  console.log("Para usar MP3: instale ffmpeg (https://ffmpeg.org/download.html)");
}
