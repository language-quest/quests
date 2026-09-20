# Промпт: карточка улики «два дерева»

Нужна для варианта C (`dos árboles`). На листе `36-clue-illustrations.png` пара деревьев
есть, но отрисована как два **отдельных** пункта шестиклеточной сетки — в отличие от тройки,
которая читается группой. Нужна однозначная сгруппированная пара.

Запускать тем же инструментом, что и остальные 44 файла (`image_gen`, скилл `imagegen`),
с `00-character-reference.png` как референсом стиля.

**Целевое имя файла:** `illustrations/38-clue-two-trees.png`
После генерации: `sips -s format jpeg -s formatOptions 78 -Z 1280 illustrations/38-clue-two-trees.png --out web/38-clue-two-trees.jpg`

---

## Промпт

```
Use case: illustration-story. Create ONE finished game illustration, landscape 3:2, for the
cooperative Caperucita preschool game. Use the provided image ONLY as gouache picture-book
style and paint-texture reference. ABSOLUTELY NO PEOPLE OR ANIMAL CHARACTERS from the
reference. Warm gentle light, tactile paper, rounded friendly shapes, clear readable
touch-sized objects. No text, letters, labels, numbers, UI, watermark, borders.

A single clue motif centred on plain ivory: EXACTLY TWO miniature storybook trees standing
close together as ONE grouped pair, their crowns almost touching, sharing one small patch of
grass at their base. Two clearly different species so each reads as a separate countable
object: one rounded green deciduous tree on the left, one darker conifer on the right. Equal
height, equal visual weight, generous empty ivory margin all around the pair so the group
reads as a single motif rather than two separate items. Same gouache visual style, clean
clear shapes. Count exactly 2 essential — no third tree, no bushes, no background tree
silhouettes.
```

---

## Почему именно так

- **«as ONE grouped pair», «crowns almost touching», «sharing one small patch of grass»** —
  это и есть исправление: на исходном листе пара стояла с тем же шагом, что остальные пять
  мотивов, и читалась как два отдельных пункта.
- **«two clearly different species»** — как на карточке тройки: разные породы помогают
  трёхлетке считать объекты, а не воспринимать повторяющийся узор.
- **«generous empty ivory margin»** — чтобы карточку можно было вырезать под панель улик
  без перерисовки.
- **«Count exactly 2 essential»** — формулировка, которая сработала на остальных карточках.

## Проверка после генерации

`node tools/validate-quest.mjs assets/caperucita/quest.json` — уберите
`"missingAssets": ["clue-card-two-trees"]` из варианта C в `quest.json`, когда файл появится.
