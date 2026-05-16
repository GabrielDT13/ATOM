import type {
  ProjectAnalysisVariant,
  ProjectLifecycleStatus,
  ProjectStudyType,
} from "@/types/api";

export type StudyOption = {
  id: ProjectStudyType;
  imagePath: string;
  label: { en: string; es: string };
  description: { en: string; es: string };
  available: boolean;
};

export type VariantOption = {
  id: ProjectAnalysisVariant;
  label: { en: string; es: string };
  description: { en: string; es: string };
};

export const STUDY_OPTIONS: StudyOption[] = [
  {
    id: "rna-seq",
    imagePath: "/images/RNA-seq_icon.png",
    label: { en: "RNA-seq", es: "RNA-seq" },
    description: {
      en: "Differential expression workflows with R basic, R extended and Python PoC variants.",
      es: "Flujos de expresión diferencial con variantes R básica, R extendida y Python PoC.",
    },
    available: true,
  },
  {
    id: "atac-seq",
    imagePath: "/images/ATAC-seq_icon.png",
    label: { en: "ATAC-seq", es: "ATAC-seq" },
    description: {
      en: "Reserved for future chromatin accessibility workflows.",
      es: "Reservado para futuros flujos de accesibilidad de cromatina.",
    },
    available: false,
  },
  {
    id: "chip-seq",
    imagePath: "/images/ChIP-seq_icon.png",
    label: { en: "ChIP-seq", es: "ChIP-seq" },
    description: {
      en: "Reserved for future protein-DNA interaction workflows.",
      es: "Reservado para futuros flujos de interacción proteína-ADN.",
    },
    available: false,
  },
  {
    id: "scrna-seq",
    imagePath: "/images/scRNA-seq_icon.png",
    label: { en: "scRNA-seq", es: "scRNA-seq" },
    description: {
      en: "Reserved for future single-cell workflows.",
      es: "Reservado para futuros flujos single-cell.",
    },
    available: false,
  },
];

export const RNA_SEQ_VARIANT_OPTIONS: VariantOption[] = [
  {
    id: "basic",
    label: { en: "Basic R", es: "R básica" },
    description: {
      en: "Balanced RNA-seq report with standard analysis, figures and narrative summary.",
      es: "Informe RNA-seq equilibrado con análisis estándar, figuras y resumen narrativo.",
    },
  },
  {
    id: "enhanced",
    label: { en: "Extended R", es: "R extendida" },
    description: {
      en: "More detailed RNA-seq report with broader interpretation and richer visual context.",
      es: "Informe RNA-seq más detallado con interpretación ampliada y contexto visual más rico.",
    },
  },
  {
    id: "python",
    label: { en: "Python PoC", es: "Python PoC" },
    description: {
      en: "RNA-seq workflow in Python with automated figures, tables and generated report.",
      es: "Flujo RNA-seq en Python con figuras, tablas e informe generado automáticamente.",
    },
  },
];

export const PROJECT_STATE_OPTIONS: Array<{
  id: ProjectLifecycleStatus;
  label: { en: string; es: string };
  description: { en: string; es: string };
}> = [
  {
    id: "draft",
    label: { en: "Draft", es: "Borrador" },
    description: {
      en: "Use while preparing files, variants and comparisons.",
      es: "Úsalo mientras preparas archivos, variantes y comparativas.",
    },
  },
  {
    id: "active",
    label: { en: "Active", es: "Activo" },
    description: {
      en: "Use when project is ready for regular executions and review.",
      es: "Úsalo cuando proyecto ya está listo para ejecuciones y revisión.",
    },
  },
];

export function getDefaultVariantsForStudy(studyType: ProjectStudyType): ProjectAnalysisVariant[] {
  if (studyType === "rna-seq") {
    return ["basic", "enhanced"];
  }
  return ["basic"];
}

export function getAllowedVariantsForStudy(studyType: ProjectStudyType): ProjectAnalysisVariant[] {
  if (studyType === "rna-seq") {
    return ["basic", "enhanced", "python"];
  }
  return ["basic"];
}

export function normalizeVariantSelection(
  studyType: ProjectStudyType,
  enabledVariants: ProjectAnalysisVariant[],
  primaryVariant?: ProjectAnalysisVariant | null,
) {
  const allowedVariants = getAllowedVariantsForStudy(studyType);
  const nextEnabledVariants = enabledVariants.filter((variant, index, items) =>
    allowedVariants.includes(variant) && items.indexOf(variant) === index,
  );
  const ensuredEnabledVariants = nextEnabledVariants.length > 0 ? nextEnabledVariants : getDefaultVariantsForStudy(studyType);
  const nextPrimaryVariant =
    primaryVariant && ensuredEnabledVariants.includes(primaryVariant)
      ? primaryVariant
      : ensuredEnabledVariants[0];

  return {
    enabledVariants: ensuredEnabledVariants,
    primaryVariant: nextPrimaryVariant,
  };
}

export function getStudyLabel(studyType: ProjectStudyType | null | undefined, locale: "en" | "es") {
  return STUDY_OPTIONS.find((option) => option.id === studyType)?.label[locale]
    ?? (studyType || (locale === "es" ? "RNA-seq" : "RNA-seq"));
}

export function getVariantLabel(variant: ProjectAnalysisVariant | null | undefined, locale: "en" | "es") {
  return RNA_SEQ_VARIANT_OPTIONS.find((option) => option.id === variant)?.label[locale]
    ?? (variant || (locale === "es" ? "R básica" : "Basic R"));
}

export function getProjectStateLabel(state: ProjectLifecycleStatus | null | undefined, locale: "en" | "es") {
  return PROJECT_STATE_OPTIONS.find((option) => option.id === state)?.label[locale]
    ?? (state || (locale === "es" ? "Borrador" : "Draft"));
}
