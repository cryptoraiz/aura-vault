import { Link, useLocation } from 'react-router-dom'
import { ConnectKitButton } from 'connectkit'
import { useAccount, useSwitchChain } from 'wagmi'
import { Vault, Plus, Activity, Wallet, LayoutGrid, AlertTriangle } from 'lucide-react'
import { ARC_TESTNET_ID, ARC_MAINNET_ID } from '../config'
import { shortAddr, addrGradient } from '../utils/format'

// ─── Network pill ────────────────────────────────────────────────────────────
interface NetworkPillProps {
  chainId: number | undefined
  onSwitch: (id: number) => void
  size?: 'sm' | 'md'
}

function NetworkPill({ chainId, onSwitch, size = 'md' }: NetworkPillProps) {
  const isTestnet = chainId === ARC_TESTNET_ID
  const isMainnet = chainId === ARC_MAINNET_ID
  const label = isMainnet ? 'Arc Mainnet' : 'Arc Testnet'
  // Amber glow for testnet, cyan-green for mainnet
  const dotColor = isMainnet ? '#2DD4A0' : '#F5B544'
  const dotGlow = isMainnet
    ? '0 0 6px 2px rgba(45,212,160,0.6)'
    : '0 0 6px 2px rgba(245,181,68,0.6)'
  const target = isTestnet ? ARC_MAINNET_ID : ARC_TESTNET_ID

  const px = size === 'sm' ? 'px-2.5 py-1' : 'px-3 py-1.5'
  const textSize = size === 'sm' ? 'text-xs' : 'text-xs'

  return (
    <button
      onClick={() => onSwitch(target)}
      title={`Switch to ${isTestnet ? 'Arc Mainnet' : 'Arc Testnet'}`}
      className={`flex items-center gap-2 ${px} rounded-xl ${textSize} font-medium transition-all hover:brightness-110 active:scale-95`}
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.09)',
        color: '#F5F7FA',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Status dot */}
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ background: dotColor, boxShadow: dotGlow }}
      />
      <span style={{ color: isMainnet ? '#2DD4A0' : '#F5B544' }}>{label}</span>
    </button>
  )
}

interface LayoutProps {
  children: React.ReactNode
  hideNav?: boolean
}

export default function Layout({ children, hideNav }: LayoutProps) {
  const { address, chainId } = useAccount()
  const { switchChain } = useSwitchChain()
  const location = useLocation()

  const isArc = chainId === ARC_TESTNET_ID || chainId === ARC_MAINNET_ID
  const isWrongNetwork = address && !isArc

  const navLinks = [
    { to: '/', label: 'My Vaults', icon: LayoutGrid },
    { to: '/create', label: 'Create', icon: Plus },
    { to: '/activity', label: 'Activity', icon: Activity },
  ]

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <div className="min-h-dvh" style={{ background: '#05070D' }}>
      {/* Background radial glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 40% at 50% -10%, rgba(0,82,255,0.18) 0%, transparent 70%)',
        }}
      />

      {/* Wrong network banner */}
      {isWrongNetwork && (
        <div
          className="sticky top-0 z-50 flex items-center justify-center gap-3 px-4 py-3 text-sm font-medium"
          style={{ background: 'rgba(245, 181, 68, 0.15)', borderBottom: '1px solid rgba(245,181,68,0.25)', color: '#F5B544' }}
        >
          <AlertTriangle size={16} />
          <span>You are on the wrong network.</span>
          <button
            onClick={() => switchChain({ chainId: ARC_TESTNET_ID })}
            className="underline hover:no-underline"
          >
            Switch to Arc Testnet
          </button>
        </div>
      )}

      {/* Top navigation — hidden on /pay/:id */}
      {!hideNav && (
        <header
          className="sticky top-0 z-40 flex items-center justify-between px-6 h-16 hidden sm:flex"
          style={{
            background: 'rgba(5,7,13,0.85)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-bold text-lg" style={{ color: '#F5F7FA' }}>
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#0052FF,#00D2FF)' }}
            >
              <Vault size={16} color="white" />
            </div>
            Aura Vault
          </Link>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  color: isActive(to) ? '#F5F7FA' : '#8A94A8',
                  background: isActive(to) ? 'rgba(255,255,255,0.07)' : 'transparent',
                }}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Network pill */}
            <NetworkPill
              chainId={chainId}
              onSwitch={(id) => switchChain({ chainId: id })}
            />

            {/* Wallet */}
            <ConnectKitButton.Custom>
              {({ isConnected, show, address: addr }) => (
                <button
                  onClick={show}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: '#F5F7FA',
                  }}
                >
                  {isConnected && addr ? (
                    <>
                      <div
                        className="w-5 h-5 rounded-full flex-shrink-0"
                        style={{ background: addrGradient(addr) }}
                      />
                      <span className="mono text-xs">{shortAddr(addr)}</span>
                    </>
                  ) : (
                    <>
                      <Wallet size={14} />
                      <span>Connect</span>
                    </>
                  )}
                </button>
              )}
            </ConnectKitButton.Custom>
          </div>
        </header>
      )}

      {/* Mobile top bar (no nav links — bottom tab handles it) */}
      {!hideNav && (
        <header
          className="sm:hidden sticky top-0 z-40 flex items-center justify-between px-4 h-14"
          style={{
            background: 'rgba(5,7,13,0.9)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <Link to="/" className="flex items-center gap-2 font-bold" style={{ color: '#F5F7FA' }}>
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#0052FF,#00D2FF)' }}
            >
              <Vault size={13} color="white" />
            </div>
            Aura Vault
          </Link>
          <div className="flex items-center gap-2">
            <NetworkPill
              chainId={chainId}
              onSwitch={(id) => switchChain({ chainId: id })}
              size="sm"
            />
            <ConnectKitButton.Custom>
              {({ isConnected, show, address: addr }) => (
                <button
                  onClick={show}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: '#F5F7FA',
                  }}
                >
                  {isConnected && addr ? (
                    <>
                      <div className="w-4 h-4 rounded-full" style={{ background: addrGradient(addr) }} />
                      <span className="mono">{shortAddr(addr)}</span>
                    </>
                  ) : (
                    <span>Connect</span>
                  )}
                </button>
              )}
            </ConnectKitButton.Custom>
          </div>
        </header>
      )}

      {/* Page content */}
      <main
        className={`relative z-10 ${!hideNav ? 'pb-20 sm:pb-8' : ''}`}
      >
        {children}
      </main>

      {/* Mobile bottom tab bar */}
      {!hideNav && (
        <nav
          className="sm:hidden fixed bottom-0 inset-x-0 z-40 flex items-center justify-around h-16 pb-safe"
          style={{
            background: 'rgba(5,7,13,0.95)',
            backdropFilter: 'blur(20px)',
            borderTop: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {navLinks.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex flex-col items-center gap-1 px-4 py-2 transition-colors"
              style={{ color: isActive(to) ? '#0052FF' : '#8A94A8' }}
            >
              <Icon size={20} />
              <span className="text-xs font-medium">{label}</span>
            </Link>
          ))}
          <button
            className="flex flex-col items-center gap-1 px-4 py-2 transition-colors"
            style={{ color: '#8A94A8' }}
            onClick={() => document.querySelector<HTMLButtonElement>('[data-ck-connect-button]')?.click()}
          >
            <Wallet size={20} />
            <span className="text-xs font-medium">Wallet</span>
          </button>
        </nav>
      )}
    </div>
  )
}
