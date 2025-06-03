const sharp = require('sharp');
const fetch = require('node-fetch');

const BASE_IMAGE_URL = 'https://github.com/playanna/Samsara-bot/blob/9b563ddb38ad41d06167b23fd46300fa31013f42/images/realms/secthall/japanese_nihonga_painting_abou%20(19).jpeg?raw=true';
// load the image in a smaller size to reduce memory usage

let cachedBaseImageBuffer = null;

// Fetch and cache base image
async function getBaseImageBuffer() {
  if (!cachedBaseImageBuffer) {
    const res = await fetch(BASE_IMAGE_URL);
    cachedBaseImageBuffer = await res.buffer();
  }
  return cachedBaseImageBuffer;
}

async function generateCircularAvatarBuffer(avatarBuffer, size) {
  return sharp(avatarBuffer)
    .resize(size, size)
    .composite([
      {
        input: Buffer.from(
          `<svg><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/></svg>`
        ),
        blend: 'dest-in'
      }
    ])
    .png()
    .toBuffer();
}

module.exports = async function generateCultivationImage(userAvatarURL) {
  // Load base image and avatar in parallel
  const [baseBuffer, avatarResponse] = await Promise.all([
    getBaseImageBuffer(),
    fetch(userAvatarURL)
  ]);

  const avatarBuffer = await avatarResponse.buffer();
  const circularAvatar = await generateCircularAvatarBuffer(avatarBuffer, 150);

  // Composite avatar onto base
  const finalImage = await sharp(baseBuffer)
    .composite([
      {
        input: circularAvatar,
        top: 38,
        left: 296
      }
    ])
    .png()
    .toBuffer();

  return finalImage;
};
