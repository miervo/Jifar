// Палитра, анимация и раскладка длинной страницы — в одном месте.
export const palette = {
  sky: "#DFF3FF",
  skyLight: "#EDF8FF",
  cloud: "#FFFFFF",
  milk: "#FFF8E7",
  gold: "#F4BE48",
  sand: "#E9CA91",
  terracotta: "#C76A38",
  brown: "#492B20",
  green: "#71815B",
  // Производные оттенки для глубины иллюстрации
  goldDeep: "#E0A63A",
  sandDeep: "#D9B577",
  terracottaDeep: "#9A4520",
  leafLight: "#95A37C",
} as const;

export const motionConfig = {
  /** Прокрутка между соседними вопросами: от и до, мс (зависит от расстояния) */
  scrollMinMs: 550,
  scrollMaxMs: 900,
  /** Пауза между появлением облачка речи и кнопкой «я приду!», мс */
  comeButtonDelayMs: 650,
  /** Сколько длится складывание ответов в конверт целиком, мс (должно совпадать с CSS) */
  envelopeSealMs: 2300,
  /** Улёт конверта после успешного сохранения, мс */
  envelopeFlyMs: 1000,
} as const;

/** Раскладка: высоты участков страницы (снизу вверх) и пропорции жирафа. */
export const layoutConfig = {
  /** Высота стартового участка у копыт */
  welcomeMinHeight: "100svh",
  /** Минимальная высота участка с вопросом */
  questionMinHeight: "max(80svh, 600px)",
  /** Отступ земли от низа страницы, px */
  groundOffset: 44,
  /** Масштаб жирафа: ширина экрана / 420, в этих пределах */
  scaleMin: 0.75,
  scaleMax: 1.35,
  /** Ширина, начиная с которой карточки чередуются слева и справа от жирафа */
  desktopMinWidth: 900,
  /** С какой стороны от шеи стоит карточка на широком экране (шаги 1–5) */
  questionSides: ["right", "left", "right", "left", "right"] as const,
} as const;
