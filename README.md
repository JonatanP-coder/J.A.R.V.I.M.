# Junior Astronaut Mission Trainer

Simulador espacial educativo en español e inglés. Diseña una nave en un hangar 3D, comprueba si tiene suficiente potencia y soporte vital, y toma decisiones durante el vuelo. Puedes abrir las referencias de la NASA desde la misma pantalla para investigar la tecnología real que inspiró cada pieza.



## Ejecutar en tu equipo

Necesitas Node.js 22.12 o posterior y pnpm. Abre una terminal en la carpeta que contiene `package.json` y ejecuta lo siguiente:

```sh
pnpm install
pnpm dev
```

Abre [el simulador local](http://127.0.0.1:3000). Este comando inicia la interfaz y la API de cuentas y evaluaciones. La simulación funciona sin claves de servicios externos. Para detener el servidor de desarrollo, pulsa Ctrl+C en la terminal.

En Windows también puedes ejecutar `pnpm build` después de instalar las dependencias y hacer doble clic en `START_APP.cmd` para abrir la versión compilada.

## Tu primera misión

1. **Elige tu perfil.** Recibirás un nombre en clave. Combina una edad (6–12, 13–17 o 18+) con un nivel de conocimiento (principiante, intermedio o avanzado). La edad guía el tono y el nivel determina la profundidad de las explicaciones. Puedes cambiar ambos en Configuración del perfil y conservar tu nave y tus XP.
2. **Construye la nave.** Escoge cápsula, paneles solares, soporte vital, escudo, motor y carga útil. Observa qué sucede con la masa, la potencia disponible y las reservas al sustituir una pieza. Todos los perfiles usan los mismos cálculos.
3. **Solicita la revisión de vuelo.** Si el consumo supera la generación, compara dos soluciones: instalar paneles que produzcan más electricidad o elegir un instrumento que consuma menos. Cuando el diseño esté aprobado, inicia el lanzamiento.
4. **Decide en ruta.** El vuelo se detiene ante un evento para que puedas leer las opciones. Usa la bitácora de misión para volver a consultar avisos y resultados.

## Aprender y consultar fuentes

En **Academia → Aula Espacial** encontrarás siete áreas de entrenamiento. En el hangar puedes consultar el dato histórico de la pieza seleccionada. Los enlaces **Fuentes NASA** llevan al documento o a la página oficial correspondiente. Las cifras de las piezas y los umbrales de aprobación pertenecen al modelo educativo.

Pulsa un término subrayado para leer una definición adaptada a tu perfil o abre **Glosario** para buscarlo. El selector ES / EN, la narración, los subtítulos y el movimiento reducido están disponibles durante el entrenamiento. En el hangar, usa ← y → para cambiar de categoría, ↑ y ↓ para recorrer piezas y Enter para instalar. En vuelo, P pausa y 1 o 2 seleccionan una decisión.

## Progreso y privacidad

La aplicación guarda el progreso local en el navegador. Los perfiles de menores permanecen en el dispositivo. Los adultos pueden crear una cuenta opcional y elegir si publican su nombre en clave y sus logros en la clasificación. Mantén los archivos de cuentas de `.data/` y las variables privadas de `.env` fuera del repositorio.

## Desarrollo

La interfaz usa React, TypeScript y Three.js. Express sirve la API y Vite compila la interfaz. El [motor pedagógico](./src/academy/adaptive.ts) resuelve las explicaciones por idioma, edad y conocimiento. Las [reglas de ingeniería](./src/utils/engineering.ts) calculan el estado de la nave. El [catálogo de referencias](./src/data/nasaSources.ts) reúne las fuentes utilizadas en las lecciones, piezas, eventos y definiciones.

```sh
pnpm typecheck
pnpm test
pnpm audit:i18n
pnpm build
```

Para alojar la aplicación completa, compila la interfaz y ejecuta `pnpm start` con `NODE_ENV=production` en un servidor con Node.js. Usa HTTPS, `COOKIE_SECURE=true` y un directorio persistente en `DATA_DIR` para las cuentas.

Proyecto educativo independiente. Las insignias y constancias reconocen el progreso dentro del simulador.

