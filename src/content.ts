// Todo el contenido editable de la carta vive aquí.

export interface OrnamentData {
  id: string;
  label: string;
  message: string;
  color: string;
  shade: string;
}

export const ornaments: OrnamentData[] = [
  {
    id: 'amor',
    label: 'Amor',
    message: 'Del que no se compra ni se envuelve. En esta casa siempre ha habido de sobra.',
    color: '#d8343f',
    shade: '#6d0f1a',
  },
  {
    id: 'salud',
    label: 'Salud',
    message: 'El regalo más silencioso de todos. Solo pido que nos siga acompañando.',
    color: '#2f9e6e',
    shade: '#0b3a28',
  },
  {
    id: 'union',
    label: 'Unión familiar',
    message: 'Podemos pensar distinto en casi todo, pero la mesa siempre es la misma.',
    color: '#e9bf6c',
    shade: '#7a5216',
  },
  {
    id: 'felicidad',
    label: 'Felicidad',
    message: 'Resultó que se parecía mucho a un almuerzo cualquiera con ustedes.',
    color: '#f4ead8',
    shade: '#8d7f6a',
  },
  {
    id: 'tranquilidad',
    label: 'Tranquilidad',
    message: 'Saber que, pase lo que pase, ustedes están. Eso no viene en ninguna tienda.',
    color: '#4f7fd1',
    shade: '#14264f',
  },
];

export const ornamentsComplete =
  'Las cinco. Con esto ya tengo más regalos de los que cabe en cualquier lista.';

export interface WishData {
  id: string;
  label: string;
}

export const wishes: WishData[] = [
  { id: 'w-salud', label: 'Más salud para todos.' },
  { id: 'w-union', label: 'Más unión familiar.' },
  { id: 'w-comidas', label: 'Más almuerzos y comidas juntos.' },
  { id: 'w-viajes', label: 'Más viajes y experiencias.' },
  { id: 'w-risas', label: 'Más risas.' },
  { id: 'w-recuerdos', label: 'Más momentos que se conviertan en recuerdos.' },
  { id: 'w-anos', label: 'Muchos años más compartiendo en familia.' },
];

export const wishesComplete = 'Lista completa. Y lo mejor: ninguno de estos viene con factura.';

export interface Meter {
  label: string;
  value: number; // 0-100
  text: string;
}

export interface GiftData {
  id: string;
  number: string;
  name: string;
  short: string;
  description: string;
  justification?: string;
  meters?: [Meter, Meter];
  facts?: { label: string; value: string }[];
  widget?: 'europa' | 'pants' | 'surprise';
  color: string;
  ribbon: string;
  addedToast: string;
  confetti?: boolean;
}

