// English copy of the coworking quest ("Connected by four"). Same step ids and effects as coworking-data.js.
// Audio is looked up in assets/coworking-en/audio/<id>.mp3 (and <id>.slow.mp3).
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
      L('s0.intro', 'narr', "It's your first day at a coworking space. Today, at four o'clock, you have a video call on your laptop."),
      L('s0.lucia', 'Lucy', "Hi, I'm Lucy. If you don't know something, ask."),
      L('s0.client', 'Client', "Hello. The meeting is at four o'clock today."),
      L('s0.lucia2', 'Lucy', 'What do you do?'),
    ],
    cards: [
      T('s0.a', "I'm going home.", R('s0.a.r', "Your home is far away and the meeting is at four o'clock. You'd better stay here.")),
      T('s0.b', "I'm staying here.", R('s0.b.r', "I'm staying here."), {}, true),
      T('s0.c', "I'm going to the beach.", R('s0.c.r', "To the beach? You have a meeting at four o'clock today. You'd better stay here.")),
    ] },

  { id: 's1', scene: 1, type: 'choice', usage: ['reception'],
    lines: [L('s1.hero', 'You', "I'm staying here."), L('s1.lucia', 'Lucy', 'Go to the reception desk.')],
    cards: [
      P('s1.a', IMG.reception, R('s1.a.r', 'Yes, this is the reception desk. They give you your card here.'), { card: true }, true, 'the reception desk'),
      P('s1.b', IMG.booth, R('s1.b.r', "This is a phone booth. They don't give out cards here. The reception desk is at the entrance."), { card: true, peek: 'booth' }, false, 'the phone booth'),
      P('s1.c', IMG.meeting, R('s1.c.r', "This is a meeting room. They don't give out cards here. The reception desk is at the entrance."), { card: true, peek: 'room' }, false, 'the meeting room'),
    ] },

  { id: 's2a', scene: 2, type: 'choice', usage: ['desk'], battery: true,
    lines: [L('s2a.lucia', 'Lucy', "Your laptop has no battery. Find a desk.")],
    cards: [
      P('s2a.a', IMG.windowDesk, R('s2a.a.r', 'Yes, this is a desk. You can work here.'), { desk: 'window' }, true, 'a desk'),
      P('s2a.b', IMG.sofa, R('s2a.b.r', "This is a sofa. It's not a workspace."), { desk: 'sofa' }, false, 'the sofa'),
      P('s2a.c', IMG.printer, R('s2a.c.r', "This is a printer. It's not a desk. A desk has a table and a chair."), {}, false, 'the printer'),
    ] },

  { id: 's2b', scene: 2, type: 'choice', usage: ['outlet'], battery: true,
    lines: [L('s2b.lucia', 'Lucy', 'The laptop still has no battery. Find an outlet.')],
    cards: [
      P('s2b.a', IMG.windowDesk, R('s2b.a.r', "This desk doesn't have an outlet. The laptop doesn't charge. We use a long cable."), { desk: 'window', cable: 'long' }, false, 'a desk without an outlet'),
      P('s2b.b', IMG.outletDesk, R('s2b.b.r', 'This desk has an outlet. The laptop is charging.'), { desk: 'outlet', cable: 'direct', charge: true }, true, 'a desk with an outlet'),
      P('s2b.c', IMG.sofa, R('s2b.c.r', "There's no outlet here. We use a long cable."), { desk: 'sofa', cable: 'long' }, false, 'the sofa'),
    ] },

  { id: 's3a', scene: 3, type: 'choice', usage: ['desk', 'free'],
    lines: [L('s3a.dani', 'Dani', 'Excuse me, is this desk free?')],
    cards: [
      T('s3a.a', "Yes, it's free.", R('s3a.a.r', "Thanks. I'll sit here."), {}, true),
      T('s3a.b', "Yes, it's taken.", R('s3a.b.r', "“Free” means nobody is there. If it's taken, I can't sit down."), {}),
      T('s3a.c', "Yes, it's at the reception desk.", R('s3a.c.r', "The desk isn't at the reception desk. I'm asking: is anyone there? Is it free?"), {}),
    ] },

  { id: 's3b', scene: 3, type: 'choice', usage: ['outlet'],
    lines: [L('s3b.dani', 'Dani', "My phone has no battery. I need an outlet.")],
    cards: [
      T('s3b.a', "There's an outlet here.", R('s3b.a.r', "Thanks. I'll plug my phone into the outlet."), { phone: true }, true),
      T('s3b.b', "There's a phone booth here.", R('s3b.b.r', "A phone booth doesn't charge the phone. I need an outlet."), { phone: true }),
      T('s3b.c', "There's a password here.", R('s3b.c.r', 'The password is for the wifi. To charge I need an outlet.'), { phone: true }),
    ] },

  { id: 's4', scene: 4, type: 'choice', usage: ['password'], offline: true,
    lines: [L('s4.lucia', 'Lucy', "You can't use the wifi. What do you ask me?")],
    cards: [
      T('s4.a', "What's the wifi password?", R('s4.a.r', "The password is on your card. You type it in and you have wifi."), { net: true }, true),
      T('s4.b', 'Which room is taken?', R('s4.b.r', "That doesn't help with the wifi. You need the password."), { net: true }),
      T('s4.c', 'Where can I print?', R('s4.c.r', 'Printing is for paper. For the wifi you need the password.'), { net: true }),
    ] },

  { id: 's5', scene: 5, type: 'choice', usage: ['password'],
    lines: [L('s5.res', 'Resident', "Excuse me, I can't use the wifi.")],
    cards: [
      T('s5.a', 'The password is on your card.', R('s5.a.r', 'They find it and type the password. “Thank you very much.”'), {}, true),
      T('s5.b', 'The meeting room is taken.', R('s5.b.r', "That doesn't help with the wifi. They need the password.")),
      T('s5.c', 'The outlet is under the table.', R('s5.c.r', 'The outlet is for electricity. For the wifi they need the password.')),
    ] },

  { id: 's6a', scene: 6, type: 'choice', usage: ['print'], printer: true,
    lines: [L('s6a.client', 'Client', 'I need three paper copies.')],
    cards: [
      T('s6a.a', 'Print three copies.', R('s6a.a.r', 'You printed three copies. Very good.'), { papers: 3 }, true),
      T('s6a.b', 'Save the document.', R('s6a.b.r', "Saving doesn't give you paper. To get copies you need to print."), { papers: 2, trace: 'saved' }),
      T('s6a.c', 'Close the document.', R('s6a.c.r', "Closing doesn't give you paper. To get copies you need to print."), { papers: 2, trace: 'closed' }),
    ] },

  { id: 's6b', scene: 6, type: 'choice', usage: ['print'], printer: true,
    lines: [L('s6b.lucia', 'Lucy', "There's no paper. What do you need?")],
    cards: [
      T('s6b.a', "I want to print three copies, but there's no paper.", R('s6b.a.r', "Of course. I'll put in paper and we're done."), { papers: 3 }, true),
      T('s6b.b', 'I want to book three papers.', R('s6b.b.r', 'Rooms are booked. Documents are printed. I\'ll put in paper.'), { papers: 3 }),
      T('s6b.c', 'I want to plug in three copies.', R('s6b.c.r', 'A laptop is plugged in. A copy is printed. I\'ll put in paper.'), { papers: 3 }),
    ] },

  { id: 's7a', scene: 7, type: 'choice', usage: ['booth', 'room'],
    lines: [L('s7a.lucia', 'Lucy', "You're going to talk on the phone. Choose a small place for one person.")],
    cards: [
      P('s7a.a', IMG.booth, R('s7a.a.r', "This is a phone booth. It's small. It's for one person."), {}, true, 'the phone booth'),
      P('s7a.b', IMG.meeting, R('s7a.b.r', "This is a meeting room. It's for many people. For one person, use the phone booth."), { peek: 'room' }, false, 'the meeting room'),
      P('s7a.c', IMG.outletDesk, R('s7a.c.r', 'This is an open desk. Everyone can hear you. To talk on the phone, use the phone booth.'), { peek: 'open' }, false, 'an open desk'),
    ] },

  { id: 's7b', scene: 7, type: 'choice', usage: ['booth'],
    lines: [L('s7b.lucia', 'Lucy', "Now there are three of you. What do you need?")],
    cards: [
      T('s7b.a', 'We need a phone booth.', R('s7b.a.r', 'The phone booth is for one person. There are three of you. You need a meeting room.'), { crowd: true }),
      T('s7b.b', 'We need a meeting room.', R('s7b.b.r', 'The meeting room has space for three people and a screen.'), {}, true),
      T('s7b.c', 'We need a desk for one person.', R('s7b.c.r', 'A desk is for one person. There are three of you. You need a meeting room.'), { chair: true }),
    ] },

  { id: 's8a', scene: 8, type: 'choice', usage: ['book'], calendar: true,
    lines: [L('s8a.lucia', 'Lucy', "The call is at four o'clock. It lasts half an hour. Book the room.")],
    cards: [
      T('s8a.a', 'Book it from half past three to four.', R('s8a.a.r', "This booking ends at four o'clock. That's too early."), { book: '15:30–16:00' }),
      T('s8a.b', 'Book it from four to half past four.', R('s8a.b.r', 'The room is booked from four to half past four. Perfect.'), { book: '16:00–16:30' }, true),
      T('s8a.c', 'Book it from half past four to five.', R('s8a.c.r', 'This booking starts at half past four. That\'s too late.'), { book: '16:30–17:00' }),
    ] },

  { id: 's8b', scene: 8, type: 'choice', usage: ['book'], calendar: true,
    linesFn: st => st.book === '16:00–16:30'
      ? [L('s8b.lucia.ok', 'Lucy', "The client calls at four o'clock. What do you say?")]
      : [L('s8b.lucia.fix', 'Lucy', "The time isn't right. What do you say?")],
    cards: [
      T('s8b.a', 'I need to book the room from four to half past four.', R('s8b.a.r', 'Perfect. The room is booked from four to half past four.'), { fixed: true }, true),
      T('s8b.b', "I need to print the room at four o'clock.", R('s8b.b.r', "Documents are printed. Rooms are booked. I'll change the booking to four o'clock."), { fixed: true }),
      T('s8b.c', 'I need to plug in the room for half an hour.', R('s8b.c.r', "Devices are plugged in. Rooms are booked. I'll change the booking to four o'clock."), { fixed: true }),
    ] },

  { id: 's9', scene: 9, type: 'choice', usage: ['free'], voices: true,
    lines: [L('s9.lucia', 'Lucy', "There are people inside. Can you go in?")],
    cards: [
      T('s9.a', "No. The room is taken.", R('s9.a.r', "Exactly. There's a meeting. The room is taken."), {}, true),
      T('s9.b', 'Yes. The room is free.', R('s9.b.r', "“Free” means nobody is there. There's a meeting here. It's taken."), { door: true }),
      T('s9.c', 'The room has a password.', R('s9.c.r', 'The password is for the wifi. This room is taken: there are people inside.'), {}),
    ] },

  { id: 's10', scene: 10, type: 'choice', usage: ['room', 'free'], voices: true,
    lines: [L('s10.lucia', 'Lucy', "The big room is taken. There's a small room free at four o'clock. There are three of you. What do you need?")],
    cards: [
      T('s10.a', "I need to book the small room, which is free at four o'clock.", R('s10.a.r', 'Perfect. The small room is free. It has three chairs.'), {}, true),
      T('s10.b', 'I need to book the phone booth for three people.', R('s10.b.r', 'The phone booth is free, but it\'s for one person. There are three of you.'), { crowd: true }),
      T('s10.c', "I need a taken desk at four o'clock.", R('s10.c.r', 'Taken means someone is there. You need a free room.'), {}),
    ] },

  { id: 's10c', scene: 10, type: 'say', small: true,
    lines: [L('s10c.hero', 'You', 'Good afternoon. Thank you for waiting. We are ready now.')], fx: { call: true } },

  { id: 's11a', scene: 11, type: 'choice', usage: ['reception'], newcomer: true,
    lines: [L('s11a.new', 'Visitor', "Hi, it's my first day. Where is my card?")],
    cards: [
      T('s11a.a', 'The reception desk is next to the entrance.', R('s11a.a.r', 'Thanks. I can see the reception desk now.'), {}, true),
      T('s11a.b', 'The phone booth is inside the card.', R('s11a.b.r', 'The phone booth is for one person. The cards are at the reception desk.'), {}),
      T('s11a.c', 'The desk is taken by the reception desk.', R('s11a.c.r', 'The reception desk is the place at the entrance. They give out the card there.'), {}),
    ] },

  { id: 's11b', scene: 11, type: 'choice', usage: ['password', 'outlet', 'desk'], newcomer: true,
    lines: [L('s11b.new', 'Visitor', "I have my card now. How do I use the wifi? Where do I charge my laptop?")],
    cards: [
      T('s11b.a', 'The password is on the card. That desk is free and has an outlet.', R('s11b.a.r', "Perfect. I'll connect and put my laptop on charge. Thank you very much."), { newDesk: true }, true),
      T('s11b.b', 'The room is taken and you can print the wifi.', R('s11b.b.r', "You can't print the wifi. For the wifi I need the password. To charge, an outlet."), { newDesk: true }),
      T('s11b.c', 'Book the password inside the phone booth.', R('s11b.c.r', 'Rooms are booked. I need the password for the wifi and an outlet to charge.'), { newDesk: true }),
    ] },

  { id: 's11c', scene: 11, type: 'say', small: true, last: true,
    lines: [L('s11c.lucia', 'Lucy', "You've learned a lot today. Now you can help someone else.")] },
];

