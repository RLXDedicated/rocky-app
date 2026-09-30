# QA desk

A separate, light page for QA analysts: **https://rocky-dist.vercel.app/qa/**
(no game, no Rocky world — it opens in under a second). QA analysts (title
`qa`) and admins can use it; everyone else gets a friendly "not for you".

## Logging audits

- **One by one (keyboard):** type part of the agent's name → `Enter` → type
  the ticket → `Enter` = Pass, `Shift+Enter` = Fail → `1`–`6` picks the reason
  → `Enter` logs it. "Mantener agente" keeps the agent for several tickets.
- **Paste from Excel:** copy the rows with the header row. Columns found by
  name (ES/EN): agent/correo/nombre, fecha/date, resultado/result (Pass/Fail,
  Cumple/No cumple…) or puntaje/score (with a pass mark), ticket/caso,
  motivo/reason, comentario/note. Dates day-first unless the sheet says
  otherwise; Excel serial dates work. A ticket already logged for the same
  agent and day is skipped.

## What an audit does

| Result | Engine | Pet |
| --- | --- | --- |
| Pass | QA Pass event (XP, energy, streak shield progress) | +5 happiness, +3 coins |
| Fail | Documentation Alert (energy down, Rocky worried; Recovery reminders follow) | −10 happiness |

A wrong entry is flipped with "Cambiar a Pass/Fail" — an engine Correction,
never a silent edit. Everything lands in `qa_audits` (migration 014) and in
Admin → Registros → Auditorías QA (filters, pass rate, top fail reason, CSV).

API: `GET /api/qa/desk`, `POST /api/qa/audits`, `POST /api/qa/audits/bulk`,
`PUT /api/qa/audits/:id`, `GET /api/admin/qa/audits?since=YYYY-MM-DD`.
