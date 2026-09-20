# T-003 · Первый день в коворкинге

- **Квест:** Conexión a las cuatro (`web/coworking.html`, новый самостоятельный движок)
- **Статус:** todo
- **Автор:** PM

## Зачем

Сделать законченный испанский квест для взрослого начинающего: в первый день в
коворкинге игрок должен подготовиться к видеовстрече в 16:00, разобраться в
пространстве и правилах, а в финале самостоятельно решить проблему с занятой
переговорной. Сюжет использует структуру Blake Snyder / Save the Cat, а обучение —
витгенштейновский принцип «значение проявляется в употреблении»: каждая целевая
единица встречается минимум в двух **разных языковых играх**, а не просто
повторяется во втором вопросе.

## Учебный контракт

Целевая лексика:

- `la recepción` — стойка администратора;
- `el puesto` — рабочее место;
- `el enchufe` — розетка;
- `la contraseña` — пароль;
- `imprimir` — печатать, распечатывать;
- `la cabina` — одноместная телефонная кабинка;
- `la sala de reuniones` — переговорная;
- `reservar` — бронировать;
- `libre / ocupado, ocupada` — свободно / занято.

Переводы выше предназначены только для PM и свёрнутой панели `vocabulario`.
Внутри игры вступление, вопросы, карточки, реакции, навигация и финал — только
на испанском.

### Что считается двумя разными языковыми играми

Повтор одного слова в двух одинаковых тестах не засчитывается. Для каждой цели
обязателен перенос между двумя социальными действиями:

| Цель | Первое употребление | Второе употребление |
|---|---|---|
| `recepción` | выполнить инструкцию и найти место по картинке | объяснить путь новичку фразой |
| `puesto` | выбрать рабочее место по услышанному условию | ответить, свободно ли место |
| `enchufe` | найти предмет по инструкции | предложить его коллеге |
| `contraseña` | попросить информацию | помочь подключиться другому человеку |
| `imprimir` | выполнить действие в интерфейсе | попросить о помощи с печатью |
| `cabina` | выбрать пространство для одного говорящего | отвергнуть его для группы из трёх |
| `sala de reuniones` | отличить от кабины и открытого места | запросить помещение в кризисе |
| `reservar` | выбрать слот в календаре | исправить бронь в разговоре |
| `libre / ocupado` | интерпретировать состояние комнаты | применить к месту и времени |

Понимание подтверждается наблюдаемым действием и последствием: ноутбук заряжается,
бумага выходит из принтера, в кабинке тесно троим, занятая дверь не открывается,
бронь появляется в нужном интервале. Не использовать словарное определение как
замену действию.

## Драматургия Save the Cat

1. **Opening Image:** игрок один в холле с рюкзаком, ноутбуком с 8% заряда и
   незнакомым пространством.
2. **Theme Stated:** Лусия: `Aquí nadie sabe cómo funciona todo el primer día. Lo importante es preguntar.`
3. **Set-Up:** получить карту, найти место, подключиться и подготовить три копии.
4. **Catalyst:** `La reunión se adelanta. Empezamos hoy a las cuatro.`
5. **Debate:** `¿Me voy a casa o intento prepararlo todo aquí?`
6. **Break into Two:** независимо от ответа герой остаётся: `Me quedo. Voy paso a paso.`
7. **B Story:** администратор Лусия учит не объяснениями заранее, а реакциями на
   поступки игрока.
8. **Fun and Games:** исследование коворкинга, розетка, Wi-Fi, принтер, кабинка,
   переговорная и бронь.
9. **Midpoint:** `Ya está. Todo bajo control.` Но это ложная победа.
10. **Bad Guys Close In:** выбранный слот или помещение оказываются неудобными;
    прошлые решения накапливаются визуально.
11. **All Is Lost:** в 15:55 большая переговорная занята:
    `Lo siento, esta sala está ocupada.`
