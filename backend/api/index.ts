import app from '../src/app'

// Vercel expone esta función bajo /api. El servidor local conserva sus rutas
// sin prefijo para no alterar los contratos usados durante desarrollo.
export default app.basePath('/api')
