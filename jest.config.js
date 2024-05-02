import dotenv from 'dotenv'

dotenv.config({ path: '.env.test' })

export default {
  preset: 'ts-jest',
  testEnvironment: 'node'
}
