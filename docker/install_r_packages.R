options(Ncpus = max(1, parallel::detectCores() - 1))

install_missing_cran <- function(pkgs) {
  missing <- pkgs[!vapply(pkgs, requireNamespace, logical(1), quietly = TRUE)]
  if (length(missing) > 0) {
    install.packages(missing, repos = "https://cloud.r-project.org")
  }
}

ensure_gseavis <- function() {
  if (requireNamespace("GseaVis", quietly = TRUE)) return(invisible(TRUE))

  gseavis_bioc_deps <- c("AnnotationDbi", "clusterProfiler", "DOSE", "GO.db")
  missing_bioc <- gseavis_bioc_deps[!vapply(gseavis_bioc_deps, requireNamespace, logical(1), quietly = TRUE)]
  if (length(missing_bioc) > 0) {
    BiocManager::install(missing_bioc, ask = FALSE, update = FALSE)
  }

  try(suppressWarnings(install.packages("GseaVis", repos = "https://cloud.r-project.org")), silent = TRUE)
  if (requireNamespace("GseaVis", quietly = TRUE)) return(invisible(TRUE))

  if (!requireNamespace("remotes", quietly = TRUE)) {
    install.packages("remotes", repos = "https://cloud.r-project.org")
  }
  remotes::install_github("junjunlab/GseaVis", upgrade = "never")

  if (!requireNamespace("GseaVis", quietly = TRUE)) {
    stop("No se pudo instalar GseaVis ni desde CRAN ni desde GitHub")
  }
}

cran_pkgs <- c(
  "BiocManager",
  "remotes",
  "rmarkdown",
  "readxl",
  "DT",
  "dplyr",
  "ggplot2",
  "gridExtra",
  "PoiClaClu",
  "RColorBrewer",
  "pheatmap",
  "factoextra",
  "ggvenn",
  "msigdbr",
  "ggforce",
  "forcats",
  "openxlsx",
  "zip",
  "glue",
  "httr",
  "jsonlite",
  "base64enc",
  "readr",
  "officer",
  "FactoMineR",
  "stringr",
  "knitr",
  "htmltools"
)

bioc_pkgs <- c(
  "AnnotationDbi",
  "GO.db",
  "org.Mm.eg.db",
  "org.Hs.eg.db",
  "DESeq2",
  "EnhancedVolcano",
  "ComplexHeatmap",
  "clusterProfiler",
  "enrichplot",
  "fgsea",
  "pathview",
  "Rsubread",
  "biomaRt",
  "Rsamtools",
  "edgeR",
  "DOSE"
)

install_missing_cran(cran_pkgs)
BiocManager::install(bioc_pkgs, ask = FALSE, update = FALSE)

ensure_gseavis()
