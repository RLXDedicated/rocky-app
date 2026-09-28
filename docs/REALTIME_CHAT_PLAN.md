# Rocky en vivo: visitas en tiempo real, chat interno e infraestructura

Análisis y propuesta (septiembre 2026). **Estado: construido** (pasos 1, 2,
3 y el backup; la pelota compartida y el chat fase 2 quedan pendientes).
El texto de uso aceptable fue aprobado por RLX el 2026-09-28. Ver
"Cómo quedó construido" al final.

## 1. Lo que existe hoy

- Las visitas son **asíncronas**, como en Pet Society: entras al mundo de un
  compañero, ves su Rocky, su fondo y sus objetos, y puedes acariciar,
  saludar o regalar un premio. El dueño se entera después, en su bandeja.
- El frontend (Vercel) es estático. Toda la lógica y los datos están en un
  solo servicio Node/Express en Railway (`rocky-backend`, 1 réplica, región
  `sfo`) con SQLite en un volumen montado en `/data`.
- El servidor es la fuente de verdad: cada acción (`performPetAction`) se
  valida allí y queda en el historial.

## 2. ¿Se puede ver al otro "en vivo y en directo"? Sí.

### Cómo se sentiría

1. En **Friends**, cada compañero muestra un punto verde si está conectado
   ahora mismo, y dónde está ("en su casa", "visitando a Ana", "jugando
   Treat Catch").
2. Si visitas a alguien que está conectado, **los dos lo ven al mismo
   tiempo**: tu Rocky entra caminando al mundo de tu compañero, con tu
   ropa, alas y sombrero. El anfitrión recibe un aviso ("Carlos llegó de
   visita 👋").
3. Lo que hace cada uno se ve en la pantalla del otro en menos de medio
   segundo: acariciar, saludar, dar un premio, bailar y, lo más divertido,
   **jugar a la pelota juntos** (cada uno la patea y ambos ven el mismo
   rebote).
4. Mientras están juntos se abre un chat pequeño de la visita, además de
   las **reacciones rápidas** (❤️ 😂 👏 🎉) que aparecen como globos sobre
   cada Rocky.
5. Si el anfitrión no está conectado, la visita sigue funcionando como hoy
   (asíncrona) y le queda la nota en la bandeja.

### Cómo se construye

- **Un canal en vivo por agente**: una conexión WebSocket
  (`wss://…railway.app/api/live`) que el navegador abre al iniciar sesión y
  mantiene abierta. Railway soporta WebSockets sin configuración extra;
  Vercel no participa, porque el navegador se conecta directo al backend,
  igual que hoy con la API.
- **Autenticación**: el primer mensaje del socket lleva el mismo token de
  sesión que ya usa la API. Sin token válido, el servidor cierra la conexión.
- **Presencia**: el servidor guarda en memoria quién está conectado y en
  qué "sala" (su casa o la casa que visita). Cuando alguien entra o sale,
  avisa a sus amigos. No hace falta guardarlo en la base de datos.
- **Salas**: cada casa es una sala (`home:<id>`). Visitar = unirse a la sala
  del anfitrión. Todo lo que pasa en la sala se reenvía a los que están
  dentro (máximo, por ejemplo, 6 visitantes a la vez).
- **Acciones con premio** (acariciar, regalar, las monedas de visita) siguen
  pasando por la API actual, que las valida y las guarda. El socket solo
  **anuncia** el resultado a la sala. Así no se abre ningún atajo para
  inventar monedas o XP.
- **La pelota compartida**: no se envían posiciones 60 veces por segundo,
  solo cada patada (punto de impacto y fuerza, unos 30 bytes). Cada
  navegador simula el rebote con la física que ya existe, y el anfitrión
  corrige la posición cada segundo si alguno se desvía.
- **Reconexión**: si se cae el wifi o hay un despliegue, el cliente se
  reconecta solo (espera de 1, 2, 4… hasta 30 s) y vuelve a pedir el estado
  de la sala.

## 3. Chat interno

"Queremos que sea grande": se diseña como un producto, no como un extra.

### Funciones propuestas

| Fase | Qué incluye |
| --- | --- |
| 1 | Mensajes 1 a 1 entre agentes, un canal general del piloto y el chat de cada visita en vivo. Indicador de "escribiendo…", leído/no leído, contador en la barra y notificación del navegador. |
| 2 | Canales por equipo o supervisor (creados por admin), menciones `@nombre`, reacciones con emoji, stickers de Rocky y compartir un logro o insignia en el chat. |
| 3 | Anuncios de QA fijados, encuestas rápidas, búsqueda en el historial y exportación para auditoría. |

### Cómo se guarda

- Tres tablas nuevas en SQLite (migración 005): `chat_channels`,
  `chat_members` y `chat_messages` (id, canal, autor, texto, fecha,
  editado/borrado). Los mensajes llegan por el socket y se guardan antes
  de reenviarse, así nadie pierde un mensaje por estar desconectado: al
  volver, el cliente pide lo que se perdió desde su último id.
- Texto plano con un límite de 1000 caracteres. Imágenes y adjuntos quedan
  fuera en la fase 1 (añaden almacenamiento, moderación y riesgo de datos).

### Seguridad, moderación y cumplimiento (importante para RLX/Lowe's)

- **Datos de clientes**: el chat no debe usarse para compartir información
  de clientes. Se propone un filtro que detecte teléfonos, correos,
  direcciones y números de pedido y pida confirmación o bloquee el envío,
  más un aviso fijo en el chat.
- **Moderación**: botón "reportar mensaje"; los admins (los mismos de
  `ROCKY_ADMIN_EMAILS`) ven los reportes en la consola, pueden ocultar
  mensajes y silenciar a un usuario por un tiempo. Todo queda en el
  historial de auditoría, como ya pasa con las acciones de admin.
- **Límite de envío**: por ejemplo, 20 mensajes por minuto por agente.
- **Retención (decidido)**: 90 días en el historial, con borrado
  automático nocturno de lo más antiguo.
- **Privacidad entre agentes**: se siguen usando los ids opacos que ya
  existen; los correos nunca se muestran a otros agentes.
- **Quién puede leer los chats (decidido)**: el chat es personal entre
  agentes; los **supervisores no tienen acceso**. Solo los **admins de
  Rocky** (`ROCKY_ADMIN_EMAILS`) tienen una copia completa de todas las
  conversaciones, para control de calidad. Eso implica:
  - Un rol separado: no basta con ser supervisor para ver chats.
  - Una vista de admin para buscar y leer conversaciones. Cada lectura
    queda registrada en la auditoría (quién leyó qué y cuándo).
  - Un backup propio de las conversaciones: una exportación diaria cifrada
    fuera del servidor (por ejemplo, un bucket de Railway), aparte de la
    copia del volumen. Así la copia de QA no depende de un solo disco.
  - Aviso claro a los agentes (ver el texto de uso aceptable, abajo).

### Texto de uso aceptable

Son las reglas del chat que el agente lee y acepta **una vez**, antes de
usarlo por primera vez. Queda guardado quién aceptó y cuándo, y se puede
volver a leer desde el chat. Sirve para dos cosas:

1. **Transparencia**: el agente sabe que sus mensajes no son privados
   frente a los admins de QA. En Colombia la Ley 1581 de 2012 (habeas
   data) exige informar la finalidad del tratamiento de datos personales.
   Legal/RRHH de RLX debe revisar el texto final.
2. **Reglas claras**: con ellas los admins pueden moderar sin
   discusiones.

Borrador (en inglés, el idioma de la app):

> **Rocky chat — house rules**
>
> Rocky chat is for friendly conversation between RLX agents.
>
> - Be kind and respectful. No harassment, discrimination, threats or
>   offensive content.
> - **Never share customer information**: names, phone numbers, emails,
>   addresses, order numbers or account details. Use the approved work
>   systems for that.
> - Don't share passwords, PINs or any login details, not even with a
>   teammate.
> - Keep it work-appropriate. No spam, chain messages or selling.
> - Your supervisors can't read your chats. **Rocky admins keep a copy
>   of every conversation for quality control and safety**, and may review
>   it when needed. Messages are kept for 90 days.
> - Anyone can report a message. Admins may hide messages or pause chat
>   for someone who breaks these rules.
>
> [ I understand and agree ]


## 4. ¿La infraestructura actual aguanta? Sí, de sobra.

### Uso real (Railway, últimos 7 días)

| Recurso | Uso actual | Límite del plan |
| --- | --- | --- |
| CPU | promedio 0.0002 vCPU, pico 0.017 | 2 vCPU |
| RAM | promedio 44 MB, pico 422 MB (durante un despliegue) | 1 GB |
| Disco (volumen) | 54 MB | amplio |
| Red de salida | ~2 MB en el pico | — |

### Estimación con todo lo nuevo, para 56 agentes conectados a la vez

- **Conexiones abiertas**: 56 sockets ≈ 56 × 30–50 KB ≈ 3 MB de RAM.
- **Mensajes**: aun con todos chateando y jugando, son decenas de mensajes
  por segundo como mucho. Un solo proceso Node maneja miles.
- **Base de datos**: 56 agentes × 200 mensajes al día × 90 días ≈ 1 millón
  de filas ≈ 200–300 MB. SQLite lo maneja bien con índices por canal y
  fecha.
- **Latencia**: el servidor está en `sfo` (California). Desde Colombia son
  unos 100–150 ms, suficiente para chat y para la pelota compartida.

**Conclusión**: para el piloto de 56 agentes no hace falta cambiar de
servidor, plan ni base de datos. Recomendaciones de bajo costo:

1. **Copias de seguridad del volumen**: activar backups en Railway o una
   copia diaria de la base a un bucket. Con el chat, la base pasa a tener
   datos que la gente espera no perder.
2. **Una sola réplica**: SQLite en volumen implica un solo servidor. Está
   bien para el piloto. Si Rocky llega a toda la operación (cientos o miles
   de agentes), el paso es Postgres (Railway lo ofrece), Redis para
   repartir los mensajes en vivo entre varias réplicas, y 2 o más réplicas.
   El código se puede preparar desde ya para que ese cambio sea solo de
   configuración.
3. **Región**: si la mayoría de los agentes está en Latinoamérica, mover el
   servicio a la región de Railway más cercana (por ejemplo, la costa este
   de EE. UU.) baja la latencia unos 40–60 ms. Es opcional.
4. **Despliegues**: cada despliegue reinicia el servidor y corta los
   sockets unos segundos. La reconexión automática lo cubre; conviene
   desplegar fuera del horario pico.

## 5. Orden propuesto y esfuerzo

| Paso | Qué | Esfuerzo aprox. |
| --- | --- | --- |
| 1 | Canal en vivo (WebSocket + auth + reconexión) y presencia ("en línea" en Friends) | 1–2 días |
| 2 | Visitas en vivo: el Rocky visitante aparece, acciones y reacciones sincronizadas | 2–3 días |
| 3 | Chat fase 1: 1 a 1, canal general, chat de la visita, no leídos, reportes y filtro de datos | 3–4 días |
| 4 | Pelota compartida en la visita | 1–2 días |
| 5 | Chat fase 2 (canales de equipo, menciones, stickers de Rocky) | 3 días |
| — | Backups del volumen (en paralelo, configuración) | < 1 hora |

Decidido: retención de 90 días; los supervisores no leen chats; los admins
tienen copia completa con backup. Antes del paso 3 solo falta que
Legal/RRHH de RLX apruebe el texto de uso aceptable.

## 6. Cómo quedó construido

### Para los agentes
- **Pestaña Chat** (con contador de no leídos en la barra y en el título de
  la pestaña): canal **General** para todo el piloto, conversaciones **1 a 1**
  ("+ New chat" o el botón 💬 en Friends) y los chats de las visitas.
- **Reglas**: antes del primer mensaje el agente lee el texto aprobado y
  pulsa "I understand and agree". Queda registrado quién aceptó y cuándo
  (`chat.rules.accepted` en Auditoría). Si el texto cambia, se sube
  `RULES_VERSION` y todos aceptan de nuevo.
- **Datos de clientes**: si un mensaje parece tener un correo, teléfono,
  número de pedido o dirección, no se envía y aparece un aviso. El agente
  puede editarlo o confirmar que no es un dato de cliente; en ese caso el
  mensaje queda marcado ⚠️ para los admins.
- Límite de 20 mensajes por minuto. Cualquier mensaje se puede reportar (⚑).
- **Presencia**: en Friends aparece un punto verde y "Online · at home" o
  "visiting Ana"; los conectados salen primero y el botón dice "Visit live".
- **Visita en vivo**: el Rocky del visitante (con su ropa, alas y sombrero)
  aparece en el mundo del anfitrión y viceversa, con su nombre y un punto
  "live". Debajo hay un panel con quién está, reacciones (❤️ 😂 👏 🎉 👋 😮
  🔥 ⭐), Wave / Dance / Cheer y el chat de esa casa. Si el anfitrión está en
  otra parte de la app, le aparece "👋 Luis is visiting your Rocky right
  now!" con un botón para ir a casa.

### Para los admins (pestaña Admin → 💬 Chats)
- **Reportes**: pendientes y resueltos, con el mensaje, quién reportó y el
  motivo; ocultar o descartar.
- **Conversaciones**: todas (General, 1 a 1 y visitas), con participantes y
  correos; ocultar mensajes. **Cada lectura queda en Auditoría**
  (`chat.admin.read`).
- **Pausar el chat** de un agente (1 hora a 7 días) y levantar la pausa.
- **Exportar** un rango de fechas a JSON (incluye ocultos y marcados;
  queda en Auditoría).
- **Backup**: estado de la copia en el volumen, en el bucket y el cifrado;
  botón "Hacer backup de hoy ahora".
- Los supervisores no tienen acceso: todo esto exige rol ADMIN
  (`ROCKY_ADMIN_EMAILS`).

### Técnico
- WebSocket en `/api/live` del mismo servicio de Railway
  (`backend/src/infrastructure/live/liveHub.ts`). Entra con el token de la
  sesión PIN o, mientras el piloto use enlaces sin PIN
  (`ROCKY_AUTH_MODE=pilot-header` sin `ROCKY_REQUIRE_LOGIN`), con la misma
  dirección que ya usa la API. Latido cada 30 s y reconexión automática en
  el navegador (1 s, 2 s, 4 s… hasta 30 s).
- Chat: migración 005 (`chat_channels`, `chat_members`, `chat_messages`,
  `chat_reports`, `chat_consents`, `chat_mutes`),
  `backend/src/application/chatApplicationService.ts` y
  `backend/src/api/chatRoutes.ts`.
- **Retención**: cada noche se borran los mensajes de más de 90 días
  (`chat.retention.purge` en Auditoría).
- **Backup diario** (`backend/src/infrastructure/chat/chatBackup.ts`): los
  mensajes del día anterior, cifrados con AES-256-GCM, en
  `/data/chat-backups/` y en un bucket de Railway (copia fuera del servidor).
  Variables: `ROCKY_CHAT_BACKUP_KEY` y `ROCKY_BACKUP_S3_ENDPOINT`, `_BUCKET`,
  `_REGION`, `_ACCESS_KEY_ID`, `_SECRET_ACCESS_KEY`. Para abrir un backup:
  `ROCKY_CHAT_BACKUP_KEY=<clave> node tools/decrypt-chat-backup.mjs chat-AAAA-MM-DD.enc.json`.
  La clave está en las variables del servicio en Railway; sin ella los
  backups no se pueden leer, así que no hay que borrarla ni cambiarla.
- Pendiente: pelota compartida en la visita, notificaciones del navegador,
  canales por equipo, menciones y stickers (chat fase 2).
