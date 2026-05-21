# Shared helpers for legacy and extended RNA-seq reports.
# Keep behavior stable across both R Markdown variants.

get_variable <- function(df, column) {
  vals <- unique(df[[column]])
  if (length(vals) > 1) {
    vals <- sort(vals)
    return(paste(vals, collapse = " versus "))
  } else {
    return(vals)
  }
}

get_top_go_terms <- function(go_data, direction = c("up", "down")) {
  direction <- match.arg(direction)
  if (direction == "up") {
    go_data %>% filter(NES > 0) %>% arrange(desc(NES)) %>% slice_head(n = 20)
  } else {
    go_data %>% filter(NES < 0) %>% arrange(NES) %>% slice_head(n = 20)
  }
}

format_go_terms <- function(go_df) {
  paste0(
    "- ", go_df$ID, ": ", go_df$Description,
    " (NES = ", round(go_df$NES, 2),
    ", q = ", signif(as.numeric(go_df$qvalue), 3),
    ", genes = ", go_df$setSize, ")"
  ) %>% paste(collapse = "\n")
}

safe_format <- function(obj) {
  if (exists(deparse(substitute(obj))) && nrow(obj) > 0) {
    format_go_terms(obj)
  } else {
    "No enriched terms found"
  }
}

resolve_org_db <- function(organism_key, org_db_dict) {
  pkg_name <- org_db_dict[[organism_key]]
  if (is.null(pkg_name) || !nzchar(pkg_name)) {
    stop(paste("Organismo no soportado para anotación GO:", organism_key))
  }

  if (!requireNamespace(pkg_name, quietly = TRUE)) {
    stop(paste("Paquete de anotación no disponible:", pkg_name))
  }

  get(pkg_name, envir = asNamespace(pkg_name))
}
