type LogoProps = {
  size?: number;
  className?: string;
  title?: string;
};

export function AssistimmoMark({ size = 24, className, title = "Assistimmo" }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth={6.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <path d="M50 14 L18 84 L82 84 Z" />
      <path d="M50 50 L36 80 L36 84 M50 50 L64 80 L64 84" />
    </svg>
  );
}
