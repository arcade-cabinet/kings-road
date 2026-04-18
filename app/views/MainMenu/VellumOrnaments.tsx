/** Four corner flourishes drawn over the vellum card. */
export function VellumOrnaments() {
  const corner = (
    <svg
      viewBox="0 0 40 40"
      className="absolute w-5 h-5 text-[#c4a747]/70"
      aria-hidden="true"
    >
      <path
        d="M0 40 L0 10 Q0 0 10 0 L40 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.8"
      />
      <circle cx="6" cy="6" r="1.2" fill="currentColor" />
    </svg>
  );
  return (
    <>
      <div className="absolute top-1.5 left-1.5">{corner}</div>
      <div className="absolute top-1.5 right-1.5 rotate-90">{corner}</div>
      <div className="absolute bottom-1.5 left-1.5 -rotate-90">{corner}</div>
      <div className="absolute bottom-1.5 right-1.5 rotate-180">{corner}</div>
    </>
  );
}
