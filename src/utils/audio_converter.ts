import os from 'os'
import path from 'path'
import { writeFileSync, unlinkSync, readFileSync } from 'fs'
import { v1 as uuid } from 'uuid'
import { CONVERT_AUDIO_FFMPEG_PARAMS, WEBHOOK_TIMEOUT_MS } from '../defaults'
import { spawn } from 'child_process'

export default async function(url: string): Promise<Buffer | undefined> {
  const options = { signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS) }
  const response = await fetch(url, options)
  if (!response?.ok) {
    throw `Erro on open ${url}: ${await response?.text()}`
  }
  const inputBuffer = Buffer.from(await response.arrayBuffer())
  const inputFile = path.join(os.tmpdir(), `${uuid()}`)
  const outputFile = path.join(os.tmpdir(), `${uuid()}`)
  writeFileSync(inputFile, inputBuffer)
  return new Promise<Buffer>(async (resolve, reject) => {
    const ff = await spawn(
      'ffmpeg',
      ['-y', '-i', inputFile, ...CONVERT_AUDIO_FFMPEG_PARAMS, outputFile],
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