import { useState } from 'react'

// Single-series weekly column chart: thin columns from one baseline, hover tooltip,
// only the latest value labelled, and a table view for screen readers.
const BAR = '#00897b' // brand teal, validated for chroma and contrast on white

export function WeekBars({ title, data, format = (n) => n.toLocaleString('en-ZA'), unit = '' }) {
  const [hover, setHover] = useState(null)
  const [table, setTable] = useState(false)
  const max = Math.max(1, ...data.map((d) => d.value))
  const total = data.reduce((s, d) => s + d.value, 0)
  const label = (iso) => new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
  const last = data.length - 1
  return (
    <figure className="weekbars">
      <figcaption>
        <span>{title}</span>
        <b>{format(total)}</b>
        <small>last 8 weeks{unit ? ` · ${unit}` : ''}</small>
        <button type="button" onClick={() => setTable(!table)} aria-pressed={table}>
          {table ? 'Chart' : 'Table'}
        </button>
      </figcaption>
      {table ? (
        <table className="weekbars-table">
          <thead>
            <tr>
              <th scope="col">Week of</th>
              <th scope="col">{title}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.week}>
                <td>{label(d.week)}</td>
                <td>{format(d.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="weekbars-plot" role="img" aria-label={`${title} per week: ${data.map((d) => `${label(d.week)} ${format(d.value)}`).join(', ')}`}>
          {data.map((d, i) => (
            <div
              key={d.week}
              className="weekbars-slot"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              tabIndex={0}
            >
              {(i === last || hover === i) && <em className={hover === i ? 'is-tip' : ''}>{format(d.value)}</em>}
              <i style={{ height: `${Math.max(d.value ? 3 : 0, (d.value / max) * 100)}%`, background: BAR, opacity: hover === null || hover === i ? 1 : 0.45 }} />
              <small>{i === 0 || i === last || i === Math.floor(last / 2) ? label(d.week) : ''}</small>
            </div>
          ))}
        </div>
      )}
    </figure>
  )
}
