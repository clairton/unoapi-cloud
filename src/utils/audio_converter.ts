import os from 'os'
import path from 'path'
import { writeFileSync, unlinkSync, readFileSync } from 'fs'
import { v1 as uuid } from 'uuid'
import { CONVERT_AUDIO_FFMPEG_PARAMS, SEND_AUDIO_WAVEFORM, WEBHOOK_TIMEOUT_MS } from '../defaults'
import { spawn } from 'child_process'
import logger from '../services/logger'
import decode from 'audio-decode'

export default async function(url: string): Promise<{ buffer: Buffer, waveform: Uint8Array | undefined }> {
  const options = { signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS) }
  const response = await fetch(url, options)
  if (!response?.ok) {
    throw `Erro on open ${url}: ${await response?.text()}`
  }
  const inputBuffer = Buffer.from(await response.arrayBuffer())
  const inputFile = path.join(os.tmpdir(), `${uuid()}`)
  const outputFile = path.join(os.tmpdir(), `${uuid()}`)
  writeFileSync(inputFile, inputBuffer)
  return new Promise<{ buffer: Buffer, waveform: Uint8Array | undefined }>(async (resolve, reject) => {
    const ff = await spawn(
      'ffmpeg',
      ['-y', '-i', inputFile, ...CONVERT_AUDIO_FFMPEG_PARAMS, outputFile],
      { timeout: WEBHOOK_TIMEOUT_MS }
    )
    ff.on('exit', async (code, signal) => {
      if(signal) {
        code = parseInt(signal)
      }
      if (code === 0) {
        const buffer = readFileSync(outputFile)
        let waveform
        if (SEND_AUDIO_WAVEFORM) {
          waveform = await getAudioWaveform(buffer)
        }
        unlinkSync(outputFile)
        unlinkSync(inputFile)
        return resolve({ buffer, waveform })
      }
      reject(code)
    })
  })
}

async function getAudioWaveform(buffer: Buffer) {
	try {
		const audioBuffer = await decode(buffer)
		const rawData = audioBuffer.getChannelData(0)
		const samples = 64
		const blockSize = Math.floor(rawData.length / samples)
		const filteredData: number[] = []
		for (let i = 0; i < samples; i++) {
			const blockStart = blockSize * i
			let sum = 0
			for (let j = 0; j < blockSize; j++) {
				sum = sum + Math.abs(rawData[blockStart + j])
			}
			filteredData.push(sum / blockSize)
		}
		const multiplier = Math.pow(Math.max(...filteredData), -1)
		const normalizedData = filteredData.map(n => n * multiplier)
		return new Uint8Array(normalizedData.map(n => Math.floor(100 * n)))
	} catch (e) {
		logger.warn('Failed to generate waveform: %s', e)
	}
}