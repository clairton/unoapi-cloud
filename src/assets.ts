import express from 'express'

const router = express.Router()

const supportedAssets = ['svg', 'png', 'jpg', 'png', 'jpeg', 'mp4', 'ogv']

const assetExtensionRegex = () => {
  const formattedExtensionList = supportedAssets.join('|')
  return new RegExp(`/.+\.(${formattedExtensionList})$`)
}

router.get(assetExtensionRegex(), (req, res) => {
  res.redirect(303, `http://localhost:5173/ui/assets${req.path}`)
})

export default router