export const FINAL = {
  title: 'Your first day',
  clean: "You've prepared for the meeting. You know the coworking space now.",
  mixed: "Every mistake taught you something. The meeting is ready. Now you can help someone else.",
  cleanId: 'final.clean',
  mixedId: 'final.mixed',
};

// Target words and their vocabulary (collapsed panel; the only place with Russian).
export const TARGETS = [
  { key: 'reception', en: 'the reception desk', ru: 'стойка администратора' },
  { key: 'desk', en: 'a desk', ru: 'рабочее место' },
  { key: 'outlet', en: 'an outlet', ru: 'розетка' },
  { key: 'password', en: 'the password', ru: 'пароль' },
  { key: 'print', en: 'to print', ru: 'печатать, распечатывать' },
  { key: 'booth', en: 'the phone booth', ru: 'одноместная телефонная кабинка' },
  { key: 'room', en: 'the meeting room', ru: 'переговорная' },
  { key: 'book', en: 'to book', ru: 'бронировать' },
  { key: 'free', en: 'free / taken', ru: 'свободно / занято' },
];

export const CHROME = {
  catalogo: 'All stories',
  again: 'Listen again', slow: 'Slower', next: 'Continue', replay: 'Play again',
  journal: 'Your English in use',
  leaveTitle: 'Leave the story?', stay: 'Stay', leave: 'Leave',
  noAudio: 'There is no audio for this line yet.',
  empezar: 'Start',
};
