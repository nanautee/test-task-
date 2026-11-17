const { performance } = require('node:perf_hooks');

async function main() {
  if (process.argv.length !== 3) {
    throw new Error('Запуск: node index.js <адрес HTTP или HTTPS>');
  }

  let url;
  try {
    url = new URL(process.argv[2]);
  } catch {
    throw new Error('Некорректный адрес. Укажите полный URL.');
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Поддерживаются только адреса HTTP и HTTPS.');
  }

  const count = 10;
  let tBytes = 0;
  let tSec = 0;

  for (let i = 0; i < count; i++) {
    const start = performance.now();
    const res = await fetch(url, {
      headers: { 'Accept-Encoding': 'identity' },
      signal: AbortSignal.timeout(120_000),
    });

    if (!res.ok) {
      await res.body?.cancel();
      throw new Error(`Запрос ${i + 1}: HTTP ${res.status}`);
    }

    let bytes = 0;
    if (res.body) {
      for await (const chunk of res.body) {
        bytes += chunk.byteLength;
      }
    }

    tSec += (performance.now() - start) / 1000;
    tBytes += bytes;
  }

  console.log(`Запросов: ${count}`);
  console.log(`Среднее время запроса: ${(tSec / count).toFixed(3)} с`);
  console.log(`Всего скачано: ${tBytes} байт`);
  console.log(`Скорость скачивания: ${(tBytes / 1024 / 1024 / tSec).toFixed(3)} МиБ/с`);
}

main().catch((err) => {
  const msg = {
    TimeoutError: 'Превышено время ожидания ответа (120 секунд).',
    TypeError: 'Не удалось выполнить запрос. Проверьте адрес и соединение.',
  }[err.name] || err.message;
  console.error(`Ошибка: ${msg}`);
  process.exitCode = 1;
});
