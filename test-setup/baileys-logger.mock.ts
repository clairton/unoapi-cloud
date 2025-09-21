const mockLogger = {
  level: 'info',
  child: (_obj?: Record<string, unknown>) => mockLogger,
  trace: () => {},
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
}

export default mockLogger

