type LogLevel = 'info' | 'warn' | 'error'

function log(level: LogLevel, message: string, data?: unknown) {
  const prefix = `[Shelfly:${level}]`
  if (level === 'error') {
    console.error(prefix, message, data ?? '')
  } else if (level === 'warn') {
    console.warn(prefix, message, data ?? '')
  } else {
    console.info(prefix, message, data ?? '')
  }
}

export const logger = {
  info: (message: string, data?: unknown) => log('info', message, data),
  warn: (message: string, data?: unknown) => log('warn', message, data),
  error: (message: string, data?: unknown) => log('error', message, data),
}
