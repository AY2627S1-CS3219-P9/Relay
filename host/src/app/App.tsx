import { SERVICE_METADATA } from '@relay/contracts'
import { RemotePage } from '../remote/RemotePage'
import './App.css'

const homeRemotes = Object.values(SERVICE_METADATA).map(({ id, label }) => ({
  service: id,
  serviceLabel: label,
}))

function App() {
  return (
    <main className="home">
      <header>
        <p className="eyebrow">Relay host application</p>
        <h1>Campus errands, in one place.</h1>
        <p className="lede">Each section below is loaded from its own independently deployed frontend.</p>
      </header>
      <div className="remote-grid">
        {homeRemotes.map(({ service, serviceLabel }) => (
          <RemotePage key={service} service={service} serviceLabel={serviceLabel} />
        ))}
      </div>
    </main>
  )
}

export default App
