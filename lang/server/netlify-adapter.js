export function createNetlifyHandlerRoute(handler) {
  return async function netlifyHandlerRoute(req, res) {
    try {
      const body =
        req.method === 'GET' || req.method === 'HEAD'
          ? ''
          : typeof req.body === 'string'
            ? req.body
            : JSON.stringify(req.body ?? {})

      const result = await handler({
        httpMethod: req.method,
        headers: req.headers,
        body,
        path: req.path,
        rawUrl: req.originalUrl,
      })

      res.status(result?.statusCode || 200)
      Object.entries(result?.headers || {}).forEach(([key, value]) => {
        if (value !== undefined) {
          res.setHeader(key, value)
        }
      })
      res.send(result?.body || '')
    } catch (error) {
      res.status(500).json({
        error: error.message || 'Function execution failed.',
      })
    }
  }
}
