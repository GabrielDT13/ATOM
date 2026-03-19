export type PreviewState =
  | {
      content: string;
      label: string;
      mode: "text";
    }
  | {
      actionHref: string;
      actionLabel: string;
      description: string;
      label: string;
      mode: "notice";
    }
  | {
      content: string;
      label: string;
      mode: "html";
    };
