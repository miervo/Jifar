// Необязательные настройки праздника. Ничего не выдумываем:
// пока значение null, соответствующий элемент не показывается.
export const eventConfig: {
  /** Ссылка на вишлист. null — ссылки нет, кнопка не показывается. */
  wishlistUrl: string | null;
  wishlistLabel: string;
} = {
  wishlistUrl: null,
  wishlistLabel: "открыть вишлист",
};