12. **Dark Night:** входящий звонок уже виден; Лусия говорит:
    `Pregunta. Ya conoces las palabras.`
13. **Break into Three:** игрок сам формулирует, какое помещение и на какое время
    ему нужно.
14. **Finale:** встреча начинается в маленькой переговорной при любом маршруте.
15. **Final Image:** герой помогает другому новичку найти стойку, пароль, свободное
    место и розетку.

## Общий контракт карточек

В каждой сцене ниже тип карточек указан явно. Одна карточка использует только одну
форму:

- **изображение без испанского текста**, с нейтральным доступным именем `Opción A`,
  `Opción B`, `Opción C` до ответа;
- **испанская фраза без изображения**.

Нельзя помещать рядом с испанской фразой картинку, эмодзи или иконку, которая её
переводит. Порядок A/B/C перемешивать один раз при входе в сцену. Звёздочка в ТЗ
обозначает лучший выбор и никогда не попадает в интерфейс.

После выбора: ввод блокируется, применяется ровно одно последствие, показывается и
озвучивается точная реакция, затем появляется `Continuar`. Неверный ответ не
отнимает жизнь и не возвращает к вопросу; объясняющее последствие продвигает сюжет.

## Сцены и точный контент

### 0. Вступление и катализатор

Обложка: `assets/coworking/cover.png`.

Текст:

`Hoy es tu primer día en un espacio de coworking. A las cuatro tienes una videollamada importante. Antes necesitas una tarjeta, un lugar para trabajar, conexión a internet y tres copias de un documento.`

Лусия:

`Aquí nadie sabe cómo funciona todo el primer día. Lo importante es preguntar.`

Сообщение клиента:

`La reunión se adelanta. Empezamos hoy a las cuatro.`

Карточки — **фразы без картинок**:

- A: `Me voy a casa.`
- B*: `Me quedo. Voy paso a paso.`
- C: `Espero sin preparar nada.`

Реакция A: `En casa tardarías demasiado. Decides quedarte y prepararlo todo paso a paso.`

Реакция C: `Esperar no prepara la reunión. Decides empezar por la tarjeta de entrada.`

Все пути переходят к сцене 1 с репликой героя:
`Me quedo. Voy paso a paso.`

### 1. La recepción — выполнить инструкцию

Лусия по внутренней связи:

`Recoge tu tarjeta en recepción.`

Карточки — **только изображения**:

- A*: `assets/coworking/reception.png`;
- B: `assets/coworking/phone-booth.png`;
- C: `assets/coworking/meeting-room.png`.

До ответа не показывать названия объектов ни визуально, ни в `alt`, ни в
`aria-label`; доступны только `Opción A/B/C`.

Реакции:

- A: `Sí, esta es la recepción. Aquí te dan la tarjeta de entrada.` → карта
  появляется у игрока.
- B: `Esta es una cabina para hablar a solas. Aquí no dan tarjetas. La recepción está junto a la entrada.` → игрок заглядывает в пустую кабинку, затем получает карту на стойке.
- C: `Esta es una sala de reuniones para trabajar en grupo. La tarjeta se recoge en recepción.` → за стеклом видна чужая встреча, затем игрок получает карту.

### 2. El puesto con enchufe — найти по описанию

На ноутбуке после входа в сцену виден только нейтральный индикатор батареи `8%`;
он не является карточкой ответа.

Лусия:

`Tu portátil tiene muy poca batería. Busca un puesto con enchufe.`

Карточки — **только изображения**:

- A: `assets/coworking/window-desk.png` — стол у окна без видимой розетки;
- B*: `assets/coworking/desk-with-outlet.png` — стол с европейской розеткой Schuko;
- C: `assets/coworking/lounge-sofa.png` — диван и низкий столик.

Реакции:

- A: `Este puesto está junto a la ventana, pero no tiene enchufe. El portátil sigue sin cargarse. Buscamos un cable alargador.` → к столу протягивается чрезмерно длинный удлинитель; он сохраняется до финала.
- B: `Este puesto tiene enchufe. Conectas el portátil y empieza a cargarse.` → появляется кабель, заряд растёт.
- C: `Este sofá está libre, pero no es un puesto de trabajo y aquí no hay enchufe. Llevamos una mesa pequeña y un cable alargador.` → появляется неудобный низкий стол и удлинитель; сохраняются до финала.

### 3. El puesto и el enchufe — помочь коллеге

Коллега Дани подходит с телефоном:

`Perdona, ¿está libre este puesto? Me queda un uno por ciento de batería.`

Карточки — **фразы без картинок**:

- A*: `Sí, está libre. Puedes usar este enchufe.`
- B: `Sí, está ocupado. Puedes usar la ventana.`
- C: `No. Puedes imprimir la batería.`

Реакции:

- A: `Gracias. Conecto el teléfono al enchufe y me siento en el puesto libre.` → телефон заряжается рядом.
- B: `“Libre” significa que nadie está usando el puesto. Si estuviera ocupado, no podría sentarme. La ventana tampoco carga el teléfono; necesito el enchufe.` → Дани садится и подключает телефон.
- C: `Una batería no se imprime. Para cargar el teléfono necesito un enchufe y un puesto libre.` → Дани подключает телефон.

Это второе употребление `puesto` и `enchufe`: не поиск для себя, а ответ на просьбу другого человека.

### 4. La contraseña — попросить информацию

На экране ноутбука показывается только состояние отсутствия соединения, без
слова `contraseña` и без визуального указателя на лучший ответ.

Лусия:

`La red aparece, pero no puedes conectarte. ¿Qué me preguntas?`

Карточки — **фразы без картинок**:

- A*: `¿Cuál es la contraseña del wifi?`
- B: `¿Qué sala está ocupada?`
- C: `¿Dónde puedo imprimir?`

Реакции:

- A: `La contraseña está escrita en tu tarjeta. La introduces y el portátil se conecta.` → сеть подключена.
- B: `Una sala puede estar libre u ocupada, pero eso no conecta el ordenador. Para entrar en la red necesitas la contraseña.` → Лусия указывает на карту; сеть подключена.
- C: `Imprimir sirve para obtener una copia en papel. Para conectarte al wifi necesitas la contraseña.` → Лусия указывает на карту; сеть подключена.

### 5. La contraseña — передать правило другому

Новый резидент говорит:

`Perdona, no puedo conectarme a la red de invitados.`

Карточки — **фразы без картинок**:

- A*: `La contraseña está escrita en tu tarjeta.`
- B: `La sala de reuniones está ocupada.`
- C: `El enchufe está debajo de la mesa.`

Реакции:

- A: `La encuentra, introduce la contraseña y se conecta. “Muchas gracias”.`
- B: `La sala no cambia la conexión. Para entrar en la red necesita la contraseña.` → герой показывает карту, резидент подключается.
- C: `El enchufe da electricidad, no acceso a la red. Para conectarse necesita la contraseña.` → герой показывает карту, резидент подключается.

### 6. Imprimir — выполнить действие и попросить помощь

Сообщение клиента:

`Necesitamos tres copias en papel para la reunión.`

Показать иллюстрацию `assets/coworking/printer.png` только как состояние устройства
рядом с вопросом; карточки — **фразы без картинок**:

- A*: `Imprimir tres copias.`
- B: `Guardar el documento.`
- C: `Cerrar el documento.`

Реакции:

- A: `Has impreso tres copias. Ya puedes llevarlas a la reunión.` → три листа на столе.
- B: `Has guardado el archivo, pero todavía no hay copias en papel. Para tenerlas en la mano, necesitas imprimir.` → принтер пытается начать работу, но бумага заканчивается.
- C: `Has cerrado el documento. Así no aparece ninguna copia. Lo abrimos y elegimos imprimir.` → принтер пытается начать работу, но бумага заканчивается.

