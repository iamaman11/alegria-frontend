/**
 * Conditional Logger for Development/Production
 *
 * В development: выводит все логи
 * В production: только errors (или вообще ничего, т.к. next.config.js удаляет console)
 */

const isDev = process.env.NODE_ENV === 'development'

export const logger = {
  log: (...args: any[]) => {
    if (isDev) {
      console.log(...args)
    }
  },

  warn: (...args: any[]) => {
    if (isDev) {
      console.warn(...args)
    }
  },

  error: (...args: any[]) => {
    // Errors всегда логируем (или отправляем в external service)
    console.error(...args)
  },

  info: (...args: any[]) => {
    if (isDev) {
      console.info(...args)
    }
  },

  debug: (...args: any[]) => {
    if (isDev) {
      console.debug(...args)
    }
  },
}

// Экспортируем также для удобства
export default logger
