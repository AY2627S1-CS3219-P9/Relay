import { SERVICE_METADATA } from '@relay/contracts'
import { RemotePage } from '../remote/RemotePage'
import './App.css'

function App() {
  return (
    <main>
      <div className="remote-grid">
        {Object.values(SERVICE_METADATA).map(({ id, label }) => (
          <RemotePage key={id} service={id} serviceLabel={label} />
        ))}
      </div>
    </main>
  )
}

export default App
