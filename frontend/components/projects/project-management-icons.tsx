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

export function GridViewIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        height="5.5"
        rx="1.2"
        stroke="currentColor"
        strokeWidth="1.7"
        width="5.5"
        x="4.25"
        y="4.25"
      />
      <rect
        height="5.5"
        rx="1.2"
        stroke="currentColor"
        strokeWidth="1.7"
        width="5.5"
        x="14.25"
        y="4.25"
      />
      <rect
        height="5.5"
        rx="1.2"
        stroke="currentColor"
        strokeWidth="1.7"
        width="5.5"
        x="4.25"
        y="14.25"
      />
      <rect
        height="5.5"
        rx="1.2"
        stroke="currentColor"
        strokeWidth="1.7"
        width="5.5"
        x="14.25"
        y="14.25"
      />
    </svg>
  );
}

export function ListViewIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M8.5 7H19.25M8.5 12H19.25M8.5 17H19.25"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
      <circle cx="5.25" cy="7" fill="currentColor" r="1.25" />
      <circle cx="5.25" cy="12" fill="currentColor" r="1.25" />
      <circle cx="5.25" cy="17" fill="currentColor" r="1.25" />
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

export function ArrowUpIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 19V5M12 5L6.75 10.25M12 5L17.25 10.25"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
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

export function ShareIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="17.5" cy="6.5" r="2.75" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="6.5" cy="12" r="2.75" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="17.5" cy="17.5" r="2.75" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M8.95 10.95L15.1 7.55M8.95 13.05L15.1 16.45"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

export function LinkIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10.35 13.65L13.65 10.35M9 15C7.34 16.66 4.66 16.66 3 15C1.34 13.34 1.34 10.66 3 9L6 6C7.66 4.34 10.34 4.34 12 6C13.66 7.66 13.66 10.34 12 12"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path
        d="M15 9C16.66 7.34 19.34 7.34 21 9C22.66 10.66 22.66 13.34 21 15L18 18C16.34 19.66 13.66 19.66 12 18C10.34 16.34 10.34 13.66 12 12"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

export function WhatsAppIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 20C16.418 20 20 16.642 20 12.5C20 8.358 16.418 5 12 5C7.582 5 4 8.358 4 12.5C4 14.083 4.523 15.55 5.413 16.756L4.5 20L7.92 19.093C9.095 19.675 10.501 20 12 20Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path
        d="M9.2 9.55C9.2 9.15 9.52 8.82 9.93 8.82H10.45C10.7 8.82 10.93 8.95 11.06 9.17L11.72 10.3C11.84 10.52 11.84 10.79 11.71 11L11.27 11.74C11.64 12.44 12.22 13.02 12.93 13.39L13.66 12.95C13.88 12.82 14.15 12.82 14.37 12.94L15.5 13.6C15.72 13.73 15.85 13.96 15.85 14.21V14.73C15.85 15.14 15.53 15.46 15.12 15.46H14.75C11.71 15.46 9.2 12.99 9.2 9.95V9.55Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
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

export function DownloadIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 4.75V14.25M12 14.25L8.5 10.75M12 14.25L15.5 10.75"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path
        d="M5.5 16.75V18C5.5 18.83 6.17 19.5 7 19.5H17C17.83 19.5 18.5 18.83 18.5 18V16.75"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

export function ExpandIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M14.5 4.75H19.25V9.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path
        d="M19 5L13.75 10.25"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
      <path
        d="M9.5 19.25H4.75V14.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path
        d="M5 19L10.25 13.75"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

export function RefreshIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M19 6.5V11H14.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path
        d="M5 17.5V13H9.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path
        d="M18.2 11C17.69 8.58 15.55 6.75 13 6.75C11.15 6.75 9.5 7.73 8.58 9.2L5 13M19 11L15.42 14.8C14.5 16.27 12.85 17.25 11 17.25C8.45 17.25 6.31 15.42 5.8 13"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

export function GalleryIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        height="12"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.7"
        width="15"
        x="4.5"
        y="6.5"
      />
      <path
        d="M8 14L10.5 11.5L13 14L15.5 11L18 14"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <circle cx="9" cy="10" r="1" fill="currentColor" />
    </svg>
  );
}

export function BrainSparkIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M9.5 6.25C9.5 4.73 10.73 3.5 12.25 3.5C13.77 3.5 15 4.73 15 6.25C16.52 6.25 17.75 7.48 17.75 9C19.13 9.3 20.17 10.53 20.17 12C20.17 13.47 19.13 14.7 17.75 15C17.75 16.52 16.52 17.75 15 17.75C15 19.13 13.88 20.25 12.5 20.25C11.12 20.25 10 19.13 10 17.75C8.48 17.75 7.25 16.52 7.25 15C5.87 14.7 4.83 13.47 4.83 12C4.83 10.53 5.87 9.3 7.25 9C7.25 7.48 8.48 6.25 10 6.25"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
      <path
        d="M12.5 9V15M10 11.25H15"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}

export function FileCodeIcon({ className = "h-4 w-4" }: IconProps) {
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
        d="M10 13L8.5 14.5L10 16M14 13L15.5 14.5L14 16"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}
