const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// 人物の切り抜きモデル（.tflite）を require() で読み込めるようにする（MARUMIE CAMERA と同じ）
config.resolver.assetExts.push('tflite');

module.exports = config;
