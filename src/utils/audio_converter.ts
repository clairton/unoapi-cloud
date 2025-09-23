import os from 'os'
import path from 'path'
import { writeFileSync, unlinkSync, readFileSync } from 'fs'
import { v1 as uuid } from 'uuid'
import { WEBHOOK_TIMEOUT_MS } from '../defaults'
import { spawn } from 'child_process'

export default async function(url: string): Promise<Buffer | undefined> {
  const options = { signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS) }
  const response = await fetch(url, options)
  if (!response?.ok) {
    throw `Erro on open: ${await response?.text()}`
  }
  const inputBuffer = Buffer.from(await response.arrayBuffer())
  const inputFile = path.join(os.tmpdir(), `${uuid()}.mp3`)
  const outputFile = path.join(os.tmpdir(), `${uuid()}.ogg`)
  writeFileSync(inputFile, inputBuffer)
  return new Promise<Buffer>(async (resolve, reject) => {
    const ff = await spawn(
      'ffmpeg', 
      ['-y', '-i', inputFile, '-ac', '1', '-ar', '16000', '-c:a', 'libopus', '-b:a', '64k', '-vn', '-f', 'ogg', outputFile],
      { timeout: WEBHOOK_TIMEOUT_MS }
    )
    ff.on('exit', (code, signal) => {
      if(signal) {
        code = parseInt(signal)
      }
    
      if (code === 0) {
        const buffer = readFileSync(outputFile)
        unlinkSync(outputFile)
        unlinkSync(inputFile)
        return resolve(buffer)
      }
      reject(code)
    })
  })
}