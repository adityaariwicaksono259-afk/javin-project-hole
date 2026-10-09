// GET /api/announce — alias ke announce/list
// (biar kompatibel sama inbox.js yang panggil endpoint ini)
export { onRequestGet } from './list.js';
