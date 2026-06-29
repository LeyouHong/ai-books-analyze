// Reusable inline-SVG icon component using Bootstrap Icons paths.
// No external dependency required.

const PATHS = {
  // box-arrow-right (sign out)
  'sign-out': [
    'M10 12.5a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v2a.5.5 0 0 0 1 0v-2A1.5 1.5 0 0 0 9.5 2h-8A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h8a1.5 1.5 0 0 0 1.5-1.5v-2a.5.5 0 0 0-1 0z',
    'M15.854 8.354a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708.708L14.293 7.5H5.5a.5.5 0 0 0 0 1h8.793l-2.147 2.146a.5.5 0 0 0 .708.708z',
  ],
  // person-circle (avatar)
  person: [
    'M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
    'M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8m8-7a7 7 0 0 0-5.468 11.37C3.242 11.226 4.805 10 8 10s4.757 1.225 5.468 2.37A7 7 0 0 0 8 1',
  ],
  // person-gear (profile)
  'person-gear': [
    'M11 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0M8 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4m.256 7a4.5 4.5 0 0 1-.229-1.004H3c.001-.246.154-.986.832-1.664C4.484 10.68 5.711 10 8 10q.39 0 .74.025c.226-.341.496-.65.804-.918Q8.844 9.002 8 9c-5 0-6 3-6 4s1 1 1 1z',
    'M13.378 9.624a.5.5 0 0 0-.756-.546l-.886.516-.21-.469a.5.5 0 0 0-.912 0l-.21.469-.886-.516a.5.5 0 0 0-.756.546l.21.842-.482.27a.5.5 0 0 0 0 .872l.482.27-.21.842a.5.5 0 0 0 .756.546l.886-.516.21.469a.5.5 0 0 0 .912 0l.21-.469.886.516a.5.5 0 0 0 .756-.546l-.21-.842.482-.27a.5.5 0 0 0 0-.872l-.482-.27z',
  ],
};

export default function Icon({ name, size = 16, className = '', style = {}, ...rest }) {
  const paths = PATHS[name];
  if (!paths) return null;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      fill="currentColor"
      viewBox="0 0 16 16"
      className={className}
      style={{ verticalAlign: 'text-bottom', ...style }}
      aria-hidden="true"
      {...rest}
    >
      {paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}
