export type PreviewState =
  | {
      content: string;
      label: string;
      mode: "text";
    }
  | {
      hint: string;
      label: string;
      mode: "embed";
      src: string;
    }
  | {
      content: string;
      label: string;
      mode: "html";
    };
