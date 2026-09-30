import { afterEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import WebSocket from 'ws'
import { createApp, type LiveContext } from '../src/app'
import { loadConfig } from '../src/config/env'
import { attachLiveHub, type LiveHub } from '../src/infrastructure/live/liveHub'
import { RULES_VERSION } from '../src/application/chatApplicationService'
import { buildMemoryPersistence, withAgents } from './testApp'

const ANA = 'ana.perez@rlx.us'
const LUIS = 'luis.gomez@rlx.us'

let server: Server | null = null
let hub: LiveHub | null = null
const sockets: WebSocket[] = []

afterEach(() => {
  for (const s of sockets) s.terminate()
  sockets.length = 0
  hub?.close()
  server?.close()
  hub = null
  server = null
})

async function start() {
  const config = loadConfig({
    NODE_ENV: 'production',
    ROCKY_PERSISTENCE_DRIVER: 'sqlite',
    ROCKY_DB_PATH: '/tmp/rocky-live-test.db',
    ROCKY_AUTH_MODE: 'pilot-header',
  })
  const app = createApp({ config, persistence: withAgents(buildMemoryPersistence(), ANA, LUIS), backupTarget: { dir: null, key: null, s3: null } })
  server = app.listen(0)
  hub = attachLiveHub(server, app.locals.live as LiveContext, { allowedOrigins: [] })
  const port = (server.address() as AddressInfo).port
  return { app, url: `ws://127.0.0.1:${port}/api/live` }
}

async function login(app: Parameters<typeof request>[0], email: string) {
  const res = await request(app).post('/api/auth/login').send({ email, pin: '4826' })
  expect(res.status).toBe(200)
  return res.body.token as string
}

/** A client that records every event and can wait for one. */
function client(url: string) {
  const ws = new WebSocket(url)
  sockets.push(ws)
  const events: Array<Record<string, unknown>> = []
  const waiters: Array<{ t: string; pred: (e: Record<string, unknown>) => boolean; resolve: (e: Record<string, unknown>) => void }> = []
  ws.on('message', (d) => {
    const e = JSON.parse(d.toString()) as Record<string, unknown>
    events.push(e)
    for (const w of waiters.slice())
      if (w.t === e.t && w.pred(e)) {
        waiters.splice(waiters.indexOf(w), 1)
        w.resolve(e)
      }
  })
  return {
    ws,
    events,
    open: () => new Promise<void>((r) => ws.once('open', () => r())),
    send: (m: Record<string, unknown>) => ws.send(JSON.stringify(m)),
    next: (t: string, pred: (e: Record<string, unknown>) => boolean = () => true) =>
      new Promise<Record<string, unknown>>((resolve, reject) => {
        const found = events.find((e) => e.t === t && pred(e))
        if (found) return resolve(found)
        waiters.push({ t, pred, resolve })
        setTimeout(() => reject(new Error(`timed out waiting for ${t}`)), 3000)
      }),
  }
}

describe('live channel', () => {
  it('rejects connections that do not sign in', async () => {
    const { url } = await start()
    const c = client(url)
    await c.open()
    const closed = new Promise<number>((r) => c.ws.once('close', (code) => r(code)))
    c.send({ t: 'auth', token: 'nope' })
    expect(await closed).toBe(4001)
  })

  it('presence, live visits, room actions and pushed chat messages', async () => {
    const { app, url } = await start()
    const anaToken = await login(app, ANA)
    const luisToken = await login(app, LUIS)

    const ana = client(url)
    await ana.open()
    ana.send({ t: 'auth', token: anaToken })
    const anaReady = await ana.next('ready')
    ana.send({ t: 'room', host: 'me' })

    const luis = client(url)
    await luis.open()
    luis.send({ t: 'auth', token: luisToken })
    const ready = await luis.next('ready')
    const anaKey = anaReady.me as string
    expect(ready.online).toEqual([expect.objectContaining({ id: anaKey, online: true })])
    expect(JSON.stringify(ready)).not.toContain('@')
    await ana.next('presence', (e) => e.online === true)

    // Luis visits Ana, who is at home: both see each other.
    luis.send({ t: 'room', host: anaKey })
    const state = await luis.next('room.state')
    expect(state.members).toEqual([expect.objectContaining({ id: anaKey, host: true, name: 'Ana Perez' })])
    const joined = await ana.next('room.join')
    expect(joined.member).toMatchObject({ name: 'Luis Gomez', host: false })
    expect((joined.member as { outfit: { scene: string } }).outfit.scene).toBe('scene-route')
    const where = await ana.next('presence', (e) => e.where === 'visiting')
    expect(where).toMatchObject({ host: anaKey, hostName: 'Ana Perez' })

    luis.send({ t: 'act', kind: 'react', emoji: '🎉' })
    expect(await ana.next('room.act')).toMatchObject({ kind: 'react', emoji: '🎉', name: 'Luis Gomez' })
    luis.send({ t: 'act', kind: 'react', emoji: '<script>' })
    luis.send({ t: 'move', x: 140 })
    expect(await ana.next('room.move')).toMatchObject({ x: 97 })

    // The home chat accepts Luis while he is there, and Ana gets it live.
    await request(app).post('/api/chat/rules').set({ Authorization: `Bearer ${luisToken}` }).send({ version: RULES_VERSION })
    const room = await request(app).post('/api/chat/visit').set({ Authorization: `Bearer ${luisToken}` }).send({ host: anaKey })
    expect(room.status).toBe(200)
    await request(app)
      .post(`/api/chat/channels/${room.body.id}/messages`)
      .set({ Authorization: `Bearer ${luisToken}` })
      .send({ text: '¡Hola Ana!' })
    const pushed = await ana.next('chat.message')
    expect(pushed).toMatchObject({ kind: 'visit', message: { body: '¡Hola Ana!', mine: false } })

    luis.send({ t: 'room', host: null })
    await ana.next('room.leave')
    luis.ws.close()
    await ana.next('presence', (e) => e.online === false)
    expect(ana.events.filter((e) => e.t === 'room.act')).toHaveLength(1)
  })

  it('tells the host when someone arrives while they are elsewhere in the app', async () => {
    const { app, url } = await start()
    const anaToken = await login(app, ANA)
    const luisToken = await login(app, LUIS)
    const ana = client(url)
    await ana.open()
    ana.send({ t: 'auth', token: anaToken })
    const { me } = await ana.next('ready')
    const luis = client(url)
    await luis.open()
    luis.send({ t: 'auth', token: luisToken })
    await luis.next('ready')
    luis.send({ t: 'room', host: me })
    expect(await ana.next('visit.arrived')).toMatchObject({ from: { name: 'Luis Gomez' } })
  })

  it('accepts a pilot-link address only when the hub allows it', async () => {
    const { url } = await start()
    const c = client(url)
    await c.open()
    const closed = new Promise<number>((r) => c.ws.once('close', (code) => r(code)))
    c.send({ t: 'auth', email: ANA })
    expect(await closed).toBe(4001)

    hub!.close()
    const app = createApp({
      config: loadConfig({ NODE_ENV: 'production', ROCKY_PERSISTENCE_DRIVER: 'sqlite', ROCKY_DB_PATH: '/tmp/x.db', ROCKY_AUTH_MODE: 'pilot-header' }),
      persistence: buildMemoryPersistence(),
      backupTarget: { dir: null, key: null, s3: null },
    })
    server!.close()
    server = app.listen(0)
    hub = attachLiveHub(server, app.locals.live as LiveContext, { allowedOrigins: [], acceptPilotEmail: true })
    const pilot = client(`ws://127.0.0.1:${(server.address() as AddressInfo).port}/api/live`)
    await pilot.open()
    pilot.send({ t: 'auth', email: ANA })
    expect(await pilot.next('ready')).toMatchObject({ t: 'ready' })
  })
})
