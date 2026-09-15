'use client'

import { useEffect, useState } from 'react'

const CONSENT_COOKIE = 'efoka_analytics_consent'

function readConsent() {
  return document.cookie.split('; ').find((value) => value.startsWith(`${CONSENT_COOKIE}=`))?.split('=')[1] ?? null
}

function loadHotjar() {
  const hotjarId = process.env.NEXT_PUBLIC_HOTJAR_ID
  if (!hotjarId || document.querySelector('script[data-efoka-hotjar]')) return

  const script = document.createElement('script')
  script.async = true
  script.dataset.efokaHotjar = 'true'
  script.innerHTML = `
    (function(h,o,t,j,a,r){
      h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
      h._hjSettings={hjid:${Number(hotjarId)},hjsv:6};
      a=o.getElementsByTagName('head')[0];r=o.createElement('script');
      r.async=1;r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
      a.appendChild(r);
    })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
  `
  document.head.appendChild(script)
}

export function ConsentAnalytics() {
  const [consent, setConsent] = useState<string | null>(null)

  useEffect(() => {
    const current = readConsent()
    setConsent(current)
    if (current === 'granted' && navigator.doNotTrack !== '1') loadHotjar()
  }, [])

  if (consent) return null

  const choose = (value: 'granted' | 'denied') => {
    document.cookie = `${CONSENT_COOKIE}=${value}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`
    setConsent(value)
    if (value === 'granted' && navigator.doNotTrack !== '1') loadHotjar()
  }

  return (
    <aside className="fixed inset-x-3 bottom-3 z-[60] mx-auto flex max-w-3xl flex-col gap-4 rounded-2xl border border-[#dfe8df] bg-white p-4 shadow-2xl sm:flex-row sm:items-center sm:justify-between sm:px-5" aria-label="Analytics preferences">
      <div>
        <p className="text-sm font-semibold text-[#17211b]">Help us improve Efoka</p>
        <p className="mt-1 max-w-xl text-xs leading-5 text-[#718078]">We use privacy-conscious analytics to understand performance and improve the workspace. Session replay stays disabled until you opt in.</p>
      </div>
      <div className="flex shrink-0 gap-2">
        <button onClick={() => choose('denied')} className="rounded-xl px-3 py-2 text-xs font-semibold text-[#718078] hover:bg-[#f4f7f3]">Decline</button>
        <button onClick={() => choose('granted')} className="rounded-xl bg-[#235337] px-3 py-2 text-xs font-semibold text-white hover:bg-[#173b2b]">Allow analytics</button>
      </div>
    </aside>
  )
}
