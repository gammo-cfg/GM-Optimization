export default function EnergyField() {
  return (
    <div className="gm-energy-field" aria-hidden="true">
      <div className="gm-energy-orb gm-energy-orb-a" />
      <div className="gm-grid-plane" />
      <div className="gm-circuit-lines gm-circuit-lines-focus">
        <span className="gm-circuit-line gm-circuit-line-a" />
        <span className="gm-circuit-line gm-circuit-line-b" />
      </div>
      <div className="gm-noise" />
    </div>
  );
}