После любого пути принтер останавливается перед последним листом. Лусия:

`Falta papel. ¿Qué necesitas?`

Карточки — **фразы без картинок**:

- A*: `Quiero imprimir tres copias, pero no hay papel.`
- B: `Quiero reservar tres papeles.`
- C: `Quiero conectar tres copias.`

Реакции:

- A: `Claro. Pongo papel en la impresora y terminamos las tres copias.`
- B: `Las salas se reservan; los documentos se imprimen. Pongo papel para que puedas imprimir.`
- C: `Los dispositivos se conectan; los documentos se imprimen. Pongo papel para terminar las copias.`

Итог: ровно три листа лежат на столе. При неверном первом выборе рядом остаётся
визуальный след: закрытое окно документа или сохранённый файл, но не лишние копии.

### 7. La cabina и la sala de reuniones — один человек и группа

Сначала герой репетирует один.

Лусия:

`Quieres practicar solo y hablar en voz alta. Elige un espacio pequeño para una persona.`

Карточки — **только изображения**:

- A*: `assets/coworking/phone-booth.png`;
- B: `assets/coworking/meeting-room.png`;
- C: `assets/coworking/desk-with-outlet.png`.

Реакции:

- A: `Esta es una cabina. Es un espacio pequeño para hablar a solas sin molestar.` → герой репетирует внутри.
- B: `Esta es una sala de reuniones. Hay sitio para varias personas. Para practicar solo basta una cabina.` → герой видит три стула и переходит в кабинку.
- C: `Este es un puesto abierto. Si hablas en voz alta, te oyen todos. Para hablar a solas usa una cabina.` → соседи оборачиваются, герой переходит в кабинку.

Затем приходят Дани и ещё один коллега:

`Ahora sois tres y necesitáis compartir una pantalla. ¿Qué espacio pedís?`

Карточки — **фразы без картинок**:

- A: `Necesitamos una cabina.`
- B*: `Necesitamos una sala de reuniones.`
- C: `Necesitamos un puesto para una persona.`

Реакции:

- A: `La cabina es para una persona. Los tres cabéis de pie, pero no podéis sentaros ni ver bien la pantalla. Para trabajar en grupo necesitáis una sala de reuniones.` → три человека на мгновение комично теснятся в кабинке, затем выходят.
- B: `La sala de reuniones tiene sitio para los tres y una pantalla para compartir.`
- C: `Un puesto es un lugar de trabajo individual. Para tres personas necesitáis una sala de reuniones.` → коллеги пытаются разместиться вокруг одного стула, затем переходят.

### 8. Reservar — календарь и исправление

Лусия:

`La llamada empieza a las cuatro y dura media hora. Reserva la sala.`

Карточки — **фразы без картинок**; нейтральный календарь не использует
красный/зелёный и не подсвечивает лучший слот:

- A: `Reservar de tres y media a cuatro.`
- B*: `Reservar de cuatro a cuatro y media.`
- C: `Reservar de cuatro y media a cinco.`

Реакции:

- A: `La reserva termina a las cuatro, justo cuando empieza la llamada. Has reservado una hora demasiado temprana.` → карточка брони 15:30–16:00 сохраняется.
- B: `La sala queda reservada de cuatro a cuatro y media, durante toda la llamada.` → карточка брони 16:00–16:30.
- C: `La sala estará reservada a las cuatro y media, pero la llamada empieza a las cuatro. Has reservado una hora demasiado tarde.` → карточка брони 16:30–17:00.

Для A/C Лусия спрашивает:

`La hora no coincide. ¿Qué dices para cambiarla?`

Для B слот внезапно меняет клиент, и задаётся тот же вопрос без наказания за
правильный первый выбор:

`El cliente confirma que empezará exactamente a las cuatro. ¿Qué dices para confirmar la reserva?`

Карточки — **фразы без картинок**:

