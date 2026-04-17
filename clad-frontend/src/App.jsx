import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from './store/useStore'
import { Splash }        from './screens/Splash'
import { OB1, OB2, OB3, OB4 } from './screens/Onboarding'
import { Building }      from './screens/Building'
import { Home }          from './screens/Home'
import { ManualClaim, Claiming, Payout, ClaimRejected } from './screens/Claim'
import { Policy, Profile } from './screens/PolicyProfile'
import { AdminLogin, AdminDash } from './screens/Admin'

const SCREENS = {
  splash:        Splash,
  ob1:OB1, ob2:OB2, ob3:OB3, ob4:OB4,
  building:      Building,
  home:          Home,
  manualclaim:   ManualClaim,
  claiming:      Claiming,
  payout:        Payout,
  claimrejected: ClaimRejected,
  policy:        Policy,
  profile:       Profile,
  adminlogin:    AdminLogin,
  admindash:     AdminDash,
}

const ORDER = ['splash','ob1','ob2','ob3','ob4','building','home','policy','profile','manualclaim','claiming','payout','claimrejected','adminlogin','admindash']
let prev = 'splash'

export default function App() {
  const screen = useStore(s => s.screen)
  const Screen = SCREENS[screen] || Home
  const fwd = ORDER.indexOf(screen) >= ORDER.indexOf(prev)
  prev = screen

  return (
    <div className="shell">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={screen}
          initial={{ opacity:0, x: fwd?20:-20, scale:0.987 }}
          animate={{ opacity:1, x:0, scale:1 }}
          exit={{    opacity:0, x: fwd?-20:20, scale:0.987 }}
          transition={{ duration:0.19, ease:[0.16,1,0.3,1] }}
          style={{ position:'absolute', inset:0, width:'100%', height:'100%' }}>
          <Screen />
        </motion.div>
      </AnimatePresence>
    </div>
  )
}