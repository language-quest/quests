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
      L('s0.intro', 'narr', 'Es tu primer día en un coworking. Hoy, a las cuatro, tienes una videollamada.'),
      L('s0.lucia', 'Lucía', 'Hola, soy Lucía. Si no sabes algo, pregunta.'),
      L('s0.client', 'Cliente', 'Hola. Hoy la reunión es a las cuatro.'),
    ],
    cards: [
      T('s0.a', 'Me voy a casa.', R('s0.a.r', 'Tu casa está lejos. Mejor te quedas aquí.')),
      T('s0.b', 'Me quedo. Voy paso a paso.', R('s0.b.r', 'Me quedo. Voy paso a paso.'), {}, true),
      T('s0.c', 'Espero aquí.', R('s0.c.r', 'Esperar no ayuda. Vamos a empezar.')),
    ] },

  { id: 's1', scene: 1, type: 'choice', usage: ['recepción'],
    lines: [L('s1.hero', 'Tú', 'Me quedo. Voy paso a paso.'), L('s1.lucia', 'Lucía', 'Ve a la recepción.')],
    cards: [
      P('s1.a', IMG.reception, R('s1.a.r', 'Sí, esta es la recepción. Aquí te dan la tarjeta.'), { card: true }, true, 'la recepción'),
      P('s1.b', IMG.booth, R('s1.b.r', 'Esta es una cabina. Aquí no dan tarjetas. La recepción está en la entrada.'), { card: true, peek: 'booth' }, false, 'la cabina'),
      P('s1.c', IMG.meeting, R('s1.c.r', 'Esta es una sala de reuniones. Aquí no dan tarjetas. La recepción está en la entrada.'), { card: true, peek: 'room' }, false, 'la sala de reuniones'),
    ] },

  { id: 's2a', scene: 2, type: 'choice', usage: ['puesto'], battery: true,
    lines: [L('s2a.lucia', 'Lucía', 'Tu portátil no tiene batería. Busca un puesto.')],
    cards: [
      P('s2a.a', IMG.windowDesk, R('s2a.a.r', 'Sí, este es un puesto. Aquí puedes trabajar.'), { desk: 'window' }, true, 'un puesto'),
      P('s2a.b', IMG.sofa, R('s2a.b.r', 'Este es un sofá. No es un puesto de trabajo.'), { desk: 'sofa' }, false, 'el sofá'),
      P('s2a.c', IMG.printer, R('s2a.c.r', 'Esta es una impresora. No es un puesto. Un puesto tiene mesa y silla.'), {}, false, 'la impresora'),
    ] },

  { id: 's2b', scene: 2, type: 'choice', usage: ['enchufe'], battery: true,
    lines: [L('s2b.lucia', 'Lucía', 'El portátil sigue sin batería. Busca un enchufe.')],
    cards: [
      P('s2b.a', IMG.windowDesk, R('s2b.a.r', 'Este puesto no tiene enchufe. El portátil no carga. Usamos un cable largo.'), { desk: 'window', cable: 'long' }, false, 'un puesto sin enchufe'),
      P('s2b.b', IMG.outletDesk, R('s2b.b.r', 'Este puesto tiene enchufe. El portátil carga.'), { desk: 'outlet', cable: 'direct', charge: true }, true, 'un puesto con enchufe'),
      P('s2b.c', IMG.sofa, R('s2b.c.r', 'Aquí no hay enchufe. Usamos un cable largo.'), { desk: 'sofa', cable: 'long' }, false, 'el sofá'),
    ] },

  { id: 's3a', scene: 3, type: 'choice', usage: ['puesto', 'libre'],
    lines: [L('s3a.dani', 'Dani', 'Perdona, ¿está libre este puesto?')],
    cards: [
      T('s3a.a', 'Sí, está libre.', R('s3a.a.r', 'Gracias. Me siento aquí.'), {}, true),
      T('s3a.b', 'Sí, está ocupado.', R('s3a.b.r', '“Libre” es: no hay nadie. Si está ocupado, no puedo sentarme.'), {}),
      T('s3a.c', 'Sí, está en la recepción.', R('s3a.c.r', 'El puesto no está en la recepción. Yo pregunto: ¿hay alguien? ¿Está libre?'), {}),
    ] },

  { id: 's3b', scene: 3, type: 'choice', usage: ['enchufe'],
    lines: [L('s3b.dani', 'Dani', 'Mi teléfono no tiene batería. Necesito un enchufe.')],
    cards: [
      T('s3b.a', 'Aquí hay un enchufe.', R('s3b.a.r', 'Gracias. Conecto el teléfono al enchufe.'), { phone: true }, true),
      T('s3b.b', 'Aquí hay una cabina.', R('s3b.b.r', 'Una cabina no carga el teléfono. Necesito un enchufe.'), { phone: true }),
      T('s3b.c', 'Aquí hay una contraseña.', R('s3b.c.r', 'La contraseña es para el wifi. Para cargar necesito un enchufe.'), { phone: true }),
    ] },

  { id: 's4', scene: 4, type: 'choice', usage: ['contraseña'], offline: true,
    lines: [L('s4.lucia', 'Lucía', 'No puedes usar el wifi. ¿Qué me preguntas?')],
    cards: [
      T('s4.a', '¿Cuál es la contraseña del wifi?', R('s4.a.r', 'La contraseña está en tu tarjeta. La escribes y ya tienes wifi.'), { net: true }, true),
      T('s4.b', '¿Qué sala está ocupada?', R('s4.b.r', 'Eso no ayuda con el wifi. Necesitas la contraseña.'), { net: true }),
      T('s4.c', '¿Dónde puedo imprimir?', R('s4.c.r', 'Imprimir es para el papel. Para el wifi necesitas la contraseña.'), { net: true }),
    ] },

  { id: 's5', scene: 5, type: 'choice', usage: ['contraseña'],
    lines: [L('s5.res', 'Residente', 'Perdona, no puedo usar el wifi.')],
    cards: [
      T('s5.a', 'La contraseña está en tu tarjeta.', R('s5.a.r', 'La encuentra y escribe la contraseña. “Muchas gracias”.'), {}, true),
      T('s5.b', 'La sala de reuniones está ocupada.', R('s5.b.r', 'Eso no ayuda con el wifi. Necesita la contraseña.')),
      T('s5.c', 'El enchufe está debajo de la mesa.', R('s5.c.r', 'El enchufe es para la electricidad. Para el wifi necesita la contraseña.')),
    ] },

  { id: 's6a', scene: 6, type: 'choice', usage: ['imprimir'], printer: true,
    lines: [L('s6a.client', 'Cliente', 'Necesito tres copias en papel.')],
    cards: [
      T('s6a.a', 'Imprimir tres copias.', R('s6a.a.r', 'Has impreso tres copias. Muy bien.'), { papers: 3 }, true),
      T('s6a.b', 'Guardar el documento.', R('s6a.b.r', 'Guardar no da papel. Para tener copias necesitas imprimir.'), { papers: 2, trace: 'saved' }),
      T('s6a.c', 'Cerrar el documento.', R('s6a.c.r', 'Cerrar no da papel. Para tener copias necesitas imprimir.'), { papers: 2, trace: 'closed' }),
    ] },

  { id: 's6b', scene: 6, type: 'choice', usage: ['imprimir'], printer: true,
    lines: [L('s6b.lucia', 'Lucía', 'No hay papel. ¿Qué necesitas?')],
    cards: [
      T('s6b.a', 'Quiero imprimir tres copias, pero no hay papel.', R('s6b.a.r', 'Claro. Pongo papel y terminamos.'), { papers: 3 }, true),
      T('s6b.b', 'Quiero reservar tres papeles.', R('s6b.b.r', 'Las salas se reservan. Los documentos se imprimen. Pongo papel.'), { papers: 3 }),
      T('s6b.c', 'Quiero conectar tres copias.', R('s6b.c.r', 'Un portátil se conecta. Una copia se imprime. Pongo papel.'), { papers: 3 }),
    ] },

  { id: 's7a', scene: 7, type: 'choice', usage: ['cabina', 'sala'],
    lines: [L('s7a.lucia', 'Lucía', 'Quieres hablar por teléfono a solas. Elige un lugar pequeño para una persona.')],
    cards: [
      P('s7a.a', IMG.booth, R('s7a.a.r', 'Esta es una cabina. Es pequeña. Es para una persona.'), {}, true, 'la cabina'),
      P('s7a.b', IMG.meeting, R('s7a.b.r', 'Esta es una sala de reuniones. Es para muchas personas. Para una persona, usa la cabina.'), { peek: 'room' }, false, 'la sala de reuniones'),
      P('s7a.c', IMG.outletDesk, R('s7a.c.r', 'Este es un puesto abierto. Todos te oyen. Para hablar a solas, usa la cabina.'), { peek: 'open' }, false, 'un puesto abierto'),
    ] },

  { id: 's7b', scene: 7, type: 'choice', usage: ['cabina'],
    lines: [L('s7b.lucia', 'Lucía', 'Ahora sois tres. Necesitáis una pantalla. ¿Qué pedís?')],
    cards: [
      T('s7b.a', 'Necesitamos una cabina.', R('s7b.a.r', 'La cabina es para una persona. Sois tres. Necesitáis una sala de reuniones.'), { crowd: true }),
      T('s7b.b', 'Necesitamos una sala de reuniones.', R('s7b.b.r', 'La sala de reuniones tiene sitio para tres personas y una pantalla.'), {}, true),
      T('s7b.c', 'Necesitamos un puesto para una persona.', R('s7b.c.r', 'Un puesto es para una persona. Sois tres. Necesitáis una sala de reuniones.'), { chair: true }),
    ] },

  { id: 's8a', scene: 8, type: 'choice', usage: ['reservar'], calendar: true,
    lines: [L('s8a.lucia', 'Lucía', 'La llamada es a las cuatro. Dura media hora. Reserva la sala.')],
    cards: [
      T('s8a.a', 'Reservar de tres y media a cuatro.', R('s8a.a.r', 'Esta reserva termina a las cuatro. Es muy pronto.'), { book: '15:30–16:00' }),
      T('s8a.b', 'Reservar de cuatro a cuatro y media.', R('s8a.b.r', 'La sala está reservada de cuatro a cuatro y media. Perfecto.'), { book: '16:00–16:30' }, true),
      T('s8a.c', 'Reservar de cuatro y media a cinco.', R('s8a.c.r', 'Esta reserva empieza a las cuatro y media. Es muy tarde.'), { book: '16:30–17:00' }),
    ] },

  { id: 's8b', scene: 8, type: 'choice', usage: ['reservar'], calendar: true,
    linesFn: st => st.book === '16:00–16:30'
      ? [L('s8b.lucia.ok', 'Lucía', 'El cliente llama a las cuatro. ¿Qué dices?')]
      : [L('s8b.lucia.fix', 'Lucía', 'La hora no es correcta. ¿Qué dices?')],
    cards: [
      T('s8b.a', 'Necesito reservar la sala de cuatro a cuatro y media.', R('s8b.a.r', 'Perfecto. La sala queda reservada de cuatro a cuatro y media.'), { fixed: true }, true),
      T('s8b.b', 'Necesito imprimir la sala a las cuatro.', R('s8b.b.r', 'Los documentos se imprimen. Las salas se reservan. Cambio la reserva a las cuatro.'), { fixed: true }),
      T('s8b.c', 'Necesito conectar la sala durante media hora.', R('s8b.c.r', 'Los dispositivos se conectan. Las salas se reservan. Cambio la reserva a las cuatro.'), { fixed: true }),
    ] },

  { id: 's9', scene: 9, type: 'choice', usage: ['libre'], voices: true,
    lines: [L('s9.lucia', 'Lucía', 'Hay gente dentro. ¿Puedes entrar?')],
    cards: [
      T('s9.a', 'No. La sala está ocupada.', R('s9.a.r', 'Exacto. Hay una reunión. La sala está ocupada.'), {}, true),
      T('s9.b', 'Sí. La sala está libre.', R('s9.b.r', '“Libre” es: no hay nadie. Aquí hay una reunión. Está ocupada.'), { door: true }),
      T('s9.c', 'La sala tiene contraseña.', R('s9.c.r', 'La contraseña es para el wifi. Esta sala está ocupada: hay gente dentro.'), {}),
    ] },

  { id: 's10', scene: 10, type: 'choice', usage: ['sala', 'libre'], voices: true,
    lines: [L('s10.lucia', 'Lucía', 'La sala grande está ocupada. Hay una sala pequeña libre a las cuatro. Sois tres. ¿Qué necesitas?')],
    cards: [
      T('s10.a', 'Necesito reservar la sala pequeña, que está libre a las cuatro.', R('s10.a.r', 'Perfecto. La sala pequeña está libre. Tiene tres sillas.'), {}, true),
      T('s10.b', 'Necesito reservar la cabina para tres personas.', R('s10.b.r', 'La cabina está libre, pero es para una persona. Sois tres.'), { crowd: true }),
      T('s10.c', 'Necesito un puesto ocupado a las cuatro.', R('s10.c.r', 'Ocupado es: hay alguien. Necesitas una sala libre.'), {}),
    ] },

  { id: 's10c', scene: 10, type: 'say', small: true,
    lines: [L('s10c.hero', 'Tú', 'Buenos días. Gracias por esperar. Ya estamos listos.')], fx: { call: true } },

  { id: 's11a', scene: 11, type: 'choice', usage: ['recepción'], newcomer: true,
    lines: [L('s11a.new', 'Visitante', 'Hola, es mi primer día. ¿Dónde está mi tarjeta?')],
    cards: [
      T('s11a.a', 'La recepción está junto a la entrada.', R('s11a.a.r', 'Gracias. Ya veo la recepción.'), {}, true),
      T('s11a.b', 'La cabina está dentro de la tarjeta.', R('s11a.b.r', 'La cabina es para hablar a solas. Las tarjetas están en la recepción.'), {}),
      T('s11a.c', 'El puesto está ocupado por la recepción.', R('s11a.c.r', 'La recepción es el lugar de la entrada. Ahí dan la tarjeta.'), {}),
    ] },

  { id: 's11b', scene: 11, type: 'choice', usage: ['contraseña', 'enchufe', 'puesto'], newcomer: true,
    lines: [L('s11b.new', 'Visitante', 'Ya tengo la tarjeta. ¿Cómo uso el wifi? ¿Dónde cargo el portátil?')],
    cards: [
      T('s11b.a', 'La contraseña está en la tarjeta. Ese puesto está libre y tiene enchufe.', R('s11b.a.r', 'Perfecto. Me conecto y pongo el portátil a cargar. Muchas gracias.'), { newDesk: true }, true),
      T('s11b.b', 'La sala está ocupada y puedes imprimir el wifi.', R('s11b.b.r', 'El wifi no se imprime. Para el wifi necesito la contraseña. Para cargar, un enchufe.'), { newDesk: true }),
      T('s11b.c', 'Reserva la contraseña dentro de la cabina.', R('s11b.c.r', 'Las salas se reservan. Necesito la contraseña para el wifi y un enchufe para cargar.'), { newDesk: true }),
    ] },

  { id: 's11c', scene: 11, type: 'say', small: true, last: true,
    lines: [L('s11c.lucia', 'Lucía', 'Hoy has aprendido mucho. Ahora puedes ayudar a otra persona.')] },
];

export const FINAL = {
  title: 'Tu primer día',
  clean: 'Has preparado la reunión. Ya conoces el coworking.',
  mixed: 'Cada error te ha enseñado algo. La reunión está lista. Ahora puedes ayudar a otra persona.',
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