- A*: `Necesito reservar la sala de cuatro a cuatro y media.`
- B: `Necesito imprimir la sala a las cuatro.`
- C: `Necesito conectar la sala durante media hora.`

Реакции:

- A: `Perfecto. La sala queda reservada de cuatro a cuatro y media.`
- B: `Los documentos se imprimen. Las salas se reservan. Cambio la reserva a las cuatro.`
- C: `Los dispositivos se conectan. Las salas se reservan. Cambio la reserva a las cuatro.`

Итоговый слот у всех 16:00–16:30; исходная ошибка остаётся в журнале решений.

### 9. Libre / ocupada — понять состояние

В 15:55 из большой комнаты слышны голоса. Не использовать цветной индикатор,
табличку или пиктограмму, заранее выдающую состояние.

Лусия:

`Hay personas trabajando dentro. ¿Puedes entrar ahora?`

Карточки — **фразы без картинок**:

- A*: `No. La sala está ocupada.`
- B: `Sí. La sala está libre.`
- C: `La sala tiene contraseña.`

Реакции:

- A: `Exacto. Hay una reunión dentro, así que la sala está ocupada.`
- B: `“Libre” significa que nadie la está usando. Aquí hay una reunión, así que está ocupada.` → дверь приоткрывается, участники встречи видны, герой извиняется.
- C: `Una contraseña permite entrar en una red o un sistema. Esta sala está ocupada porque hay personas dentro.`

### 10. Кризис — собрать освоенные употребления

Входящий звонок уже виден. Лусия:

`La sala grande está ocupada. Queda una cabina libre y una sala pequeña que queda libre a las cuatro. Sois tres. ¿Qué necesitas?`

Карточки — **фразы без картинок**:

- A*: `Necesito reservar la sala pequeña, que está libre a las cuatro.`
- B: `Necesito reservar la cabina para tres personas.`
- C: `Necesito un puesto ocupado a las cuatro.`

Реакции:

- A: `Perfecto. La sala pequeña está libre, tiene tres sillas y queda reservada durante media hora.`
- B: `La cabina está libre, pero es para una persona. Para tres personas necesitas la sala de reuniones pequeña.` → герои снова пытаются войти втроём и сразу выходят.
- C: `Si un puesto está ocupado, otra persona ya lo está usando. Necesitas una sala libre para los tres.`

Все пути заканчиваются в маленькой переговорной. Герой начинает звонок:

`Buenos días. Gracias por esperar. Ya estamos listos.`

### 11. Эпилог — переход от ученика к участнику практики

После звонка появляется новый посетитель:

`Perdona, es mi primer día. ¿Dónde recojo mi tarjeta?`

Карточки — **фразы без картинок**:

- A*: `La recepción está junto a la entrada.`
- B: `La cabina está dentro de la tarjeta.`
- C: `El puesto está ocupado por la recepción.`

Реакции:

- A: `Gracias. Ya veo la recepción.`
- B: `La cabina es un espacio para hablar a solas. Las tarjetas se recogen en recepción.`
- C: `Un puesto puede estar ocupado por una persona. La recepción es el lugar donde te atienden al entrar.`

Затем:

`Ya tengo la tarjeta. ¿Cómo me conecto y dónde puedo cargar el portátil?`

Карточки — **фразы без картинок**:

- A*: `La contraseña está en la tarjeta. Ese puesto está libre y tiene enchufe.`
- B: `La sala está ocupada y puedes imprimir el wifi.`
- C: `Reserva la contraseña dentro de la cabina.`

Реакции:

- A: `Perfecto. Me conecto y pongo el portátil a cargar. Muchas gracias.`
- B: `El wifi no se imprime. Para conectarte necesitas la contraseña; para cargar el portátil necesitas un enchufe.`
- C: `Las salas se reservan. La contraseña permite conectarse y el enchufe permite cargar el portátil.`

Лусия завершает:

`Hace una hora no sabías cómo funcionaba este lugar. Ahora ya puedes explicárselo a otra persona.`

