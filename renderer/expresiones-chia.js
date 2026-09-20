// Catálogo de caritas de Chía (ver #cara-chia en index.html y
// mostrarExpresionChia en renderer.js). Solo datos — nada aquí decide
// CUÁNDO se usa cada expresión. Eso queda para más adelante, cuando haya
// algo real que decida el estado de ánimo de Chía (horario, eventos de la
// app, o algún día una IA local que hable con el usuario). Por ahora
// renderer.js solo usa "relajado" con un parpadeo periódico, para que no
// se sienta completamente estática mientras no hay nada que la mueva de
// verdad — pero el resto del set ya queda listo para ese momento.
//
// ASCII plano en vez de emojis o imágenes: se ve igual en cualquier
// sistema, sin depender de qué emojis tenga instalados Windows.
//
// Formato fijo "[ ojoIzq boca ojoDer ]" — un solo renglón, 5 piezas
// separadas por espacios, con los corchetes como marco de la cara. Esto
// no es solo estético: renderer.js parte cada cara por espacios para
// armar el parpadeo (le pone "-" a las posiciones 2 y 4), así que toda
// expresión nueva que se agregue debe seguir este mismo formato de 5
// piezas para que el parpadeo le funcione automáticamente.
const EXPRESIONES_CHIA = {
  relajado:          { nombre: 'Relajado',             cara: '[ ^ - ^ ]' },
  feliz:             { nombre: 'Feliz',                cara: '[ ^ u ^ ]' },
  muyFeliz:          { nombre: 'Muy feliz',            cara: '[ ^ U ^ ]' },
  triste:            { nombre: 'Triste',               cara: '[ ; n ; ]' },
  decepcionado:      { nombre: 'Decepcionado',         cara: '[ - . - ]' },
  enojado:           { nombre: 'Enojado',              cara: '[ V - V ]' },
  muyEnojado:        { nombre: 'Muy enojado',          cara: '[ > = < ]' },
  sorprendido:       { nombre: 'Sorprendido',          cara: '[ o O o ]' },
  atonito:           { nombre: 'Atónito',              cara: '[ O O O ]' },
  preocupado:        { nombre: 'Preocupado',           cara: '[ ~ - ~ ]' },
  nervioso:          { nombre: 'Nervioso',             cara: '[ ^ ~ ^ ]' },
  dudaConfuso:       { nombre: 'Duda / Confuso',       cara: '[ ? - ? ]' },
  asustado:          { nombre: 'Asustado',             cara: '[ @ o @ ]' },
  esceptico:         { nombre: 'Escéptico',            cara: '[ - / - ]' },
  cansadoAgotado:    { nombre: 'Cansado / Agotado',    cara: '[ = - = ]' },
  pensativo:         { nombre: 'Pensativo',            cara: '[ ^ ... ^ ]' },
  guinoCoqueto:      { nombre: 'Guiño / Coqueto',      cara: '[ ; u ^ ]' },
  malvadoSarcastico: { nombre: 'Malvado / Sarcástico', cara: '[ ^ / ^ ]' },
  avergonzado:       { nombre: 'Avergonzado',          cara: '[ * u * ]' },
  dormido:           { nombre: 'Dormido',              cara: '[ z - z ]' }
};