export const gifts: GiftData[] = [
  {
    id: 'g-osmo',
    number: '01',
    name: 'DJI Osmo Pocket 4P',
    short: 'Osmo Pocket 4P',
    description: 'Para seguir capturando momentos, viajes, experiencias y recuerdos familiares.',
    justification:
      'Técnicamente, no es un regalo para mí. Es una inversión en la conservación de los recuerdos familiares.',
    meters: [
      { label: 'Necesidad', value: 14, text: 'Baja' },
      { label: 'Ganas de tenerla', value: 93, text: 'Considerablemente altas' },
    ],
    color: '#a51d2a',
    ribbon: '#e9bf6c',
    addedToast: 'Anotado. Prometo grabarlos a todos por su lado bueno.',
  },
  {
    id: 'g-viajes',
    number: '02',
    name: 'Más viajes y experiencias juntos en familia',
    short: 'Más viajes en familia',
    description:
      'Para seguir conociendo lugares, probando cosas nuevas y sumando historias que después contamos en la mesa.',
    facts: [
      { label: 'Precio', value: 'Lo de menos' },
      { label: 'Requisito', value: 'Que vayamos todos' },
    ],
    color: '#c9973c',
    ribbon: '#0f3d2e',
    addedToast: 'Agregado. El destino da igual, mientras sea con ustedes.',
  },
  {
    id: 'g-pantalon',
    number: '03',
    name: 'Pantalón convertible Columbia',
    short: 'Pantalón convertible',
    description: 'Un pantalón de esos que se convierten en pantaloneta quitándoles la parte inferior.',
    justification: 'Dos prendas por el precio de una. No es consumismo, es optimización de recursos.',
    meters: [
      { label: 'Necesidad', value: 36, text: 'Media, tirando a baja' },
      { label: 'Ganas', value: 82, text: 'Altas, en dos presentaciones' },
    ],
    widget: 'pants',
    color: '#17694a',
    ribbon: '#d8343f',
    addedToast: 'Anotado. Dos prendas, una sola línea en la carta.',
  },
  {
    id: 'g-europa',
    number: '04',
    name: 'Una contribución para un tiquete a Europa',
    short: 'Aporte para Europa',
    description:
      'No tiene que ser el tiquete completo. Cualquier aporte al fondo internacional de aventuras será recibido con muchísimo cariño.',
    justification:
      'Los recuerdos no ocupan espacio en la habitación y, además, viajar también es una forma de educación.',
    meters: [
      { label: 'Necesidad', value: 22, text: 'Discutible' },
      { label: 'Ganas', value: 97, text: 'Intercontinentales' },
    ],
    widget: 'europa',
    color: '#1d4f8f',
    ribbon: '#f4ead8',
    addedToast: 'Anotado. Prometo traer imanes para la nevera.',
  },
  {
    id: 'g-filamentos',
    number: '05',
    name: 'Filamentos para impresión 3D',
    short: 'Filamentos 3D',
    description:
      'Unos cuantos rollos de filamento para seguir imprimiendo ideas, repuestos y uno que otro invento para la casa.',
    justification:
      'No es un gasto: es materia prima. Con esto, los próximos regalos de la familia los fabrico yo mismo.',
    meters: [
      { label: 'Necesidad', value: 41, text: 'Según la impresora, urgente' },
      { label: 'Ganas', value: 88, text: 'Capa por capa, altísimas' },
    ],
    color: '#d9722b',
    ribbon: '#f4ead8',
    addedToast: 'Anotado. Cualquier color sirve: la impresora no es exigente.',
  },
  {
    id: 'g-sorpresa',
    number: '06',
    name: 'Una sorpresa',
    short: 'Una sorpresa',
    description: 'Porque tampoco quiero limitar la creatividad de nadie.',
    widget: 'surprise',
    color: '#5b2a86',
    ribbon: '#e9bf6c',
    addedToast: 'Sorpresa agregada. No sé qué es, pero ya me gusta.',
    confetti: true,
  },
];

export const surpriseMessage = 'Un abrazo también cuenta como regalo.';

export const justifications: string[] = [
  'Resolución 001: todo regalo que produzca recuerdos se clasifica como patrimonio familiar.',
  'Concepto técnico: una cámara que graba a la familia es, para todos los efectos, de la familia.',
  'Dictamen: viajar amplía la cultura general. Oponerse sería ir en contra de la educación.',
  'Circular interna: un pantalón que son dos reduce el equipaje y, por lo tanto, el estrés familiar.',
  'Informe de producción: con filamento suficiente, este departamento puede imprimir sus propios repuestos.',
  'Aclaración: este departamento no recibe sobornos, pero sí abrazos.',
  'Nota final: todas las solicitudes anteriores pueden reemplazarse por un almuerzo en familia.',
];

export const budgetAnswer = 'Por motivos estratégicos, esta información será responsabilidad del patrocinador.';
export const nothingAnswer = 'Perfecto, con tenerlos a ustedes ya gané.';

// Mensajes ocultos en los regalos 3D del árbol.
export const sceneGiftMessages: string[] = [
  'Este todavía no se abre. Paciencia, que falta para el 24.',
  'Sacudir los regalos no adelanta la Navidad. Ya lo intenté.',
  'Este pesa sospechosamente parecido a unas medias.',
  'Contenido: un abrazo. Frágil. Manipular con cariño.',
  'Aquí solo hay cariño empacado. Y un poquito de icopor.',
  'Vas muy bien explorando. La carta de verdad está en el botón.',
];

export const starMessage = 'Encontraste la estrella. Pide un deseo (ojalá uno que no se pueda envolver).';

export const europaSteps: string[] = [
  'Aporte de buena energía recibido. El fondo lo agradece.',
  'Vamos bien. A este ritmo llego a Europa caminando.',
  'El comité (yo) celebra su generosidad simbólica.',
  'Fondo casi lleno de ganas. Lo demás es un detalle logístico.',
  'Falta el 1 %. Curiosamente, es la parte del tiquete.',
];