## Финальный результат и состояние

Показать широкую финальную сцену, собранную из решений, а не одну одинаковую
картинку:

- исходно выбранный стол у окна, стол с розеткой либо диван;
- прямой кабель либо длинный удлинитель;
- телефон Дани на зарядке;
- три распечатанных листа;
- исходная и исправленная карточки времени, если первая бронь была неверной;
- след комичного размещения троих в кабинке, если игрок её выбирал;
- маленькая переговорная с тремя участниками и закончившимся звонком;
- новичок у свободного места в эпилоге.

Заголовок: `Tu primer día`.

Итоговая реплика для прохождения без объясняемых ошибок:
`Has preparado la reunión y ya sabes moverte por el coworking.`

Итоговая реплика при одной или нескольких ошибках:
`Cada confusión te ha enseñado cómo funciona este lugar. La reunión está hecha y ahora puedes ayudar a otra persona.`

Журнал `Tus usos del español` открывается только в финале. Он группирует не
«правильно/неправильно», а целевые слова и два контекста их употребления, показывая
выбранную фразу и реакцию персонажа. `Volver a jugar` полностью сбрасывает состояние.

## Визуальное направление и готовые ассеты

Стиль: тёплая редакционная 3D-иллюстрация для взрослой аудитории, мягкая геометрия,
кремовый, терракота, шалфейный зелёный, тёмно-синий и небольшие горчичные акценты.
Свет позднего дня создаёт ощущение приближающегося звонка, но пространство остаётся
дружелюбным. Не добавлять текст внутрь изображений.

Готовые PNG:

| Файл | Назначение |
|---|---|
| `assets/coworking/cover.png` | каталог, вступление, визуальная база финала |
| `assets/coworking/reception.png` | изображение-карточка стойки |
| `assets/coworking/desk-with-outlet.png` | стол с испанской/европейской розеткой Schuko |
| `assets/coworking/window-desk.png` | привлекательный стол без розетки |
| `assets/coworking/lounge-sofa.png` | диван без рабочего стола и розетки |
| `assets/coworking/printer.png` | принтер с тремя чистыми листами |
| `assets/coworking/phone-booth.png` | одноместная кабинка |
| `assets/coworking/meeting-room.png` | переговорная с тремя стульями |

Не подписывать эти изображения испанскими словами до ответа. После ответа разрешена
нейтральная подпись результата в составе реакции. Не считать готовые PNG полным
набором последствий: удлинитель, зарядка телефона, три человека в кабинке, календарь
и финальную композицию реализовать как состояния/слои в принятой разработчиком
технике, не генерировать случайные несогласованные картинки.

## Интеграция и звук

1. Добавить карточку квеста в каталог с названием `Conexión a las cuatro`, метой
   `Vida cotidiana · Coworking`, описанием
   `Tu primer día, una reunión a las cuatro y un espacio lleno de reglas por descubrir.`
2. Квест открывается по `web/coworking.html`; движок и состояние самостоятельные.
   Не объединять существующие движки Caperucita, rocódromo, bicicleta и barbería.
3. Кнопки — обязательный полноценный способ прохождения. Микрофон и свободный
   AI-диалог не входят в задачу.
4. Следовать актуальному контракту T-001 для статического аудио. Не добавлять
   runtime TTS и browser `speechSynthesis`. Если T-001 всё ещё не готова, сцены и
   стабильный каталог реплик реализовать независимо, а отсутствие аудио честно
   отметить блокером в dev-отчёте.
5. Все озвучиваемые строки имеют постоянные ID. `Volver a escuchar` повторяет
   текущую реплику; `Más despacio` воспроизводит медленную версию. Реакция полностью
   заканчивается до `Continuar`.
6. Использовать общий `setupQuestNavigation({ isInProgress, onLeave })` с
   аргументами; `onLeave` останавливает текущее аудио. Не повторять дефект T-002 с
   вызовом без объекта.
