import app from './app'

const PORT: number = parseInt(process.env.PORT || '9876')

app.server.listen(PORT, async () => {
  console.info('Baileys Cloud API listening on port:', PORT)
  console.info('Successful started app!')
})

export default app
