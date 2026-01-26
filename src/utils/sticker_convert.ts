import sharp from 'sharp'

type StickerConvertOptions = {
  animated?: boolean
}

export const convertToWebpSticker = async (input: Buffer, opts: StickerConvertOptions = {}) => {
  const image = sharp(input, { animated: !!opts.animated })
  return image
    .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
    .webp({ lossless: !opts.animated, quality: 80, effort: 4 })
    .toBuffer()
}
