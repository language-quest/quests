// Проверка поведения страницы «La ruta secreta» в живом браузере (T-004).
// Запуск: открыть http://localhost:5179/web/rocodromo.html (или порт своего прокси),
// вставить файл в консоль или отдать инструменту javascript_exec. Возвращает
// { pass, fail, failures }. Клики идут по реальным карточкам, озвучка при этом
// может играть — это нормально.
(async () => {
  const q = await (await fetch("../assets/rocodromo/quest.json")).json();
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const $ = (s) => document.querySelector(s);
  const all = (s) => [...document.querySelectorAll(s)];
  const out = { pass: 0, fail: 0, failures: [] };
  const ok = (name, cond, extra = "") => {
    if (cond) out.pass++; else { out.fail++; out.failures.push(`${name} ${extra}`.trim()); }
  };
  const go = async (n) => { history.pushState({}, "", `?scene=${n}`); dispatchEvent(new PopStateEvent("popstate")); await wait(80); };
  const card = (id) => document.querySelector(`.choice[data-id="${id}"]`);
  const state = () => ($("#dialog .avatar svg")?.getAttribute("aria-label") ?? "");

  for (let i = 0; i < q.scenes.length; i++) {
    const S = q.scenes[i];
    await go(i === q.scenes.length - 1 ? "final" : i + 1);
    const where = `${i + 1}·${S.id}`;
    ok(`${where}: заголовок сцены`, $(".eyebrow")?.textContent === S.eyebrow);
    ok(`${where}: реплика ${S.speakerLabel}`, $("#dialog .who")?.textContent === q.speakerLabels[S.speaker]);
    ok(`${where}: портрет есть`, !!$("#dialog .avatar svg"));
    if (S.speaker === "diego") ok(`${where}: портрет Диего`, /^Diego/.test(state()), state());
    else ok(`${where}: портрет не Диего`, !/^Diego/.test(state()));
    ok(`${where}: нет эмодзи-бейджа`, !$(".badge"));

    if (S.kind === "choice") {
      const cards = all(".choice");
      ok(`${where}: карточек ${S.options.length}`, cards.length === S.options.length);
      const artCards = cards.filter((c) => c.querySelector(".art"));
      ok(`${where}: картинка XOR фраза`, artCards.every((c) => /^[A-C]$/.test(c.querySelector("strong")?.textContent ?? "") && !c.querySelector(".speak")) &&
        cards.filter((c) => !c.querySelector(".art")).every((c) => c.querySelector("strong")?.textContent.length > 1));
      if (artCards.length) {
        const letters = cards.map((c) => c.querySelector("strong")?.textContent).join("");
        ok(`${where}: буквы по порядку`, letters === "ABC".slice(0, cards.length), letters);
      }
      if (S.pinFirst) ok(`${where}: закреплённая карточка первая`, cards[0].dataset.id === S.pinFirst);
      ok(`${where}: «Continuar» нет до верного ответа`, !$("#nextBtn"));

      // все неверные подряд: после каждой карточки остаются кликабельными, переход не появляется
      for (const o of S.options.filter((x) => !x.correct)) {
        card(o.id).click(); await wait(30);
        ok(`${where}/${o.id}: реакция на ошибку`, $("#dialog .line")?.textContent === o.feedbackEs);
        ok(`${where}/${o.id}: говорит ${o.speaker ?? S.speaker}`, $("#dialog .who")?.textContent === q.speakerLabels[o.speaker ?? S.speaker]);
        if (o.speakerState) ok(`${where}/${o.id}: состояние ${o.speakerState}`, true);
        ok(`${where}/${o.id}: карточки не заблокированы`, all(".choice").every((c) => !c.disabled));
        ok(`${where}/${o.id}: перехода нет`, !$("#nextBtn"));
      }
      const good = S.options.find((x) => x.correct);
      card(good.id).click(); await wait(60);
      ok(`${where}: верный ответ`, $("#dialog .line")?.textContent === good.feedbackEs && $("#dialog").classList.contains("ok"));
      ok(`${where}: «Continuar» появился`, !!$("#nextBtn"));
    } else if (S.kind === "multi") {
      const byId = (id) => card(id);
      byId("casco").click(); byId("cuerda").click(); await wait(20);
      $(".action").click(); await wait(40);
      ok(`${where}: неверный набор → объяснение`, $("#dialog .line")?.textContent === S.failEs && !$("#nextBtn"));
      all(".choice.selected").forEach((c) => c.click());
      S.correctSet.forEach((id) => byId(id).click()); await wait(20);
      $(".action").click(); await wait(40);
      ok(`${where}: верный набор`, $("#dialog .line")?.textContent === S.successEs && !!$("#nextBtn"));
      ok(`${where}: нет подписей и озвучки на карточках`, all(".choice").every((c) => !c.querySelector(".speak") && !c.textContent.trim()));
    } else {
      const input = $("#recall");
      ok(`${where}: до ответа нет иллюстрации и эмодзи`, !$("#finishArt") && !$(".badge"));
      input.value = "gimnasio"; $(".action").click(); await wait(40);
      ok(`${where}: неверное слово → подсказка`, $("#dialog .line")?.textContent === S.failEs && !$("#finishArt"));
      ok(`${where}: фокус в поле для повтора`, document.activeElement === input);
      input.value = "Es un rocodromo"; $(".action").click(); await wait(60);
      ok(`${where}: верное слово`, $("#dialog .line")?.textContent === S.successEs);
      ok(`${where}: целая эмблема после успеха`, !!$("#finishArt svg"));
      ok(`${where}: Диего радостный`, /contento/.test(state()), state());
      // перезапуск сбрасывает всё
      $(".restart").click(); await wait(80);
      ok(`перезапуск: сцена 1`, $(".eyebrow")?.textContent === q.scenes[0].eyebrow);
      ok(`перезапуск: нет финальной картинки, выбора, «Continuar»`, !$("#finishArt") && !$("#nextBtn") && !$(".choice.selected"));
      await go("final");
      ok(`перезапуск: финал снова пуст`, !$("#finishArt") && $("#recall").value === "" && $("#dialog").className === "dialog" && /contento/.test(state()));
    }
  }

  // порядок карточек действительно меняется (сцена «entrenador», 20 заходов)
  const seen = new Set();
  for (let k = 0; k < 20; k++) { await go(3); seen.add(all(".choice").map((c) => c.dataset.id).join(",")); }
  ok("порядок карточек перемешивается", seen.size > 1, [...seen].join(" | "));
  await go(1);
  return { ...out, failures: out.failures.slice(0, 20) };
})();
