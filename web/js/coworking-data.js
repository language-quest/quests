// Contenido de «Conexión a las cuatro». Cada cadena hablada tiene un ID fijo:
// el audio estático se busca en assets/coworking/audio/<id>.mp3 (y <id>.slow.mp3).
const IMG = {
  reception: '../assets/coworking/reception.png',
  booth: '../assets/coworking/phone-booth.png',
  meeting: '../assets/coworking/meeting-room.png',
  windowDesk: '../assets/coworking/window-desk.png',
  outletDesk: '../assets/coworking/desk-with-outlet.png',
  sofa: '../assets/coworking/lounge-sofa.png',
  printer: '../assets/coworking/printer.png',
  cover: '../assets/coworking/cover.png',
};
export { IMG };

const L = (id, who, text) => ({ id, who, text });
const T = (id, text, react, fx, best) => ({ id, kind: 'text', text, best: !!best, react, fx: fx || {} });
const P = (id, img, react, fx, best, name) => ({ id, kind: 'img', img, best: !!best, react, fx: fx || {}, name });
const R = (id, text) => ({ id, text });

export const STEPS = [
  { id: 's0', scene: 0, type: 'choice',
    lines: [
      L('s0.intro', 'narr', 'Hoy es tu primer día en un espacio de coworking. A las cuatro tienes una videollamada importante. Antes necesitas una tarjeta, un lugar para trabajar, conexión a internet y tres copias de un documento.'),
      L('s0.lucia', 'Lucía', 'Aquí nadie sabe cómo funciona todo el primer día. Lo importante es preguntar.'),
      L('s0.client', 'Cliente', 'La reunión se adelanta. Empezamos hoy a las cuatro.'),
    ],
    cards: [
      T('s0.a', 'Me voy a casa.', R('s0.a.r', 'En casa tardarías demasiado. Decides quedarte y prepararlo todo paso a paso.')),
      T('s0.b', 'Me quedo. Voy paso a paso.', R('s0.b.r', 'Me quedo. Voy paso a paso.'), {}, true),
      T('s0.c', 'Espero sin preparar nada.', R('s0.c.r', 'Esperar no prepara la reunión. Decides empezar por la tarjeta de entrada.')),
    ] },

  { id: 's1', scene: 1, type: 'choice', usage: ['recepción'],
    lines: [L('s1.hero', 'Tú', 'Me quedo. Voy paso a paso.'), L('s1.lucia', 'Lucía', 'Recoge tu tarjeta en recepción.')],
    cards: [
      P('s1.a', IMG.reception, R('s1.a.r', 'Sí, esta es la recepción. Aquí te dan la tarjeta de entrada.'), { card: true }, true),
      P('s1.b', IMG.booth, R('s1.b.r', 'Esta es una cabina para hablar a solas. Aquí no dan tarjetas. La recepción está junto a la entrada.'), { card: true, peek: 'booth' }, false, 'la cabina'),
      P('s1.c', IMG.meeting, R('s1.c.r', 'Esta es una sala de reuniones para trabajar en grupo. La tarjeta se recoge en recepción.'), { card: true, peek: 'room' }, false, 'la sala de reuniones'),
    ] },

  { id: 's2', scene: 2, type: 'choice', usage: ['puesto', 'enchufe'], battery: true,
    lines: [L('s2.lucia', 'Lucía', 'Tu portátil tiene muy poca batería. Busca un puesto con enchufe.')],
    cards: [
      P('s2.a', IMG.windowDesk, R('s2.a.r', 'Este puesto está junto a la ventana, pero no tiene enchufe. El portátil sigue sin cargarse. Buscamos un cable alargador.'), { desk: 'window', cable: 'long' }, false, 'un puesto sin enchufe'),
      P('s2.b', IMG.outletDesk, R('s2.b.r', 'Este puesto tiene enchufe. Conectas el portátil y empieza a cargarse.'), { desk: 'outlet', cable: 'direct', charge: true }, true),
      P('s2.c', IMG.sofa, R('s2.c.r', 'Este sofá está libre, pero no es un puesto de trabajo y aquí no hay enchufe. Llevamos una mesa pequeña y un cable alargador.'), { desk: 'sofa', cable: 'long' }, false, 'el sofá'),
    ] },

  { id: 's3', scene: 3, type: 'choice', usage: ['puesto', 'enchufe', 'libre'],
    lines: [L('s3.dani', 'Dani', 'Perdona, ¿está libre este puesto? Me queda un uno por ciento de batería.')],
    cards: [
      T('s3.a', 'Sí, está libre. Puedes usar este enchufe.', R('s3.a.r', 'Gracias. Conecto el teléfono al enchufe y me siento en el puesto libre.'), { phone: true }, true),
      T('s3.b', 'Sí, está ocupado. Puedes usar la ventana.', R('s3.b.r', '“Libre” significa que nadie está usando el puesto. Si estuviera ocupado, no podría sentarme. La ventana tampoco carga el teléfono; necesito el enchufe.'), { phone: true }),
      T('s3.c', 'No. Puedes imprimir la batería.', R('s3.c.r', 'Una batería no se imprime. Para cargar el teléfono necesito un enchufe y un puesto libre.'), { phone: true }),
    ] },

  { id: 's4', scene: 4, type: 'choice', usage: ['contraseña'], offline: true,
    lines: [L('s4.lucia', 'Lucía', 'La red aparece, pero no puedes conectarte. ¿Qué me preguntas?')],
    cards: [
      T('s4.a', '¿Cuál es la contraseña del wifi?', R('s4.a.r', 'La contraseña está escrita en tu tarjeta. La introduces y el portátil se conecta.'), { net: true }, true),
      T('s4.b', '¿Qué sala está ocupada?', R('s4.b.r', 'Una sala puede estar libre u ocupada, pero eso no conecta el ordenador. Para entrar en la red necesitas la contraseña.'), { net: true }),
      T('s4.c', '¿Dónde puedo imprimir?', R('s4.c.r', 'Imprimir sirve para obtener una copia en papel. Para conectarte al wifi necesitas la contraseña.'), { net: true }),
    ] },

  { id: 's5', scene: 5, type: 'choice', usage: ['contraseña'],
    lines: [L('s5.res', 'Residente', 'Perdona, no puedo conectarme a la red de invitados.')],
    cards: [
      T('s5.a', 'La contraseña está escrita en tu tarjeta.', R('s5.a.r', 'La encuentra, introduce la contraseña y se conecta. “Muchas gracias”.'), {}, true),
      T('s5.b', 'La sala de reuniones está ocupada.', R('s5.b.r', 'La sala no cambia la conexión. Para entrar en la red necesita la contraseña.')),
      T('s5.c', 'El enchufe está debajo de la mesa.', R('s5.c.r', 'El enchufe da electricidad, no acceso a la red. Para conectarse necesita la contraseña.')),
    ] },

  { id: 's6a', scene: 6, type: 'choice', usage: ['imprimir'], printer: true,
    lines: [L('s6a.client', 'Cliente', 'Necesitamos tres copias en papel para la reunión.')],
    cards: [
      T('s6a.a', 'Imprimir tres copias.', R('s6a.a.r', 'Has impreso tres copias. Ya puedes llevarlas a la reunión.'), { papers: 3 }, true),
      T('s6a.b', 'Guardar el documento.', R('s6a.b.r', 'Has guardado el archivo, pero todavía no hay copias en papel. Para tenerlas en la mano, necesitas imprimir.'), { papers: 2, trace: 'saved' }),
      T('s6a.c', 'Cerrar el documento.', R('s6a.c.r', 'Has cerrado el documento. Así no aparece ninguna copia. Lo abrimos y elegimos imprimir.'), { papers: 2, trace: 'closed' }),
    ] },

  { id: 's6b', scene: 6, type: 'choice', usage: ['imprimir'], printer: true,
    lines: [L('s6b.lucia', 'Lucía', 'Falta papel. ¿Qué necesitas?')],
    cards: [
      T('s6b.a', 'Quiero imprimir tres copias, pero no hay papel.', R('s6b.a.r', 'Claro. Pongo papel en la impresora y terminamos las tres copias.'), { papers: 3 }, true),
      T('s6b.b', 'Quiero reservar tres papeles.', R('s6b.b.r', 'Las salas se reservan; los documentos se imprimen. Pongo papel para que puedas imprimir.'), { papers: 3 }),
      T('s6b.c', 'Quiero conectar tres copias.', R('s6b.c.r', 'Los dispositivos se conectan; los documentos se imprimen. Pongo papel para terminar las copias.'), { papers: 3 }),
    ] },

  { id: 's7a', scene: 7, type: 'choice', usage: ['cabina', 'sala'],
    lines: [L('s7a.lucia', 'Lucía', 'Quieres practicar solo y hablar en voz alta. Elige un espacio pequeño para una persona.')],
    cards: [
      P('s7a.a', IMG.booth, R('s7a.a.r', 'Esta es una cabina. Es un espacio pequeño para hablar a solas sin molestar.'), {}, true),
      P('s7a.b', IMG.meeting, R('s7a.b.r', 'Esta es una sala de reuniones. Hay sitio para varias personas. Para practicar solo basta una cabina.'), { peek: 'room' }, false, 'la sala de reuniones'),
      P('s7a.c', IMG.outletDesk, R('s7a.c.r', 'Este es un puesto abierto. Si hablas en voz alta, te oyen todos. Para hablar a solas usa una cabina.'), { peek: 'open' }, false, 'un puesto abierto'),
    ] },

  { id: 's7b', scene: 7, type: 'choice', usage: ['cabina'],
    lines: [L('s7b.lucia', 'Lucía', 'Ahora sois tres y necesitáis compartir una pantalla. ¿Qué espacio pedís?')],
    cards: [
      T('s7b.a', 'Necesitamos una cabina.', R('s7b.a.r', 'La cabina es para una persona. Los tres cabéis de pie, pero no podéis sentaros ni ver bien la pantalla. Para trabajar en grupo necesitáis una sala de reuniones.'), { crowd: true }),
      T('s7b.b', 'Necesitamos una sala de reuniones.', R('s7b.b.r', 'La sala de reuniones tiene sitio para los tres y una pantalla para compartir.'), {}, true),
      T('s7b.c', 'Necesitamos un puesto para una persona.', R('s7b.c.r', 'Un puesto es un lugar de trabajo individual. Para tres personas necesitáis una sala de reuniones.'), { chair: true }),
    ] },

  { id: 's8a', scene: 8, type: 'choice', usage: ['reservar'], calendar: true,
    lines: [L('s8a.lucia', 'Lucía', 'La llamada empieza a las cuatro y dura media hora. Reserva la sala.')],
    cards: [
      T('s8a.a', 'Reservar de tres y media a cuatro.', R('s8a.a.r', 'La reserva termina a las cuatro, justo cuando empieza la llamada. Has reservado una hora demasiado temprana.'), { book: '15:30–16:00' }),
      T('s8a.b', 'Reservar de cuatro a cuatro y media.', R('s8a.b.r', 'La sala queda reservada de cuatro a cuatro y media, durante toda la llamada.'), { book: '16:00–16:30' }, true),
      T('s8a.c', 'Reservar de cuatro y media a cinco.', R('s8a.c.r', 'La sala estará reservada a las cuatro y media, pero la llamada empieza a las cuatro. Has reservado una hora demasiado tarde.'), { book: '16:30–17:00' }),
    ] },

  { id: 's8b', scene: 8, type: 'choice', usage: ['reservar'], calendar: true,
    linesFn: st => st.book === '16:00–16:30'
      ? [L('s8b.lucia.ok', 'Lucía', 'El cliente confirma que empezará exactamente a las cuatro. ¿Qué dices para confirmar la reserva?')]
      : [L('s8b.lucia.fix', 'Lucía', 'La hora no coincide. ¿Qué dices para cambiarla?')],
    cards: [
      T('s8b.a', 'Necesito reservar la sala de cuatro a cuatro y media.', R('s8b.a.r', 'Perfecto. La sala queda reservada de cuatro a cuatro y media.'), { fixed: true }, true),
      T('s8b.b', 'Necesito imprimir la sala a las cuatro.', R('s8b.b.r', 'Los documentos se imprimen. Las salas se reservan. Cambio la reserva a las cuatro.'), { fixed: true }),
      T('s8b.c', 'Necesito conectar la sala durante media hora.', R('s8b.c.r', 'Los dispositivos se conectan. Las salas se reservan. Cambio la reserva a las cuatro.'), { fixed: true }),
    ] },

  { id: 's9', scene: 9, type: 'choice', usage: ['libre'], voices: true,
    lines: [L('s9.lucia', 'Lucía', 'Hay personas trabajando dentro. ¿Puedes entrar ahora?')],
    cards: [
      T('s9.a', 'No. La sala está ocupada.', R('s9.a.r', 'Exacto. Hay una reunión dentro, así que la sala está ocupada.'), {}, true),
      T('s9.b', 'Sí. La sala está libre.', R('s9.b.r', '“Libre” significa que nadie la está usando. Aquí hay una reunión, así que está ocupada.'), { door: true }),
      T('s9.c', 'La sala tiene contraseña.', R('s9.c.r', 'Una contraseña permite entrar en una red o un sistema. Esta sala está ocupada porque hay personas dentro.'), {}),
    ] },

  { id: 's10', scene: 10, type: 'choice', usage: ['sala', 'libre'], voices: true,
    lines: [L('s10.lucia', 'Lucía', 'La sala grande está ocupada. Queda una cabina libre y una sala pequeña que queda libre a las cuatro. Sois tres. ¿Qué necesitas?')],
    cards: [
      T('s10.a', 'Necesito reservar la sala pequeña, que está libre a las cuatro.', R('s10.a.r', 'Perfecto. La sala pequeña está libre, tiene tres sillas y queda reservada durante media hora.'), {}, true),
      T('s10.b', 'Necesito reservar la cabina para tres personas.', R('s10.b.r', 'La cabina está libre, pero es para una persona. Para tres personas necesitas la sala de reuniones pequeña.'), { crowd: true }),
      T('s10.c', 'Necesito un puesto ocupado a las cuatro.', R('s10.c.r', 'Si un puesto está ocupado, otra persona ya lo está usando. Necesitas una sala libre para los tres.'), {}),
    ] },

  { id: 's10c', scene: 10, type: 'say', small: true,
    lines: [L('s10c.hero', 'Tú', 'Buenos días. Gracias por esperar. Ya estamos listos.')], fx: { call: true } },

  { id: 's11a', scene: 11, type: 'choice', usage: ['recepción'], newcomer: true,
    lines: [L('s11a.new', 'Visitante', 'Perdona, es mi primer día. ¿Dónde recojo mi tarjeta?')],
    cards: [
      T('s11a.a', 'La recepción está junto a la entrada.', R('s11a.a.r', 'Gracias. Ya veo la recepción.'), {}, true),
      T('s11a.b', 'La cabina está dentro de la tarjeta.', R('s11a.b.r', 'La cabina es un espacio para hablar a solas. Las tarjetas se recogen en recepción.'), {}),
      T('s11a.c', 'El puesto está ocupado por la recepción.', R('s11a.c.r', 'Un puesto puede estar ocupado por una persona. La recepción es el lugar donde te atienden al entrar.'), {}),
    ] },

  { id: 's11b', scene: 11, type: 'choice', usage: ['contraseña', 'enchufe', 'puesto'], newcomer: true,
    lines: [L('s11b.new', 'Visitante', 'Ya tengo la tarjeta. ¿Cómo me conecto y dónde puedo cargar el portátil?')],
    cards: [
      T('s11b.a', 'La contraseña está en la tarjeta. Ese puesto está libre y tiene enchufe.', R('s11b.a.r', 'Perfecto. Me conecto y pongo el portátil a cargar. Muchas gracias.'), { newDesk: true }, true),
      T('s11b.b', 'La sala está ocupada y puedes imprimir el wifi.', R('s11b.b.r', 'El wifi no se imprime. Para conectarte necesitas la contraseña; para cargar el portátil necesitas un enchufe.'), { newDesk: true }),
      T('s11b.c', 'Reserva la contraseña dentro de la cabina.', R('s11b.c.r', 'Las salas se reservan. La contraseña permite conectarse y el enchufe permite cargar el portátil.'), { newDesk: true }),
    ] },

  { id: 's11c', scene: 11, type: 'say', small: true, last: true,
    lines: [L('s11c.lucia', 'Lucía', 'Hace una hora no sabías cómo funcionaba este lugar. Ahora ya puedes explicárselo a otra persona.')] },
];