7. Поддержать ширину от 360 px, клавиатуру, видимый фокус, reduced motion и перевод
   фокуса на новый вопрос. Доступность до ответа не раскрывает содержание
   изображений-карточек.

## Критерии приёмки

1. Из каталога открывается `Conexión a las cuatro`; квест можно полностью пройти
   кнопками, вернуться в каталог и начать заново.
2. В игре нет русского вне свёрнутого `vocabulario`.
3. Проверены все варианты всех сцен: выбор вызывает ровно указанную реакцию,
   одно последствие и один переход; двойной клик не применяет действие дважды.
4. Каждая из девяти целевых единиц встречается минимум в двух разных языковых
   играх согласно матрице, а не в двух одинаковых тестах.
5. Сцены 1, 2 и первая половина 7 используют только изображения с нейтральными
   именами `Opción A/B/C`; до ответа DOM, accessibility tree и имя файла в UI не
   раскрывают предмет.
6. Все остальные карточки содержат только испанский текст и не имеют переводящих
   картинок, эмодзи, иконок, цветовой маркировки или подсветки лучшего ответа.
7. При каждом неверном выборе реакция дословно объясняет выбранное употребление и
   безопасно доводит сцену до рабочего состояния; нет очков, штрафов, жизней или
   экрана проигрыша.
8. Все маршруты сходятся к звонку в маленькой переговорной и эпилогу с новичком.
9. Финал визуально сохраняет исходное рабочее место, тип кабеля, распечатки,
   карточки брони и последствия выбора кабинки; `Volver a jugar` сбрасывает всё.
10. `Tus usos del español` показывает два употребления каждой целевой единицы и
    реальные выбранные фразы/реакции, не выставляя оценку.
11. Визуальные PNG загружаются без искажений и заметной потери качества; Schuko
    остаётся европейской розеткой, а на изображениях нет текста и логотипов.
12. Точные испанские строки из ТЗ не перефразированы и проходят проверку текста;
    PM отдельно читает diff на естественность.
13. Нет runtime TTS. Аудио соответствует актуальному контракту T-001 либо отсутствие
    инфраструктуры явно отмечено как блокер, но не маскируется браузерным голосом.
14. Навигация не падает при старте; выход во время прогресса вызывает подтверждение,
    останавливает аудио и корректно возвращает в каталог.
15. QA вручную перечисляет в секции `Требует ручной проверки`: desktop/mobile,
    отсутствие визуальных подсказок до ответа, читаемость восьми PNG, европейскую
    розетку, минимум три комбинации финального состояния и репрезентативное аудио.

## Чего не делать

- Не превращать квест в словарь, карточки «слово + перевод» или серию одинаковых
  multiple choice вопросов.
- Не считать простое повторение слова второй языковой игрой.
- Не показывать правильный ответ картинкой рядом с испанской фразой, подписью,
  эмодзи, `alt`, aria-текстом, цветом или положением карточки.
- Не добавлять русский в реплики, реакции, кнопки или финальный журнал.
- Не наказывать ошибку провалом встречи, потерей времени, опасностью, насмешкой или
  необходимостью угадать тот же ответ повторно.
- Не делать случайный одинаковый финал, который игнорирует накопленные решения.
- Не добавлять аккаунты, оплату, настоящий календарь, бэкенд, микрофон, свободный
  AI-диалог, новые библиотеки без необходимости или новые общие движки.
- Не менять и не объединять существующие квесты. Не перезапускать пользовательский
  прокси 5179.
- Не делать push/deploy. Разработка и QA идут только через `pm-run.mjs`, merge —
  после `qa-passed`, чтения испанского PM и ручной проверки Андреем.

## Запуск

ТЗ задаёт весь испанский текст дословно, поэтому разработчика запускать штатно:

`node tools/pm-run.mjs dev T-003`

QA — отдельной сессией с максимальным усилием:

`node tools/pm-run.mjs qa T-003`

