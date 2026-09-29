import { useEffect, useState } from 'react'
import { chatApi, extrasApi, isRemoteModeEnabled, type Photo } from '../../services/apiClient'
import { takeRockyPhoto } from './photo'
import styles from './Extras.module.css'

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 2000)
}

const fileName = (ext: string) => `rocky-${new Date().toISOString().slice(0, 10)}.${ext}`

/** 📸 Take a framed photo of Rocky, keep it in the album, share it in chat or download it. */
export function PhotoStudio({ rockyName, onClose }: { rockyName: string; onClose: () => void }) {
  const [caption, setCaption] = useState(`${rockyName} today`)
  const [shot, setShot] = useState<{ blob: Blob; url: string } | null>(null)
  const [tab, setTab] = useState<'new' | 'album'>('new')
  const [album, setAlbum] = useState<(Photo & { url?: string })[] | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const remote = isRemoteModeEnabled()

  async function take(text = caption) {
    try {
      const blob = await takeRockyPhoto(text)
      setShot((old) => {
        if (old) URL.revokeObjectURL(old.url)
        return { blob, url: URL.createObjectURL(blob) }
      })
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'The photo could not be taken.')
    }
  }

  useEffect(() => {
    void take()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (tab !== 'album' || album || !remote) return
    extrasApi
      .photos()
      .then(async (r) => {
        setAlbum(r.photos)
        const withUrls = await Promise.all(
          r.photos.map(async (p) => ({ ...p, url: await extrasApi.photo(p.id).then((b) => URL.createObjectURL(b)).catch(() => undefined) })),
        )
        setAlbum(withUrls)
      })
      .catch(() => setAlbum([]))
  }, [tab, album, remote])

  async function run(label: string, fn: () => Promise<unknown>) {
    setBusy(true)
    setMsg(null)
    try {
      await fn()
      setMsg(label)
    } catch (e) {
      const err = e as Error & { code?: string }
      setMsg(err.code === 'RULES_NOT_ACCEPTED' ? 'Open Chat once and accept the house rules to share photos.' : err.message || 'That did not work — try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.studioBackdrop} role="dialog" aria-label="Rocky’s photo studio" onClick={onClose}>
      <div className={styles.studio} onClick={(e) => e.stopPropagation()}>
        <header>
          <div className={styles.boardTabs} role="tablist">
            <button type="button" role="tab" aria-selected={tab === 'new'} className={tab === 'new' ? styles.boardTabOn : ''} onClick={() => setTab('new')}>
              📸 New photo
            </button>
            {remote && (
              <button type="button" role="tab" aria-selected={tab === 'album'} className={tab === 'album' ? styles.boardTabOn : ''} onClick={() => setTab('album')}>
                🖼️ Album
              </button>
            )}
          </div>
          <button type="button" className={styles.studioClose} onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        {tab === 'new' ? (
          <>
            <div className={styles.studioShot}>{shot ? <img src={shot.url} alt="Your photo of Rocky" /> : <span className={styles.boardEmpty}>Taking the photo…</span>}</div>
            <div className={styles.studioRow}>
              <input value={caption} maxLength={60} onChange={(e) => setCaption(e.target.value)} aria-label="Caption" placeholder="Write a caption" />
              <button type="button" onClick={() => void take()} disabled={busy}>
                🔄 Retake
              </button>
            </div>
            <div className={styles.studioRow}>
              {remote && (
                <button
                  type="button"
                  className={styles.studioPrimary}
                  disabled={!shot || busy}
                  onClick={() =>
                    void run('Saved to your album 🖼️', async () => {
                      await extrasApi.savePhoto(shot!.blob, caption)
                      setAlbum(null)
                    })
                  }
                >
                  🖼️ Save to album
                </button>
              )}
              {remote && (
                <button type="button" disabled={!shot || busy} onClick={() => void run('Shared in General 💬', () => chatApi.sendImage('general', shot!.blob))}>
                  💬 Share in General
                </button>
              )}
              <button type="button" disabled={!shot} onClick={() => shot && download(shot.blob, fileName(shot.blob.type === 'image/webp' ? 'webp' : 'png'))}>
                ⬇ Download
              </button>
            </div>
          </>
        ) : (
          <div className={styles.album}>
            {album === null && <p className={styles.boardEmpty}>Loading your album…</p>}
            {album?.length === 0 && <p className={styles.boardEmpty}>No photos yet — take one and save it here.</p>}
            {album?.map((p) => (
              <figure key={p.id}>
                {p.url ? <img src={p.url} alt={p.caption ?? 'Rocky'} /> : <span className={styles.boardEmpty}>…</span>}
                <figcaption>{p.caption ?? ''}</figcaption>
                <div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void run('Shared in General 💬', async () => chatApi.sendImage('general', await extrasApi.photo(p.id)))}
                    aria-label="Share in General"
                    title="Share in General"
                  >
                    💬
                  </button>
                  <button type="button" onClick={() => void extrasApi.photo(p.id).then((b) => download(b, fileName('webp')))} aria-label="Download" title="Download">
                    ⬇
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      window.confirm('Delete this photo from your album?') &&
                      void run('Photo deleted.', async () => {
                        await extrasApi.deletePhoto(p.id)
                        setAlbum((list) => list?.filter((x) => x.id !== p.id) ?? list)
                      })
                    }
                    aria-label="Delete"
                    title="Delete"
                  >
                    🗑
                  </button>
                </div>
              </figure>
            ))}
          </div>
        )}
        {msg && <p className={styles.studioMsg}>{msg}</p>}
      </div>
    </div>
  )
}
