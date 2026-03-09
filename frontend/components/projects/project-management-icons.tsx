type IconProps = {
  className?: string;
};

export function SearchIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="11" cy="11" r="6.75" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M16 16L20 20"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function FilterIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M4 7H20" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      <path d="M7 12H17" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      <path d="M10 17H14" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

export function PlusIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 5V19M5 12H19"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function ProjectStackIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 8L12 4L20 8L12 12L4 8Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path
        d="M4 12L12 16L20 12"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path
        d="M4 16L12 20L20 16"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

export function ReportSparkIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6 18.5H18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
      <path
        d="M7 15L10 11L12.5 13.5L17 8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path
        d="M15.5 8H17V9.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

export function UploadStackIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 14.5V5.5M12 5.5L8.5 9M12 5.5L15.5 9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path
        d="M5.5 15.5V17C5.5 18.38 6.62 19.5 8 19.5H16C17.38 19.5 18.5 18.38 18.5 17V15.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

export function EyeIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M2.75 12C4.6 8.7 7.86 6.75 12 6.75C16.14 6.75 19.4 8.7 21.25 12C19.4 15.3 16.14 17.25 12 17.25C7.86 17.25 4.6 15.3 2.75 12Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <circle cx="12" cy="12" r="2.75" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

export function PencilIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4.5 19.5L8.75 18.75L18 9.5L14.5 6L5.25 15.25L4.5 19.5Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path
        d="M13.5 7L17 10.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

export function TrashIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5.5 7.5H18.5M9 7.5V5.5C9 4.95 9.45 4.5 10 4.5H14C14.55 4.5 15 4.95 15 5.5V7.5M7.5 7.5L8.1 18.1C8.14 18.89 8.79 19.5 9.58 19.5H14.42C15.21 19.5 15.86 18.89 15.9 18.1L16.5 7.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path
        d="M10 11V16M14 11V16"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

export function TransferIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M8 7H19M19 7L15.5 3.5M19 7L15.5 10.5M16 17H5M5 17L8.5 13.5M5 17L8.5 20.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

export function TemplateIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        height="15"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.7"
        width="13"
        x="5.5"
        y="4.5"
      />
      <path
        d="M9 9H15M9 12.5H15M9 16H13"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

export function DataFilesIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M7 5.5H14L18 9.5V18C18 18.83 17.33 19.5 16.5 19.5H7.5C6.67 19.5 6 18.83 6 18V7C6 6.17 6.67 5.5 7.5 5.5H7Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path
        d="M14 5.5V9.5H18"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path
        d="M9 13H15M9 16H13"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}