export const FINAL = {
  title: 'Tu primer día',
  clean: 'Has preparado la reunión y ya sabes moverte por el coworking.',
  mixed: 'Cada confusión te ha enseñado cómo funciona este lugar. La reunión está hecha y ahora puedes ayudar a otra persona.',
  cleanId: 'final.clean',
  mixedId: 'final.mixed',
};

// Palabras meta y su vocabulario (panel plegado; único lugar con ruso).
export const TARGETS = [
  { key: 'recepción', es: 'la recepción', ru: 'стойка администратора' },
  { key: 'puesto', es: 'el puesto', ru: 'рабочее место' },
  { key: 'enchufe', es: 'el enchufe', ru: 'розетка' },
  { key: 'contraseña', es: 'la contraseña', ru: 'пароль' },
  { key: 'imprimir', es: 'imprimir', ru: 'печатать, распечатывать' },
  { key: 'cabina', es: 'la cabina', ru: 'одноместная телефонная кабинка' },
  { key: 'sala', es: 'la sala de reuniones', ru: 'переговорная' },
  { key: 'reservar', es: 'reservar', ru: 'бронировать' },
  { key: 'libre', es: 'libre / ocupado, ocupada', ru: 'свободно / занято' },
];

export const CHROME = {
  catalogo: 'Todas las historias',
  again: 'Volver a escuchar', slow: 'Más despacio', next: 'Continuar', replay: 'Volver a jugar',
  journal: 'Tus usos del español',
  leaveTitle: '¿Salir de la historia?', stay: 'Quedarme', leave: 'Salir',
  noAudio: 'Todavía no hay audio para esta frase.',
  empezar: 'Empezar',
};
