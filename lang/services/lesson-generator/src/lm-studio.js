export async function generateWithRetry(_kind, _payload, fallbackFactory) {
  void _kind
  void _payload
  const fallback = fallbackFactory()
  return {
    ...fallback,
    _meta: {
      ...(fallback?._meta || {}),
      fallback: true,
      localOnly: true,
    },
  }
}
