import nusMapImage from '../assets/nus-map.png'

export function NusMapPanel() {
  return (
    <aside className="user-map-panel" aria-label="Map of the National University of Singapore">
      <img
        className="user-map-frame"
        src={nusMapImage}
        alt="Map of the National University of Singapore and its surrounding campus"
      />
    </aside>
  )
}
